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

  newAgent = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Aktywny'
  };

  constructor(private router: Router) {}

  showAddAgentForm(): void {
    this.showForm = true;
  }

  addAgent(): void {
    if (
      !this.newAgent.firstName ||
      !this.newAgent.lastName ||
      !this.newAgent.email ||
      !this.newAgent.phone
    ) {
      alert('Uzupełnij wszystkie pola formularza.');
      return;
    }

    this.agents.push({
      firstName: this.newAgent.firstName,
      lastName: this.newAgent.lastName,
      email: this.newAgent.email,
      phone: this.newAgent.phone,
      status: this.newAgent.status
    });

    this.clearForm();
    this.showForm = false;
  }

  cancel(): void {
    this.clearForm();
    this.showForm = false;
  }

  clearForm(): void {
    this.newAgent = {
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