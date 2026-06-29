import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
    completedMeetingsCount: number;
    workTimeEntriesCount: number;
  };
}

interface WorkTimeEntry {
  id?: number;
  agentId: number | null;
  agentName?: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  description: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private reportsApiUrl = 'http://localhost:4000/api/reports/overview';

  user: LoggedUser | null = null;

  activeAgentsCount = 0;
  meetingsCount = 0;
  plannedMeetingsCount = 0;
  workTimeEntriesCount = 0;

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
    this.http.get<AdminOverviewReport>(this.reportsApiUrl).subscribe({
      next: (report) => {
        this.activeAgentsCount = report.summary.activeAgentsCount;
        this.meetingsCount = report.summary.meetingsCount;
        this.plannedMeetingsCount = report.summary.plannedMeetingsCount;
        this.workTimeEntriesCount = report.summary.workTimeEntriesCount;
      },
      error: (error) => {
        console.error('Błąd pobierania raportu administratora:', error);
        this.activeAgentsCount = 0;
        this.meetingsCount = 0;
        this.plannedMeetingsCount = 0;
        this.workTimeEntriesCount = 0;
      }
    });
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