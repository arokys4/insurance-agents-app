import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, NgIf],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css'
})
export class ChangePassword {
  private authApiUrl = `${API_BASE_URL}/auth`;

  newPassword = '';
  confirmPassword = '';

  errorMessage = '';
  successMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  changePassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const userJson = localStorage.getItem('user');

    if (!userJson) {
      this.errorMessage = 'Brak danych zalogowanego użytkownika.';
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(userJson);

    const newPasswordValue = this.newPassword.trim();
    const confirmPasswordValue = this.confirmPassword.trim();

    if (!newPasswordValue || !confirmPasswordValue) {
      this.errorMessage = 'Uzupełnij wszystkie pola.';
      return;
    }

    if (newPasswordValue !== confirmPasswordValue) {
      this.errorMessage = 'Hasła nie są takie same.';
      return;
    }

    const passwordError = this.validatePasswordStrength(newPasswordValue);

    if (passwordError) {
      this.errorMessage = passwordError;
      return;
    }

    const payload = {
      newPassword: newPasswordValue,
      confirmPassword: confirmPasswordValue
    };

    this.http.post(`${this.authApiUrl}/change-password`, payload).subscribe({
      next: () => {
        const updatedUser = {
          ...user,
          mustChangePassword: false
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));

        this.successMessage = 'Hasło zostało zmienione.';

        setTimeout(() => {
          if (updatedUser.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/agent']);
          }
        }, 700);
      },
      error: (error) => {
        console.error('Błąd zmiany hasła:', error);

        this.errorMessage =
          error.error?.error || 'Nie udało się zmienić hasła.';
      }
    });
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

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
