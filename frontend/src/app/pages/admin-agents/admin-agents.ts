import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-admin-agents',
  imports: [NgFor],
  templateUrl: './admin-agents.html',
  styleUrl: './admin-agents.css'
})
export class AdminAgents {
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

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
