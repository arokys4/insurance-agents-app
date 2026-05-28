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
  private apiUrl = 'http://localhost:4000/api/agents';

  showForm = false;
  editMode = false;
  editedAgentId: number | null = null;

  selectedAgent: Agent | null = null;

  agents: Agent[] = [];

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
    this.selectedAgent = null;
    this.showForm = true;
  }

  saveAgent(): void {
    if (!this.validateAgentForm()) {
      return;
    }

    if (this.editMode && this.editedAgentId !== null) {
      this.updateAgent();
    } else {
      this.addAgent();
    }
  }

  onPhoneInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const digitsOnly = input.value.replace(/\D/g, '').slice(0, 9);

  input.value = digitsOnly;
  this.agentForm.phone = digitsOnly;
}

formatFirstName(): void {
  this.agentForm.firstName = this.formatName(this.agentForm.firstName);
}

formatLastName(): void {
  this.agentForm.lastName = this.formatName(this.agentForm.lastName);
}

formatName(value: string): string {
  const trimmedValue = value.trim().toLocaleLowerCase('pl-PL');

  if (!trimmedValue) {
    return '';
  }

  return (
    trimmedValue.charAt(0).toLocaleUpperCase('pl-PL') +
    trimmedValue.slice(1)
  );
}

isOnlyLetters(value: string): boolean {
  const lettersRegex = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+$/;
  return lettersRegex.test(value);
}

isValidEmail(value: string): boolean {
  return value.includes('@');
}

validateAgentForm(): boolean {
  this.agentForm.firstName = this.formatName(this.agentForm.firstName);
  this.agentForm.lastName = this.formatName(this.agentForm.lastName);
  this.agentForm.email = this.agentForm.email.trim();
  this.agentForm.phone = this.agentForm.phone.replace(/\D/g, '').slice(0, 9);

  if (
    !this.agentForm.firstName ||
    !this.agentForm.lastName ||
    !this.agentForm.email ||
    !this.agentForm.phone
  ) {
    alert('Uzupełnij wszystkie pola formularza.');
    return false;
  }

  if (!this.editMode && (!this.agentForm.password || this.agentForm.password.length < 6)) {
    alert('Hasło startowe musi mieć co najmniej 6 znaków.');
    return false;
  }

  if (this.editMode && this.agentForm.password && this.agentForm.password.length < 6) {
    alert('Nowe hasło musi mieć co najmniej 6 znaków.');
    return false;
  }

  if (!this.isOnlyLetters(this.agentForm.firstName)) {
    alert('Imię może zawierać tylko litery.');
    return false;
  }

  if (!this.isOnlyLetters(this.agentForm.lastName)) {
    alert('Nazwisko może zawierać tylko litery.');
    return false;
  }

  if (!this.isValidEmail(this.agentForm.email)) {
    alert('Adres e-mail musi zawierać znak @.');
    return false;
  }

  if (this.agentForm.phone.length !== 9) {
    alert('Numer telefonu musi składać się dokładnie z 9 cyfr.');
    return false;
  }

  return true;
}

  addAgent(): void {
    this.http.post<Agent>(this.apiUrl, this.agentForm).subscribe({
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
    this.http.put<Agent>(`${this.apiUrl}/${this.editedAgentId}`, this.agentForm).subscribe({
      next: () => {
        this.loadAgents();
        this.cancel();
      },
      error: (error) => {
        console.error('Błąd edycji agenta:', error);

        const message =
          error.error?.error || 'Nie udało się zaktualizować danych agenta.';

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
      `Czy na pewno chcesz usunąć agenta ${agent.firstName} ${agent.lastName}?`
    );

    if (!confirmDelete) {
      return;
    }

    this.http.delete(`${this.apiUrl}/${agent.id}`).subscribe({
      next: () => {
        this.selectedAgent = null;
        this.loadAgents();
      },
      error: (error) => {
        console.error('Błąd usuwania agenta:', error);
        alert('Nie udało się usunąć agenta.');
      }
    });
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
      status: 'Aktywny',
      password: ''
    };
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}