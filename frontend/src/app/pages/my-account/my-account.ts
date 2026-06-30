import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../../config/api.config';

interface AccountUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
}

@Component({
  selector: 'app-my-account',
  imports: [FormsModule, NgIf],
  templateUrl: './my-account.html',
  styleUrl: './my-account.css'
})
export class MyAccount implements OnInit {
  private accountApiUrl = `${API_BASE_URL}/auth/me`;

  user: AccountUser | null = null;

  accountForm = {
    firstName: '',
    lastName: '',
    phone: ''
  };

  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isSaving = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccount();
  }

  loadAccount(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<AccountUser>(this.accountApiUrl).subscribe({
      next: (user) => {
        this.user = user;
        this.accountForm = {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone
        };
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Błąd pobierania danych konta:', error);
        this.errorMessage = error.error?.error || 'Nie udało się pobrać danych konta.';
        this.isLoading = false;
      }
    });
  }

  saveAccount(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const firstName = this.accountForm.firstName.trim();
    const lastName = this.accountForm.lastName.trim();
    const phone = this.accountForm.phone.trim();

    if (!firstName || !lastName || !phone) {
      this.errorMessage = 'Uzupełnij imię, nazwisko i telefon.';
      return;
    }

    if (!/^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/.test(firstName)) {
      this.errorMessage = 'Imię może zawierać tylko litery.';
      return;
    }

    if (!/^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/.test(lastName)) {
      this.errorMessage = 'Nazwisko może zawierać tylko litery.';
      return;
    }

    if (!/^[0-9]{9}$/.test(phone)) {
      this.errorMessage = 'Telefon musi składać się dokładnie z 9 cyfr.';
      return;
    }

    this.isSaving = true;

    this.http.patch<AccountUser>(this.accountApiUrl, {
      firstName,
      lastName,
      phone
    }).subscribe({
      next: (user) => {
        this.user = user;
        this.accountForm = {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone
        };

        const storedUser = localStorage.getItem('user');

        if (storedUser) {
          localStorage.setItem('user', JSON.stringify({
            ...JSON.parse(storedUser),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword
          }));
        }

        this.successMessage = 'Dane konta zostały zapisane.';
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Błąd zapisu danych konta:', error);
        this.errorMessage = error.error?.error || 'Nie udało się zapisać danych konta.';
        this.isSaving = false;
      }
    });
  }

  formatRole(role: string): string {
    return role === 'ADMIN' ? 'Administrator' : 'Agent';
  }

  goBack(): void {
    if (this.user?.role === 'ADMIN') {
      this.router.navigate(['/admin']);
      return;
    }

    this.router.navigate(['/agent']);
  }

  goToChangePassword(): void {
    this.router.navigate(['/change-password']);
  }
}
