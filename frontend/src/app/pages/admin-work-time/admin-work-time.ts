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
  selector: 'app-admin-work-time',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-work-time.html',
  styleUrl: './admin-work-time.css'
})
export class AdminWorkTime implements OnInit {
  private workTimeApiUrl = 'http://localhost:4000/api/work-time';
  private agentsApiUrl = 'http://localhost:4000/api/agents';

  entries: WorkTimeEntry[] = [];
  workTimeSearchText = '';

  agents: Agent[] = [];

  showForm = false;
  editMode = false;
  editedEntryId: number | null = null;

  selectedEntry: WorkTimeEntry | null = null;

  entryForm: WorkTimeEntry = {
    agentId: null,
    workDate: '',
    startTime: '',
    endTime: '',
    description: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadEntries();
  }

  get filteredEntries(): WorkTimeEntry[] {
    const search = this.workTimeSearchText.trim().toLowerCase();

    if (!search) {
      return this.entries;
    }

    return this.entries.filter((entry) => {
      const values = [
        entry.agentName,
        entry.workDate,
        entry.startTime,
        entry.endTime,
        this.formatDate(entry.workDate),
        this.formatHours(entry.durationHours),
        entry.description
      ];

      return values.some(value =>
        String(value || '').toLowerCase().includes(search)
      );
    });
  }

  clearWorkTimeSearch(): void {
    this.workTimeSearchText = '';
  }

  getLoggedUserPayload(): { userId: number | null; userRole: string | null } {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      userId: user?.id ?? null,
      userRole: user?.role ?? null
    };
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

  loadEntries(): void {
    this.http.get<WorkTimeEntry[]>(this.workTimeApiUrl).subscribe({
      next: (entries) => {
        this.entries = entries;
      },
      error: (error) => {
        console.error('Błąd pobierania ewidencji czasu pracy:', error);
        alert('Nie udało się pobrać ewidencji czasu pracy.');
      }
    });
  }

  showAddEntryForm(): void {
    this.clearForm();
    this.showForm = true;
    this.editMode = false;
    this.editedEntryId = null;
    this.selectedEntry = null;
  }

  saveEntry(): void {
    if (!this.validateEntryForm()) {
      return;
    }

    if (this.editMode && this.editedEntryId !== null) {
      this.updateEntry();
    } else {
      this.addEntry();
    }
  }

  validateEntryForm(): boolean {
    if (
      !this.entryForm.agentId ||
      !this.entryForm.workDate ||
      !this.entryForm.startTime ||
      !this.entryForm.endTime
    ) {
      alert('Uzupełnij agenta, datę oraz godziny pracy.');
      return false;
    }

    const start = new Date(`${this.entryForm.workDate}T${this.entryForm.startTime}`);
    const end = new Date(`${this.entryForm.workDate}T${this.entryForm.endTime}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      alert('Nieprawidłowy format daty lub godziny.');
      return false;
    }

    if (end <= start) {
      alert('Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.');
      return false;
    }

    return true;
  }

  addEntry(): void {
    const payload = {
      ...this.entryForm,
      ...this.getLoggedUserPayload()
    };

    this.http.post<WorkTimeEntry>(this.workTimeApiUrl, payload).subscribe({
      next: () => {
        this.loadEntries();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd dodawania wpisu czasu pracy:', error);

        const message =
          error.error?.error || 'Nie udało się dodać wpisu czasu pracy.';

        alert(message);
      }
    });
  }

  updateEntry(): void {
    if (this.editedEntryId === null) {
      return;
    }

    const payload = {
      ...this.entryForm,
      ...this.getLoggedUserPayload()
    };

    this.http.put<WorkTimeEntry>(`${this.workTimeApiUrl}/${this.editedEntryId}`, payload).subscribe({
      next: () => {
        this.loadEntries();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd edycji wpisu czasu pracy:', error);

        const message =
          error.error?.error || 'Nie udało się zaktualizować wpisu czasu pracy.';

        alert(message);
      }
    });
  }

  editEntry(entry: WorkTimeEntry): void {
    this.entryForm = {
      agentId: entry.agentId,
      workDate: entry.workDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
      description: entry.description || ''
    };

    this.editMode = true;
    this.editedEntryId = entry.id ?? null;
    this.selectedEntry = null;
    this.showForm = true;
  }

  showDetails(entry: WorkTimeEntry): void {
    this.selectedEntry = entry;
    this.showForm = false;
  }

  closeDetails(): void {
    this.selectedEntry = null;
  }

  deleteEntry(entry: WorkTimeEntry): void {
    if (!entry.id) {
      return;
    }

    const entryId = entry.id;

    const confirmDelete = confirm('Czy na pewno chcesz usunąć ten wpis czasu pracy?');

    if (!confirmDelete) {
      return;
    }

    this.http.request('delete', `${this.workTimeApiUrl}/${entryId}`, {
      body: this.getLoggedUserPayload()
    }).subscribe({
      next: () => {
        this.selectedEntry = null;
        this.loadEntries();
      },
      error: (error) => {
        console.error('Błąd usuwania wpisu czasu pracy:', error);

        const message =
          error.error?.error || 'Nie udało się usunąć wpisu czasu pracy.';

        alert(message);
      }
    });
  }

  cancel(): void {
    this.clearForm();
    this.showForm = false;
    this.editMode = false;
    this.editedEntryId = null;
  }

  clearForm(): void {
    this.entryForm = {
      agentId: null,
      workDate: '',
      startTime: '',
      endTime: '',
      description: ''
    };
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }

    return new Date(value).toLocaleDateString('pl-PL');
  }

  formatHours(value?: number): string {
    if (value === undefined || value === null) {
      return '0 godz. 00 min';
    }

    const totalMinutes = Math.round(value * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours} godz. ${String(minutes).padStart(2, '0')} min`;
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}