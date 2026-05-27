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

@Component({
  selector: 'app-admin-meetings',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-meetings.html',
  styleUrl: './admin-meetings.css'
})
export class AdminMeetings implements OnInit {
  private meetingsApiUrl = 'http://localhost:4000/api/meetings';
  private agentsApiUrl = 'http://localhost:4000/api/agents';

  meetings: Meeting[] = [];
  agents: Agent[] = [];

  showForm = false;
  editMode = false;
  editedMeetingId: number | null = null;

  selectedMeeting: Meeting | null = null;

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

  loadAgents(): void {
    this.http.get<Agent[]>(this.agentsApiUrl).subscribe({
      next: (agents) => {
        this.agents = agents.filter(agent => agent.status === 'Aktywny');
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
      },
      error: (error) => {
        console.error('Błąd pobierania spotkań:', error);
        alert('Nie udało się pobrać listy spotkań.');
      }
    });
  }

  showAddMeetingForm(): void {
    this.clearForm();
    this.editMode = false;
    this.editedMeetingId = null;
    this.selectedMeeting = null;
    this.showForm = true;
  }

  saveMeeting(): void {
    if (!this.validateMeetingForm()) {
      return;
    }

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

    if (end <= start) {
      alert('Data zakończenia musi być późniejsza niż data rozpoczęcia.');
      return false;
    }

    return true;
  }

  addMeeting(): void {
    this.http.post<Meeting>(this.meetingsApiUrl, this.meetingForm).subscribe({
      next: () => {
        this.loadMeetings();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd dodawania spotkania:', error);

        const message =
          error.error?.error || 'Nie udało się dodać spotkania.';

        alert(message);
      }
    });
  }

  updateMeeting(): void {
    this.http.put<Meeting>(`${this.meetingsApiUrl}/${this.editedMeetingId}`, this.meetingForm).subscribe({
      next: () => {
        this.loadMeetings();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd edycji spotkania:', error);

        const message =
          error.error?.error || 'Nie udało się zaktualizować spotkania.';

        alert(message);
      }
    });
  }

  editMeeting(meeting: Meeting): void {
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
    this.showForm = true;
  }

  showDetails(meeting: Meeting): void {
    this.selectedMeeting = meeting;
    this.showForm = false;
  }

  closeDetails(): void {
    this.selectedMeeting = null;
  }

  changeStatus(meeting: Meeting, status: string): void {
    if (!meeting.id) {
      return;
    }

    this.http.patch<Meeting>(`${this.meetingsApiUrl}/${meeting.id}/status`, { status }).subscribe({
      next: () => {
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

  deleteMeeting(meeting: Meeting): void {
    if (!meeting.id) {
      return;
    }

    const confirmDelete = confirm(
      `Czy na pewno chcesz usunąć spotkanie "${meeting.title}"?`
    );

    if (!confirmDelete) {
      return;
    }

    this.http.delete(`${this.meetingsApiUrl}/${meeting.id}`).subscribe({
      next: () => {
        this.selectedMeeting = null;
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
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }

    return new Date(value).toLocaleString('pl-PL');
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}