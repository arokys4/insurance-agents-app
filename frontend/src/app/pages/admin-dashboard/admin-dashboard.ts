import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { API_BASE_URL } from '../../config/api.config';

interface LoggedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

interface Agent {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  role?: string;
}

interface Meeting {
  id?: number;
  title: string;
  description: string;
  meetingType: string;
  startDate: string;
  endDate: string;
  status: string;
  agentId: number | null;
  agentName?: string;
}

interface AdminOverviewReport {
  summary: {
    agentsCount: number;
    activeAgentsCount: number;
    meetingsCount: number;
    plannedMeetingsCount: number;
    inProgressMeetingsCount: number;
    completedMeetingsCount: number;
    postponedMeetingsCount: number;
    cancelledMeetingsCount: number;
    workTimeEntriesCount: number;
  };
  workTimeByAgent: WorkTimeReportItem[];
  meetingsByAgent: MeetingsReportItem[];
}

interface WorkTimeReportItem {
  agentId: number;
  agentName: string;
  entriesCount: number;
  totalHours: number;
}

interface MeetingsReportItem {
  agentId: number;
  agentName: string;
  meetingsCount: number;
  plannedMeetingsCount: number;
  inProgressMeetingsCount: number;
  completedMeetingsCount: number;
  postponedMeetingsCount: number;
  cancelledMeetingsCount: number;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [NgFor, NgIf],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private reportsApiUrl = `${API_BASE_URL}/reports/overview`;

  user: LoggedUser | null = null;

  activeAgentsCount = 0;
  meetingsCount = 0;
  plannedMeetingsCount = 0;
  inProgressMeetingsCount = 0;
  completedMeetingsCount = 0;
  postponedMeetingsCount = 0;
  cancelledMeetingsCount = 0;
  workTimeEntriesCount = 0;
  workTimeByAgent: WorkTimeReportItem[] = [];
  meetingsByAgent: MeetingsReportItem[] = [];
  reportInsights: string[] = [];
  reportErrorMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadLoggedUser();
    this.loadDashboardStats();
  }

  loadLoggedUser(): void {
    const userJson = localStorage.getItem('user');

    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = JSON.parse(userJson);
  }

  loadDashboardStats(): void {
    this.reportErrorMessage = '';

    this.http.get<AdminOverviewReport>(this.reportsApiUrl).subscribe({
      next: (report) => {
        this.activeAgentsCount = report.summary.activeAgentsCount;
        this.meetingsCount = report.summary.meetingsCount;
        this.plannedMeetingsCount = report.summary.plannedMeetingsCount;
        this.inProgressMeetingsCount = report.summary.inProgressMeetingsCount;
        this.completedMeetingsCount = report.summary.completedMeetingsCount;
        this.postponedMeetingsCount = report.summary.postponedMeetingsCount;
        this.cancelledMeetingsCount = report.summary.cancelledMeetingsCount;
        this.workTimeEntriesCount = report.summary.workTimeEntriesCount;
        this.workTimeByAgent = report.workTimeByAgent;
        this.meetingsByAgent = report.meetingsByAgent;
        this.reportInsights = this.buildReportInsights(report);
      },
      error: (error) => {
        console.error('Błąd pobierania raportu administratora:', error);
        this.activeAgentsCount = 0;
        this.meetingsCount = 0;
        this.plannedMeetingsCount = 0;
        this.inProgressMeetingsCount = 0;
        this.completedMeetingsCount = 0;
        this.postponedMeetingsCount = 0;
        this.cancelledMeetingsCount = 0;
        this.workTimeEntriesCount = 0;
        this.workTimeByAgent = [];
        this.meetingsByAgent = [];
        this.reportInsights = [];
        this.reportErrorMessage = 'Nie udało się pobrać raportu nadzoru.';
      }
    });
  }

  buildReportInsights(report: AdminOverviewReport): string[] {
    const insights: string[] = [];
    const summary = report.summary;
    const completionPercent = this.getSystemMeetingCompletionPercent();
    const agentsWithoutMeetings = report.meetingsByAgent.filter(agent => agent.meetingsCount === 0).length;
    const agentsWithoutWorkTime = report.workTimeByAgent.filter(agent => agent.entriesCount === 0).length;
    const mostLoadedAgent = report.workTimeByAgent.find(agent => agent.totalHours > 0);
    const mostScheduledAgent = report.meetingsByAgent.find(agent => agent.meetingsCount > 0);

    if (summary.meetingsCount > 0) {
      insights.push(
        `Realizacja spotkań wynosi ${completionPercent}%, czyli zakończono ${summary.completedMeetingsCount} z ${summary.meetingsCount} spotkań.`
      );
    } else {
      insights.push('W systemie nie ma jeszcze spotkań do oceny realizacji.');
    }

    if (agentsWithoutMeetings > 0) {
      insights.push(`${agentsWithoutMeetings} agentów nie ma jeszcze przypisanych spotkań.`);
    }

    if (agentsWithoutWorkTime > 0) {
      insights.push(`${agentsWithoutWorkTime} agentów nie ma wpisów w ewidencji czasu pracy.`);
    }

    if (mostLoadedAgent) {
      insights.push(
        `Największe obciążenie czasem pracy ma ${mostLoadedAgent.agentName}: ${this.formatHours(mostLoadedAgent.totalHours)}.`
      );
    }

    if (mostScheduledAgent) {
      insights.push(
        `Najwięcej spotkań przypisano do agenta ${mostScheduledAgent.agentName}: ${mostScheduledAgent.meetingsCount}.`
      );
    }

    if (summary.meetingsCount > 0 && summary.completedMeetingsCount === 0) {
      insights.push('Żadne spotkanie nie zostało jeszcze oznaczone jako zakończone.');
    }

    return insights;
  }

  getSystemMeetingCompletionPercent(): number {
    if (!this.meetingsCount) {
      return 0;
    }

    return Math.round((this.completedMeetingsCount / this.meetingsCount) * 100);
  }

  getMeetingCompletionPercent(item: MeetingsReportItem): number {
    if (!item.meetingsCount) {
      return 0;
    }

    return Math.round((item.completedMeetingsCount / item.meetingsCount) * 100);
  }

  getWorkTimePercent(item: WorkTimeReportItem): number {
    const maxHours = Math.max(...this.workTimeByAgent.map(agent => agent.totalHours), 0);

    if (!maxHours) {
      return 0;
    }

    return Math.round((item.totalHours / maxHours) * 100);
  }

  formatHours(value: number): string {
    const totalMinutes = Math.round((value || 0) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours} godz. ${String(minutes).padStart(2, '0')} min`;
  }

  getLoggedUserName(): string {
    if (!this.user) {
      return 'Administrator';
    }

    return `${this.user.firstName} ${this.user.lastName}`;
  }

  goToAgents(): void {
    this.router.navigate(['/admin/agents']);
  }

  goToMeetings(): void {
    this.router.navigate(['/admin/meetings']);
  }

  goToCalendar(): void {
    this.router.navigate(['/admin/calendar']);
  }

  goToWorkTime(): void {
    this.router.navigate(['/admin/work-time']);
  }

  goToAuditLogs(): void {
    this.router.navigate(['/admin/audit-logs']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
