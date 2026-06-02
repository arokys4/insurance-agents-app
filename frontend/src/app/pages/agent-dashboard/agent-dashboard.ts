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
  meetingSearchText = '';

  selectedMeeting: Meeting | null = null;
  selectedStatus = '';

  meetingNotes: MeetingNote[] = [];
  noteContent = '';
  editNoteMode = false;
  editedNoteId: number | null = null;

  meetingAttachments: MeetingAttachment[] = [];
  selectedFile: File | null = null;

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

  get filteredMeetings(): Meeting[] {
    const search = this.meetingSearchText.trim().toLowerCase();

    if (!search) {
      return this.meetings;
    }

    return this.meetings.filter((meeting) => {
      const values = [
        meeting.title,
        meeting.description,
        meeting.meetingType,
        meeting.status,
        this.formatDate(meeting.startDate),
        this.formatDate(meeting.endDate)
      ];

      return values.some(value =>
        String(value || '').toLowerCase().includes(search)
      );
    });
  }

  clearMeetingSearch(): void {
    this.meetingSearchText = '';
  }

  loadLoggedUser(): void {
    const userJson = localStorage.getItem('user');

    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = JSON.parse(userJson);
  }

  getLoggedUserPayload(): { userId: number | null; userRole: string | null } {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      userId: user?.id ?? null,
      userRole: user?.role ?? null
    };
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
        console.error('Błąd pobierania spotkań agenta:', error);
        alert('Nie udało się pobrać listy spotkań.');
      }
    });
  }

  showDetails(meeting: Meeting): void {
    this.selectedMeeting = meeting;
    this.selectedStatus = meeting.status;
    this.clearNoteForm();
    this.selectedFile = null;

    if (meeting.id !== undefined) {
      this.loadNotes(meeting.id);
      this.loadAttachments(meeting.id);
    }
  }

  closeDetails(): void {
    this.selectedMeeting = null;
    this.selectedStatus = '';
    this.meetingNotes = [];
    this.meetingAttachments = [];
    this.selectedFile = null;
    this.clearNoteForm();
  }

  hasStatusChanged(): boolean {
    if (!this.selectedMeeting) {
      return false;
    }

    return this.selectedStatus !== this.selectedMeeting.status;
  }

  saveStatus(): void {
    if (!this.selectedMeeting?.id) {
      return;
    }

    const payload = {
      status: this.selectedStatus,
      ...this.getLoggedUserPayload()
    };

    this.http.patch<Meeting>(`${this.meetingsApiUrl}/${this.selectedMeeting.id}/status`, payload).subscribe({
      next: (updatedMeeting) => {
        this.selectedMeeting = updatedMeeting;
        this.selectedStatus = updatedMeeting.status;
        this.loadMeetings();
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

        const message =
          error.error?.error || 'Nie udało się pobrać notatek spotkania.';

        alert(message);
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
      content,
      ...this.getLoggedUserPayload()
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

    const payload = {
      content,
      ...this.getLoggedUserPayload()
    };

    this.http.put<MeetingNote>(`${this.notesApiUrl}/${this.editedNoteId}`, payload).subscribe({
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

    const noteId = note.id;

    const confirmDelete = confirm('Czy na pewno chcesz usunąć tę notatkę?');

    if (!confirmDelete) {
      return;
    }

    this.http.request('delete', `${this.notesApiUrl}/${noteId}`, {
      body: this.getLoggedUserPayload()
    }).subscribe({
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

        const message =
          error.error?.error || 'Nie udało się pobrać załączników spotkania.';

        alert(message);
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

    const loggedUser = this.getLoggedUserPayload();

    const formData = new FormData();
    formData.append('meetingId', String(this.selectedMeeting.id));
    formData.append('file', this.selectedFile);
    formData.append('userId', String(loggedUser.userId ?? ''));
    formData.append('userRole', loggedUser.userRole ?? '');

    this.http.post<MeetingAttachment>(this.attachmentsApiUrl, formData).subscribe({
      next: () => {
        this.loadAttachments(this.selectedMeeting!.id!);
        this.selectedFile = null;

        const fileInput = document.getElementById('attachmentFile') as HTMLInputElement;

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

    const attachmentId = attachment.id;

    const confirmDelete = confirm(`Czy na pewno chcesz usunąć załącznik "${attachment.originalName}"?`);

    if (!confirmDelete) {
      return;
    }

    this.http.request('delete', `${this.attachmentsApiUrl}/${attachmentId}`, {
      body: this.getLoggedUserPayload()
    }).subscribe({
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

  getNearestMeeting(): Meeting | null {
    if (this.meetings.length === 0) {
      return null;
    }

    const now = new Date();

    const futureMeetings = this.meetings
      .filter(meeting => new Date(meeting.startDate) >= now)
      .sort((a, b) => {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

    return futureMeetings[0] || null;
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

  goToDocuments(): void {
    this.router.navigate(['/agent/documents']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
