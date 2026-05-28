import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, NgIf],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css'
})
export class ChangePassword {
  private changePasswordApiUrl = 'http://localhost:4000/api/auth/change-password';

  newPassword = '';
  repeatPassword = '';
  errorMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  changePassword(): void {
    this.errorMessage = '';

    if (!this.newPassword || !this.repeatPassword) {
      this.errorMessage = 'Uzupełnij oba pola hasła.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Hasło musi mieć co najmniej 6 znaków.';
      return;
    }

    if (this.newPassword !== this.repeatPassword) {
      this.errorMessage = 'Hasła nie są takie same.';
      return;
    }

    const userId = localStorage.getItem('userId');

    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.patch(this.changePasswordApiUrl, {
      userId: Number(userId),
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        const userJson = localStorage.getItem('user');

        if (userJson) {
          const user = JSON.parse(userJson);
          user.mustChangePassword = false;
          localStorage.setItem('user', JSON.stringify(user));
        }

        this.router.navigate(['/agent']);
      },
      error: (error) => {
        console.error('Błąd zmiany hasła:', error);

        this.errorMessage =
          error.error?.error || 'Nie udało się zmienić hasła.';
      }
    });
  }
}