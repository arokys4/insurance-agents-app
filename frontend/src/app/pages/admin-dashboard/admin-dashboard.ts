import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  constructor(private router: Router) {}

  goToAgents(): void {
    this.router.navigate(['/admin/agents']);
  }

  goToMeetings(): void {
    this.router.navigate(['/admin/meetings']);
  }

  goToCalendar(): void {
    this.router.navigate(['/admin/calendar']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}