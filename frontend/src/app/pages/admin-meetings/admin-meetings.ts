import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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

interface MeetingConflictInfo {
  message: string;
  conflictTitle: string;
  conflictStartDate: string;
  conflictEndDate: string;
  suggestedStartDate: string | null;
  suggestedEndDate: string | null;
}

@Component({
  selector: 'app-admin-meetings',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-meetings.html',
  styleUrl: './admin-meetings.css'
})
export class AdminMeetings implements OnInit {
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';
  private agentsApiUrl = 'http://localhost:4000/api/agents';
  private notesApiUrl = 'http://localhost:4000/api/meeting-notes';
  private attachmentsApiUrl = 'http://localhost:4000/api/meeting-attachments';
  private backendUrl = 'http://localhost:4000';

  meetings: Meeting[] = [];
  meetingSearchText = '';

  agents: Agent[] = [];

  pendingStatuses: { [meetingId: number]: string } = {};

  meetingNotes: MeetingNote[] = [];
  noteContent = '';
  editNoteMode = false;
  editedNoteId: number | null = null;

  meetingAttachments: MeetingAttachment[] = [];
  selectedFile: File | null = null;

  showForm = false;
  editMode = false;
  editedMeetingId: number | null = null;

  selectedMeeting: Meeting | null = null;
  meetingConflictInfo: MeetingConflictInfo | null = null;

  meetingTypes = [
    'Spotkanie z klientem',
    'Oględziny szkody',
    'Spotkanie wewnętrzne',
    'Inna sprawa'
  ];

  statuses = [
    'Zaplanowane',
    'W realizacji',
    'Zakończone',
    'Przełożone',
    'Anulowane'
  ];

  meetingForm: Meeting = {
    title: '',
    description: '',
    meetingType: 'Spotkanie z klientem',
    startDate: '',
    endDate: '',
    status: 'Zaplanowane',
    agentId: null
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadMeetings();
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
        meeting.agentName,
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

  getLoggedUserPayload(): { userId: number | null; userRole: string | null } {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      userId: user?.id ?? null,
      userRole: user?.role ?? null
    };
  }

  handleMeetingSaveError(error: any): void {
    console.error('Błąd zapisu spotkania:', error);

    this.meetingConflictInfo = null;

    if (error.status === 409 && error.error?.conflict) {
      const conflict = error.error.conflict;

      this.meetingConflictInfo = {
        message: error.error.error || 'Agent ma już spotkanie w wybranym terminie.',
        conflictTitle: conflict.title,
        conflictStartDate: conflict.startDate,
        conflictEndDate: conflict.endDate,
        suggestedStartDate: error.error.suggestedStartDate || null,
        suggestedEndDate: error.error.suggestedEndDate || null
      };

      return;
    }

    const message =
      error.error?.error || 'Nie udało się zapisać spotkania.';

    alert(message);
  }

  useSuggestedMeetingTime(): void {
    if (!this.meetingConflictInfo?.suggestedStartDate || !this.meetingConflictInfo?.suggestedEndDate) {
      return;
    }

    this.meetingForm.startDate = this.meetingConflictInfo.suggestedStartDate;
    this.meetingForm.endDate = this.meetingConflictInfo.suggestedEndDate;
    this.meetingConflictInfo = null;
  }

  loadAgents(): void {
    this.http.get<Agent[]>(this.agentsApiUrl).subscribe({
      next: (agents) => {
        this.agents = agents.filter(agent =>
          agent.status === 'Aktywny' &&
          agent.role !== 'ADMIN'
        );
      },
      error: (error) => {
        console.error('Błąd pobierania agentów:', error);
        alert('Nie udało się pobrać listy agentów.');
      }
    });
  }

