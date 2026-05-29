import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-agent-dashboard',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.css'
})
export class AgentDashboard implements OnInit {
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';
  private notesApiUrl = 'http://localhost:4000/api/meeting-notes';
  private attachmentsApiUrl = 'http://localhost:4000/api/meeting-attachments';
  private backendUrl = 'http://localhost:4000';

  user: LoggedUser | null = null;
  meetings: Meeting[] = [];

  selectedMeeting: Meeting | null = null;

  meetingNotes: MeetingNote[] = [];
  noteContent = '';
  editNoteMode = false;
  editedNoteId: number | null = null;

  meetingAttachments: MeetingAttachment[] = [];
  selectedFile: File | null = null;

  statuses = [
    'Zaplanowane',
    'W realizacji',
    'Zakończone',
    'Przełożone',
    'Anulowane'
  ];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadLoggedUser();

    if (this.user) {
      this.loadMyMeetings();
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

  loadMyMeetings(): void {
    if (!this.user) {
      return;
    }

    this.http.get<Meeting[]>(`${this.meetingsApiUrl}/agent/${this.user.id}`).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
      },
      error: (error) => {
        console.error('Błąd pobierania spotkań agenta:', error);
        alert('Nie udało się pobrać Twoich spotkań.');
      }
    });
  }

  showDetails(meeting: Meeting): void {
    this.selectedMeeting = meeting;
    this.clearNoteForm();
    this.selectedFile = null;

    if (meeting.id) {
      this.loadNotes(meeting.id);
      this.loadAttachments(meeting.id);
    }
  }

  closeDetails(): void {
    this.selectedMeeting = null;
    this.meetingNotes = [];
    this.meetingAttachments = [];
    this.selectedFile = null;
    this.clearNoteForm();
  }

  changeStatus(status: string): void {
    if (!this.selectedMeeting?.id) {
      return;
    }

    this.http.patch<Meeting>(`${this.meetingsApiUrl}/${this.selectedMeeting.id}/status`, { status }).subscribe({
      next: (updatedMeeting) => {
        this.selectedMeeting = updatedMeeting;
        this.loadMyMeetings();
      },
      error: (error) => {
        console.error('Błąd zmiany statusu spotkania:', error);

        const message =
          error.error?.error || 'Nie udało się zmienić statusu spotkania.';

        alert(message);
      }
    });
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

  saveNote(): void {
    if (!this.selectedMeeting?.id) {
      alert('Nie wybrano spotkania.');
      return;
    }

    const content = this.noteContent.trim();

    if (content.length < 5) {
      alert('Notatka musi mieć co najmniej 5 znaków.');
      return;
    }

    if (this.editNoteMode && this.editedNoteId !== null) {
      this.updateNote(content);
    } else {
      this.addNote(content);
    }
  }

  addNote(content: string): void {
    if (!this.selectedMeeting?.id) {
      return;
    }

    const payload = {
      meetingId: this.selectedMeeting.id,
      content
    };

    this.http.post<MeetingNote>(this.notesApiUrl, payload).subscribe({
      next: () => {
        this.loadNotes(this.selectedMeeting!.id!);
        this.clearNoteForm();
      },
      error: (error) => {
        console.error('Błąd dodawania notatki:', error);

        const message =
          error.error?.error || 'Nie udało się dodać notatki.';

        alert(message);
      }
    });
  }

  editNote(note: MeetingNote): void {
    this.noteContent = note.content;
    this.editedNoteId = note.id ?? null;
    this.editNoteMode = true;
  }

  updateNote(content: string): void {
    if (this.editedNoteId === null || !this.selectedMeeting?.id) {
      return;
    }

    this.http.put<MeetingNote>(`${this.notesApiUrl}/${this.editedNoteId}`, { content }).subscribe({
      next: () => {
        this.loadNotes(this.selectedMeeting!.id!);
        this.clearNoteForm();
      },
      error: (error) => {
        console.error('Błąd edycji notatki:', error);

        const message =
          error.error?.error || 'Nie udało się zaktualizować notatki.';

        alert(message);
      }
    });
  }

  deleteNote(note: MeetingNote): void {
    if (!note.id || !this.selectedMeeting?.id) {
      return;
    }

    const confirmDelete = confirm('Czy na pewno chcesz usunąć tę notatkę?');

    if (!confirmDelete) {
      return;
    }

    this.http.delete(`${this.notesApiUrl}/${note.id}`).subscribe({
      next: () => {
        this.loadNotes(this.selectedMeeting!.id!);
        this.clearNoteForm();
      },
      error: (error) => {
        console.error('Błąd usuwania notatki:', error);

        const message =
          error.error?.error || 'Nie udało się usunąć notatki.';

        alert(message);
      }
    });
  }

  clearNoteForm(): void {
    this.noteContent = '';
    this.editNoteMode = false;
    this.editedNoteId = null;
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      return;
    }

    this.selectedFile = input.files[0];
  }

  uploadAttachment(): void {
    if (!this.selectedMeeting?.id) {
      alert('Nie wybrano spotkania.');
      return;
    }

    if (!this.selectedFile) {
      alert('Wybierz plik do dodania.');
      return;
    }

    const formData = new FormData();
    formData.append('meetingId', String(this.selectedMeeting.id));
    formData.append('file', this.selectedFile);

    this.http.post<MeetingAttachment>(this.attachmentsApiUrl, formData).subscribe({
      next: () => {
        this.loadAttachments(this.selectedMeeting!.id!);
        this.selectedFile = null;

        const fileInput = document.getElementById('agentAttachmentFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        console.error('Błąd dodawania załącznika:', error);

        const message =
          error.error?.error || 'Nie udało się dodać załącznika.';

        alert(message);
      }
    });
  }

  deleteAttachment(attachment: MeetingAttachment): void {
    if (!attachment.id || !this.selectedMeeting?.id) {
      return;
    }

    const confirmDelete = confirm(`Czy na pewno chcesz usunąć załącznik "${attachment.originalName}"?`);

    if (!confirmDelete) {
      return;
    }

    this.http.delete(`${this.attachmentsApiUrl}/${attachment.id}`).subscribe({
      next: () => {
        this.loadAttachments(this.selectedMeeting!.id!);
      },
      error: (error) => {
        console.error('Błąd usuwania załącznika:', error);

        const message =
          error.error?.error || 'Nie udało się usunąć załącznika.';

        alert(message);
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

  goToCalendar(): void {
    this.router.navigate(['/agent/calendar']);
  }
  
  goToWorkTime(): void {
    this.router.navigate(['/agent/work-time']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}