import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-agents',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-agents.html',
  styleUrl: './admin-agents.css'
})
export class AdminAgents {
  showForm = false;
  editMode = false;
  editedAgentIndex: number | null = null;

  agents = [
    {
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: 'jan.kowalski@firma.pl',
      phone: '500 100 200',
      status: 'Aktywny'
    },
    {
      firstName: 'Anna',
      lastName: 'Nowak',
      email: 'anna.nowak@firma.pl',
      phone: '500 300 400',
      status: 'Aktywna'
    },
    {
      firstName: 'Piotr',
      lastName: 'Wiśniewski',
      email: 'piotr.wisniewski@firma.pl',
      phone: '500 500 600',
      status: 'Nieaktywny'
    }
  ];

  agentForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Aktywny'
  };

  constructor(private router: Router) {}

  showAddAgentForm(): void {
    this.clearForm();
    this.editMode = false;
    this.editedAgentIndex = null;
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

    if (this.editMode && this.editedAgentIndex !== null) {
      this.agents[this.editedAgentIndex] = {
        firstName: this.agentForm.firstName,
        lastName: this.agentForm.lastName,
        email: this.agentForm.email,
        phone: this.agentForm.phone,
        status: this.agentForm.status
      };
    } else {
      this.agents.push({
        firstName: this.agentForm.firstName,
        lastName: this.agentForm.lastName,
        email: this.agentForm.email,
        phone: this.agentForm.phone,
        status: this.agentForm.status
      });
    }

    this.clearForm();
    this.showForm = false;
    this.editMode = false;
    this.editedAgentIndex = null;
  }

  editAgent(index: number): void {
    const selectedAgent = this.agents[index];

    this.agentForm = {
      firstName: selectedAgent.firstName,
      lastName: selectedAgent.lastName,
      email: selectedAgent.email,
      phone: selectedAgent.phone,
      status: selectedAgent.status
    };

    this.editMode = true;
    this.editedAgentIndex = index;
    this.showForm = true;
  }

  deactivateAgent(index: number): void {
  const confirmDeactivate = confirm('Czy na pewno chcesz dezaktywować tego agenta?');

  if (!confirmDeactivate) {
    return;
  }

  this.agents[index].status = 'Nieaktywny';
  }

  activateAgent(index: number): void {
  const confirmActivate = confirm('Czy na pewno chcesz ponownie aktywować tego agenta?');

  if (!confirmActivate) {
    return;
  }

  this.agents[index].status = 'Aktywny';
  }

  cancel(): void {
    this.clearForm();
    this.showForm = false;
    this.editMode = false;
    this.editedAgentIndex = null;
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