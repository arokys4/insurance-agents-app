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
    this.editMode = false;
    this.editedEntryId = null;
    this.selectedEntry = null;
    this.showForm = true;
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
      alert('Uzupełnij wszystkie wymagane pola ewidencji czasu pracy.');
      return false;
    }

    const start = new Date(`${this.entryForm.workDate}T${this.entryForm.startTime}`);
    const end = new Date(`${this.entryForm.workDate}T${this.entryForm.endTime}`);

    if (end <= start) {
      alert('Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.');
      return false;
    }

    return true;
  }

  addEntry(): void {
    this.http.post<WorkTimeEntry>(this.workTimeApiUrl, this.entryForm).subscribe({
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
    this.http.put<WorkTimeEntry>(`${this.workTimeApiUrl}/${this.editedEntryId}`, this.entryForm).subscribe({
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
      description: entry.description
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

    const confirmDelete = confirm(
      `Czy na pewno chcesz usunąć wpis czasu pracy agenta ${entry.agentName}?`
    );

    if (!confirmDelete) {
      return;
    }

    this.http.delete(`${this.workTimeApiUrl}/${entry.id}`).subscribe({
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
      return '0';
    }

    return value.toFixed(2);
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}