  loadMeetings(): void {
    this.http.get<Meeting[]>(this.meetingsApiUrl).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
        this.pendingStatuses = {};

        this.meetings.forEach((meeting) => {
          if (meeting.id !== undefined) {
            this.pendingStatuses[meeting.id] = meeting.status;
          }
        });
      },
      error: (error) => {
        console.error('Błąd pobierania spotkań:', error);
        alert('Nie udało się pobrać listy spotkań.');
      }
    });
  }

  showAddMeetingForm(): void {
    this.clearForm();
    this.meetingConflictInfo = null;
    this.editMode = false;
    this.editedMeetingId = null;
    this.selectedMeeting = null;
    this.meetingNotes = [];
    this.meetingAttachments = [];
    this.selectedFile = null;
    this.clearNoteForm();
    this.showForm = true;
  }

  saveMeeting(): void {
    if (!this.validateMeetingForm()) {
      return;
    }

    this.meetingConflictInfo = null;

    if (this.editMode && this.editedMeetingId !== null) {
      this.updateMeeting();
    } else {
      this.addMeeting();
    }
  }

  validateMeetingForm(): boolean {
    if (
      !this.meetingForm.title ||
      !this.meetingForm.meetingType ||
      !this.meetingForm.startDate ||
      !this.meetingForm.endDate ||
      !this.meetingForm.agentId
    ) {
      alert('Uzupełnij wszystkie wymagane pola spotkania.');
      return false;
    }

    const start = new Date(this.meetingForm.startDate);
    const end = new Date(this.meetingForm.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      alert('Nieprawidłowy format daty.');
      return false;
    }

    if (end <= start) {
      alert('Data zakończenia musi być późniejsza niż data rozpoczęcia.');
      return false;
    }

    return true;
  }

  addMeeting(): void {
    const payload = {
      ...this.meetingForm,
      ...this.getLoggedUserPayload()
    };

    this.http.post<Meeting>(this.meetingsApiUrl, payload).subscribe({
      next: () => {
        this.loadMeetings();
        this.cancel();
      },
      error: (error) => {
        this.handleMeetingSaveError(error);
      }
    });
  }

  updateMeeting(): void {
    if (this.editedMeetingId === null) {
      return;
    }

    const payload = {
      ...this.meetingForm,
      ...this.getLoggedUserPayload()
    };

    this.http.put<Meeting>(`${this.meetingsApiUrl}/${this.editedMeetingId}`, payload).subscribe({
      next: () => {
        this.loadMeetings();
        this.cancel();
      },
      error: (error) => {
        this.handleMeetingSaveError(error);
      }
    });
  }

  editMeeting(meeting: Meeting): void {
    this.meetingConflictInfo = null;

    this.meetingForm = {
      title: meeting.title,
      description: meeting.description,
      meetingType: meeting.meetingType,
      startDate: meeting.startDate,
      endDate: meeting.endDate,
      status: meeting.status,
      agentId: meeting.agentId
    };

    this.editMode = true;
    this.editedMeetingId = meeting.id ?? null;
    this.selectedMeeting = null;
    this.meetingNotes = [];
    this.meetingAttachments = [];
    this.selectedFile = null;
    this.clearNoteForm();
    this.showForm = true;
  }

  showDetails(meeting: Meeting): void {
    this.selectedMeeting = meeting;
    this.showForm = false;
    this.clearNoteForm();
    this.selectedFile = null;

    if (meeting.id !== undefined) {
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

  getPendingStatus(meeting: Meeting): string {
    if (meeting.id === undefined) {
      return meeting.status;
    }

    return this.pendingStatuses[meeting.id] || meeting.status;
  }

  setPendingStatus(meeting: Meeting, status: string): void {
    if (meeting.id === undefined) {
      return;
    }

    this.pendingStatuses[meeting.id] = status;
  }

  hasPendingStatusChange(meeting: Meeting): boolean {
    if (meeting.id === undefined) {
      return false;
    }

    return this.pendingStatuses[meeting.id] !== meeting.status;
  }

  saveStatus(meeting: Meeting): void {
    if (meeting.id === undefined) {
      return;
    }

    const selectedStatus = this.getPendingStatus(meeting);

    const payload = {
      status: selectedStatus,
      ...this.getLoggedUserPayload()
    };

    this.http.patch<Meeting>(`${this.meetingsApiUrl}/${meeting.id}/status`, payload).subscribe({
      next: () => {
        if (this.selectedMeeting && this.selectedMeeting.id === meeting.id) {
          this.selectedMeeting = {
            ...this.selectedMeeting,
            status: selectedStatus
          };
        }

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

  deleteMeeting(meeting: Meeting): void {
    if (meeting.id === undefined) {
      return;
    }

    const meetingId = meeting.id;

    const confirmDelete = confirm(
      `Czy na pewno chcesz usunąć spotkanie "${meeting.title}"?`
    );

    if (!confirmDelete) {
      return;
    }

    this.http.request('delete', `${this.meetingsApiUrl}/${meetingId}`, {
      body: this.getLoggedUserPayload()
    }).subscribe({
      next: () => {
        this.selectedMeeting = null;
        this.meetingNotes = [];
        this.meetingAttachments = [];
        this.selectedFile = null;
        this.clearNoteForm();
        this.loadMeetings();
      },
      error: (error) => {
        console.error('Błąd usuwania spotkania:', error);

        const message =
          error.error?.error || 'Nie udało się usunąć spotkania.';

        alert(message);
      }
    });
  }

  cancel(): void {
    this.clearForm();
    this.meetingConflictInfo = null;
    this.showForm = false;
    this.editMode = false;
    this.editedMeetingId = null;
  }

  clearForm(): void {
    this.meetingForm = {
      title: '',
      description: '',
      meetingType: 'Spotkanie z klientem',
      startDate: '',
      endDate: '',
      status: 'Zaplanowane',
      agentId: null
    };

    this.meetingConflictInfo = null;
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
    this.router.navigate(['/admin']);
  }
}