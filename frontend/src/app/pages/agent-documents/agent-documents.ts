import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface LoggedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
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

@Component({
  selector: 'app-agent-documents',
  imports: [NgFor, NgIf],
  templateUrl: './agent-documents.html',
  styleUrl: './agent-documents.css'
})
export class AgentDocuments implements OnInit {
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';
  private notesApiUrl = 'http://localhost:4000/api/meeting-notes';
  private attachmentsApiUrl = 'http://localhost:4000/api/meeting-attachments';
  private backendUrl = 'http://localhost:4000';

  user: LoggedUser | null = null;

  meetings: Meeting[] = [];
  selectedMeeting: Meeting | null = null;

  meetingNotes: MeetingNote[] = [];
  meetingAttachments: MeetingAttachment[] = [];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadLoggedUser();

    if (this.user) {
      this.loadMeetings();
    }
  }

  loadLoggedUser(): void {
    const userJson = localStorage.getItem('user');

    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = JSON.parse(userJson);
  }

  loadMeetings(): void {
    if (!this.user) {
      return;
    }

    this.http.get<Meeting[]>(`${this.meetingsApiUrl}/agent/${this.user.id}`).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
      },
      error: (error) => {
        console.error('Błąd pobierania dokumentacji:', error);
        alert('Nie udało się pobrać dokumentacji spotkań.');
      }
    });
  }

  showDetails(meeting: Meeting): void {
    this.selectedMeeting = meeting;
    this.meetingNotes = [];
    this.meetingAttachments = [];

    if (meeting.id) {
      this.loadNotes(meeting.id);
      this.loadAttachments(meeting.id);
    }
  }

  closeDetails(): void {
    this.selectedMeeting = null;
    this.meetingNotes = [];
    this.meetingAttachments = [];
  }

  loadNotes(meetingId: number): void {
    this.http.get<MeetingNote[]>(`${this.notesApiUrl}/meeting/${meetingId}`).subscribe({
      next: (notes) => {
        this.meetingNotes = notes;
      },
      error: (error) => {
        console.error('Błąd pobierania notatek:', error);
        this.meetingNotes = [];
      }
    });
  }

  loadAttachments(meetingId: number): void {
    this.http.get<MeetingAttachment[]>(`${this.attachmentsApiUrl}/meeting/${meetingId}`).subscribe({
      next: (attachments) => {
        this.meetingAttachments = attachments;
      },
      error: (error) => {
        console.error('Błąd pobierania załączników:', error);
        this.meetingAttachments = [];
      }
    });
  }

  getAttachmentUrl(attachment: MeetingAttachment): string {
    return `${this.backendUrl}${attachment.filePath}`;
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

  goBack(): void {
    this.router.navigate(['/agent']);
  }
}