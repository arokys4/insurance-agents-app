import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIf } from '@angular/common';

interface LoginResponse {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
  };
}

@Component({
  selector: 'app-login',
  imports: [FormsModule, NgIf],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private loginApiUrl = 'http://localhost:4000/api/auth/login';

  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  login(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Podaj adres e-mail i hasło.';
      return;
    }

    const payload = {
      email: this.email,
      password: this.password
    };

    this.http.post<LoginResponse>(this.loginApiUrl, payload).subscribe({
      next: (response) => {
        const user = response.user;

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('role', user.role);
        localStorage.setItem('userId', String(user.id));

        if (user.mustChangePassword) {
          this.router.navigate(['/change-password']);
          return;
        }

        if (user.role === 'ADMIN') {
          this.router.navigate(['/admin']);
          return;
        }

        if (user.role === 'AGENT') {
          this.router.navigate(['/agent']);
          return;
        }

        this.errorMessage = 'Nieznana rola użytkownika.';
      },
      error: (error) => {
        console.error('Błąd logowania:', error);

        this.errorMessage =
          error.error?.error || 'Nie udało się zalogować użytkownika.';
      }
    });
  }
}