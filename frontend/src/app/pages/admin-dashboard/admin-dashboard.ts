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
  private agentsApiUrl = 'http://localhost:4000/api/agents';
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';
  private workTimeApiUrl = 'http://localhost:4000/api/work-time';

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
    this.loadAgentsStats();
    this.loadMeetingsStats();
    this.loadWorkTimeStats();
  }

  loadAgentsStats(): void {
    this.http.get<Agent[]>(this.agentsApiUrl).subscribe({
      next: (agents) => {
        this.activeAgentsCount = agents.filter(agent =>
          agent.status === 'Aktywny' &&
          agent.role !== 'ADMIN'
        ).length;
      },
      error: (error) => {
        console.error('Błąd pobierania statystyk agentów:', error);
        this.activeAgentsCount = 0;
      }
    });
  }

  loadMeetingsStats(): void {
    this.http.get<Meeting[]>(this.meetingsApiUrl).subscribe({
      next: (meetings) => {
        this.meetingsCount = meetings.length;
        this.plannedMeetingsCount = meetings.filter(meeting =>
          meeting.status === 'Zaplanowane'
        ).length;
      },
      error: (error) => {
        console.error('Błąd pobierania statystyk spotkań:', error);
        this.meetingsCount = 0;
        this.plannedMeetingsCount = 0;
      }
    });
  }

  loadWorkTimeStats(): void {
    this.http.get<WorkTimeEntry[]>(this.workTimeApiUrl).subscribe({
      next: (entries) => {
        this.workTimeEntriesCount = entries.length;
      },
      error: (error) => {
        console.error('Błąd pobierania statystyk czasu pracy:', error);
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