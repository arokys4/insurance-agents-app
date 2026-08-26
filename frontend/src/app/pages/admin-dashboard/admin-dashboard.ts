import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../../config/api.config';

interface LoggedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

interface DashboardOverview {
  summary: {
    agentsCount: number;
    activeAgentsCount: number;
    meetingsCount: number;
    workTimeEntriesCount: number;
  };
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [NgIf],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private reportsApiUrl = `${API_BASE_URL}/reports/overview`;

  user: LoggedUser | null = null;
  agentsCount = 0;
  activeAgentsCount = 0;
  meetingsCount = 0;
  workTimeEntriesCount = 0;
  summaryErrorMessage = '';

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
    this.summaryErrorMessage = '';

    this.http.get<DashboardOverview>(this.reportsApiUrl).subscribe({
      next: (report) => {
        this.agentsCount = report.summary.agentsCount;
        this.activeAgentsCount = report.summary.activeAgentsCount;
        this.meetingsCount = report.summary.meetingsCount;
        this.workTimeEntriesCount = report.summary.workTimeEntriesCount;
      },
      error: (error) => {
        console.error('Błąd pobierania podsumowania administratora:', error);
        this.agentsCount = 0;
        this.activeAgentsCount = 0;
        this.meetingsCount = 0;
        this.workTimeEntriesCount = 0;
        this.summaryErrorMessage = 'Nie udało się pobrać podsumowania systemu.';
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

  goToReport(): void {
    this.router.navigate(['/admin/report']);
  }

  goToAuditLogs(): void {
    this.router.navigate(['/admin/audit-logs']);
  }

  goToMyAccount(): void {
    this.router.navigate(['/my-account']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
