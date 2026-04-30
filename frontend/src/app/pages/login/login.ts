import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [FormsModule, NgIf],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private router: Router) {}

  login(): void {
    if (this.email === 'admin@firma.pl' && this.password === 'admin123') {
      localStorage.setItem('role', 'ADMIN');
      this.router.navigate(['/admin']);
      return;
    }

    if (this.email === 'agent@firma.pl' && this.password === 'agent123') {
      localStorage.setItem('role', 'AGENT');
      this.router.navigate(['/agent']);
      return;
    }

    this.errorMessage = 'Nieprawidłowy adres e-mail lub hasło.';
  }
}