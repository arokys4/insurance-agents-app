import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';

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

interface CalendarDay {
  dateKey: string;
  dateLabel: string;
  meetings: Meeting[];
}

@Component({
  selector: 'app-admin-calendar',
  imports: [NgFor, NgIf],
  templateUrl: './admin-calendar.html',
  styleUrl: './admin-calendar.css'
})
export class AdminCalendar implements OnInit {
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';

  meetings: Meeting[] = [];
  calendarDays: CalendarDay[] = [];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.http.get<Meeting[]>(this.meetingsApiUrl).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
        this.groupMeetingsByDate();
      },
      error: (error) => {
        console.error('Błąd pobierania spotkań do kalendarza:', error);
        alert('Nie udało się pobrać spotkań do kalendarza.');
      }
    });
  }

  groupMeetingsByDate(): void {
    const grouped = new Map<string, Meeting[]>();

    for (const meeting of this.meetings) {
      const dateKey = meeting.startDate.split('T')[0];

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }

      grouped.get(dateKey)?.push(meeting);
    }

    this.calendarDays = Array.from(grouped.entries())
      .map(([dateKey, meetings]) => ({
        dateKey,
        dateLabel: this.formatDateLabel(dateKey),
        meetings: meetings.sort((a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }

  formatDateLabel(dateKey: string): string {
    return new Date(dateKey).toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  goToMeetings(): void {
    this.router.navigate(['/admin/meetings']);
  }
}