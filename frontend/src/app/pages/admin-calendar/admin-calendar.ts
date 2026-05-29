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

interface MeetingNote {
  id?: number;
  meetingId: number;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MeetingAttachment {
  id?: number;
  meetingId: number;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  uploadedAt?: string;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayName: string;
  dayNumber: number;
}

@Component({
  selector: 'app-admin-calendar',
  imports: [NgFor, NgIf],
  templateUrl: './admin-calendar.html',
  styleUrl: './admin-calendar.css'
})
export class AdminCalendar implements OnInit {
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';
  private notesApiUrl = 'http://localhost:4000/api/meeting-notes';
  private attachmentsApiUrl = 'http://localhost:4000/api/meeting-attachments';
  private backendUrl = 'http://localhost:4000';

  meetings: Meeting[] = [];
  weekDays: CalendarDay[] = [];

  selectedMeeting: Meeting | null = null;
  meetingNotes: MeetingNote[] = [];
  meetingAttachments: MeetingAttachment[] = [];

  currentWeekStart = this.getStartOfWeek(new Date());

  hours = [
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00'
  ];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.generateWeekDays();
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.http.get<Meeting[]>(this.meetingsApiUrl).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
      },
      error: (error) => {
        console.error('Błąd pobierania spotkań do kalendarza:', error);
        alert('Nie udało się pobrać spotkań do kalendarza.');
      }
    });
  }

  generateWeekDays(): void {
    this.weekDays = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);

      this.weekDays.push({
        date,
        dateKey: this.getDateKey(date),
        dayName: date.toLocaleDateString('pl-PL', { weekday: 'short' }),
        dayNumber: date.getDate()
      });
    }
  }

  getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const difference = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + difference);
    result.setHours(0, 0, 0, 0);

    return result;
  }

  getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getMeetingsForDayAndHour(day: CalendarDay, hour: string): Meeting[] {
    return this.meetings.filter((meeting) => {
      const meetingDate = meeting.startDate.split('T')[0];
      const meetingHour = meeting.startDate.split('T')[1]?.slice(0, 2);

      return meetingDate === day.dateKey && meetingHour === hour.slice(0, 2);
    });
  }

  getWeekLabel(): string {
    const firstDay = this.weekDays[0]?.date;
    const lastDay = this.weekDays[6]?.date;

    if (!firstDay || !lastDay) {
      return '';
    }

    const first = firstDay.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short'
    });

    const last = lastDay.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return `${first} - ${last}`;
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.generateWeekDays();
    this.closeMeetingDetails();
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.generateWeekDays();
    this.closeMeetingDetails();
  }

  goToToday(): void {
    this.currentWeekStart = this.getStartOfWeek(new Date());
    this.generateWeekDays();
    this.closeMeetingDetails();
  }

  isToday(day: CalendarDay): boolean {
    return day.dateKey === this.getDateKey(new Date());
  }

  showMeetingDetails(meeting: Meeting): void {
    this.selectedMeeting = meeting;
    this.meetingNotes = [];
    this.meetingAttachments = [];

    if (meeting.id) {
      this.loadMeetingNotes(meeting.id);
      this.loadMeetingAttachments(meeting.id);
    }
  }

  closeMeetingDetails(): void {
    this.selectedMeeting = null;
    this.meetingNotes = [];
    this.meetingAttachments = [];
  }

  loadMeetingNotes(meetingId: number): void {
    this.http.get<MeetingNote[]>(`${this.notesApiUrl}/meeting/${meetingId}`).subscribe({
      next: (notes) => {
        this.meetingNotes = notes;
      },
      error: (error) => {
        console.error('Błąd pobierania notatek spotkania:', error);
        this.meetingNotes = [];
      }
    });
  }

  loadMeetingAttachments(meetingId: number): void {
    this.http.get<MeetingAttachment[]>(`${this.attachmentsApiUrl}/meeting/${meetingId}`).subscribe({
      next: (attachments) => {
        this.meetingAttachments = attachments;
      },
      error: (error) => {
        console.error('Błąd pobierania załączników spotkania:', error);
        this.meetingAttachments = [];
      }
    });
  }

  getAttachmentUrl(attachment: MeetingAttachment): string {
    return `${this.backendUrl}${attachment.filePath}`;
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMeetingTime(meeting: Meeting): string {
    return `${this.formatTime(meeting.startDate)} - ${this.formatTime(meeting.endDate)}`;
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }

    return new Date(value).toLocaleString('pl-PL');
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('pl-PL');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Zaplanowane':
        return 'status-planned';
      case 'W realizacji':
        return 'status-progress';
      case 'Zakończone':
        return 'status-completed';
      case 'Przełożone':
        return 'status-postponed';
      case 'Anulowane':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}