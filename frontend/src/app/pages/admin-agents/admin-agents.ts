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
  mustChangePassword?: boolean;
  password?: string;
}

@Component({
  selector: 'app-admin-agents',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-agents.html',
  styleUrl: './admin-agents.css'
})
export class AdminAgents implements OnInit {
  private agentsApiUrl = 'http://localhost:4000/api/agents';

  agents: Agent[] = [];

  showForm = false;
  editMode = false;
  editedAgentId: number | null = null;

  selectedAgent: Agent | null = null;

  agentForm: Agent = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Aktywny',
    password: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.http.get<Agent[]>(this.agentsApiUrl).subscribe({
      next: (agents) => {
        this.agents = agents.filter(agent => agent.role !== 'ADMIN');
      },
      error: (error) => {
        console.error('Błąd pobierania agentów:', error);
        alert('Nie udało się pobrać listy agentów.');
      }
    });
  }

  showAddAgentForm(): void {
    this.clearForm();
    this.showForm = true;
    this.editMode = false;
    this.editedAgentId = null;
    this.selectedAgent = null;
  }

  saveAgent(): void {
    if (!this.validateAgentForm()) {
      return;
    }

    this.normalizeAgentForm();

    if (this.editMode && this.editedAgentId !== null) {
      this.updateAgent();
    } else {
      this.addAgent();
    }
  }

  validateAgentForm(): boolean {
    const firstName = this.agentForm.firstName.trim();
    const lastName = this.agentForm.lastName.trim();
    const email = this.agentForm.email.trim();
    const phone = this.agentForm.phone.trim();
    const password = this.agentForm.password || '';

    if (!firstName || !lastName || !email || !phone || !this.agentForm.status) {
      alert('Uzupełnij wszystkie wymagane pola.');
      return false;
    }

    const nameRegex = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/;

    if (!nameRegex.test(firstName)) {
      alert('Imię może zawierać tylko litery.');
      return false;
    }

    if (!nameRegex.test(lastName)) {
      alert('Nazwisko może zawierać tylko litery.');
      return false;
    }

    if (!email.includes('@')) {
      alert('Podaj poprawny adres e-mail.');
      return false;
    }

    const phoneRegex = /^[0-9]{9}$/;

    if (!phoneRegex.test(phone)) {
      alert('Telefon musi składać się dokładnie z 9 cyfr.');
      return false;
    }

    if (!this.editMode && !password) {
      alert('Podaj hasło startowe dla agenta.');
      return false;
    }

    if (password) {
      const passwordError = this.validatePasswordStrength(password);

      if (passwordError) {
        alert(passwordError);
        return false;
      }
    }

    return true;
  }

  validatePasswordStrength(password: string): string | null {
    if (!password || password.length < 8) {
      return 'Hasło musi mieć co najmniej 8 znaków.';
    }

    if (!/[a-z]/.test(password)) {
      return 'Hasło musi zawierać co najmniej jedną małą literę.';
    }

    if (!/[A-Z]/.test(password)) {
      return 'Hasło musi zawierać co najmniej jedną wielką literę.';
    }

    if (!/[0-9]/.test(password)) {
      return 'Hasło musi zawierać co najmniej jedną cyfrę.';
    }

    if (!/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(password)) {
      return 'Hasło musi zawierać co najmniej jeden znak specjalny.';
    }

    return null;
  }

  normalizeAgentForm(): void {
    this.agentForm.firstName = this.capitalizeText(this.agentForm.firstName.trim());
    this.agentForm.lastName = this.capitalizeText(this.agentForm.lastName.trim());
    this.agentForm.email = this.agentForm.email.trim().toLowerCase();
    this.agentForm.phone = this.agentForm.phone.trim();
  }

  capitalizeText(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(part => part.trim().length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  addAgent(): void {
    this.http.post<Agent>(this.agentsApiUrl, this.agentForm).subscribe({
      next: () => {
        this.loadAgents();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd dodawania agenta:', error);

        const message =
          error.error?.error || 'Nie udało się dodać agenta.';

        alert(message);
      }
    });
  }

  updateAgent(): void {
    if (this.editedAgentId === null) {
      return;
    }

    const payload: Agent = {
      ...this.agentForm
    };

    if (!payload.password) {
      delete payload.password;
    }

    this.http.put<Agent>(`${this.agentsApiUrl}/${this.editedAgentId}`, payload).subscribe({
      next: () => {
        this.loadAgents();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd edycji agenta:', error);

        const message =
          error.error?.error || 'Nie udało się zaktualizować agenta.';

        alert(message);
      }
    });
  }

  editAgent(agent: Agent): void {
    this.agentForm = {
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      status: agent.status,
      password: ''
    };

    this.editMode = true;
    this.editedAgentId = agent.id ?? null;
    this.selectedAgent = null;
    this.showForm = true;
  }

  showDetails(agent: Agent): void {
    this.selectedAgent = agent;
    this.showForm = false;
  }

  closeDetails(): void {
    this.selectedAgent = null;
  }

  deleteAgent(agent: Agent): void {
    if (!agent.id) {
      return;
    }

    const confirmDelete = confirm(
      `Czy na pewno chcesz usunąć agenta "${agent.firstName} ${agent.lastName}"?`
    );

    if (!confirmDelete) {
      return;
    }

    this.http.delete(`${this.agentsApiUrl}/${agent.id}`).subscribe({
      next: () => {
        this.selectedAgent = null;
        this.loadAgents();
      },
      error: (error) => {
        console.error('Błąd usuwania agenta:', error);

        const message =
          error.error?.error || 'Nie udało się usunąć agenta.';

        alert(message);
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
      status: 'Aktywny',
      password: ''
    };
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}