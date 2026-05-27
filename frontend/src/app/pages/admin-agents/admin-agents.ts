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

@Component({
  selector: 'app-admin-agents',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-agents.html',
  styleUrl: './admin-agents.css'
})
export class AdminAgents implements OnInit {
  private apiUrl = 'http://localhost:4000/api/agents';

  showForm = false;
  editMode = false;
  editedAgentId: number | null = null;

  agents: Agent[] = [];

  agentForm: Agent = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Aktywny'
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.http.get<Agent[]>(this.apiUrl).subscribe({
      next: (agents) => {
        this.agents = agents;
      },
      error: (error) => {
        console.error('Błąd pobierania agentów:', error);
        alert('Nie udało się pobrać listy agentów z serwera.');
      }
    });
  }

  showAddAgentForm(): void {
    this.clearForm();
    this.editMode = false;
    this.editedAgentId = null;
    this.showForm = true;
  }

  saveAgent(): void {
    if (
      !this.agentForm.firstName ||
      !this.agentForm.lastName ||
      !this.agentForm.email ||
      !this.agentForm.phone
    ) {
      alert('Uzupełnij wszystkie pola formularza.');
      return;
    }

    if (this.editMode && this.editedAgentId !== null) {
      this.http.put<Agent>(`${this.apiUrl}/${this.editedAgentId}`, this.agentForm).subscribe({
        next: () => {
          this.loadAgents();
          this.cancel();
        },
        error: (error) => {
          console.error('Błąd edycji agenta:', error);
          alert('Nie udało się zaktualizować danych agenta.');
        }
      });
    } else {
      this.http.post<Agent>(this.apiUrl, this.agentForm).subscribe({
        next: () => {
          this.loadAgents();
          this.cancel();
        },
        error: (error) => {
          console.error('Błąd dodawania agenta:', error);
          alert('Nie udało się dodać agenta.');
        }
      });
    }
  }

  editAgent(agent: Agent): void {
    this.agentForm = {
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      status: agent.status
    };

    this.editMode = true;
    this.editedAgentId = agent.id ?? null;
    this.showForm = true;
  }

  deactivateAgent(agent: Agent): void {
    if (!agent.id) {
      return;
    }

    const confirmDeactivate = confirm('Czy na pewno chcesz dezaktywować tego agenta?');

    if (!confirmDeactivate) {
      return;
    }

    this.changeAgentStatus(agent.id, 'Nieaktywny');
  }

  activateAgent(agent: Agent): void {
    if (!agent.id) {
      return;
    }

    const confirmActivate = confirm('Czy na pewno chcesz ponownie aktywować tego agenta?');

    if (!confirmActivate) {
      return;
    }

    this.changeAgentStatus(agent.id, 'Aktywny');
  }

  changeAgentStatus(id: number, status: string): void {
    this.http.patch<Agent>(`${this.apiUrl}/${id}/status`, { status }).subscribe({
      next: () => {
        this.loadAgents();
      },
      error: (error) => {
        console.error('Błąd zmiany statusu agenta:', error);
        alert('Nie udało się zmienić statusu agenta.');
      }
    });
  }

  cancel(): void {
    this.clearForm();
    this.showForm = false;
    this.editMode = false;
    this.editedAgentId = null;
  }

  clearForm(): void {
    this.agentForm = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'Aktywny'
    };
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}