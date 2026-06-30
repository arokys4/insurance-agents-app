import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../config/api.config';

interface AuditLog {
  id: number;
  userId: number | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  createdAt: string;
  userName?: string | null;
}

@Component({
  selector: 'app-admin-audit-logs',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-audit-logs.html',
  styleUrl: './admin-audit-logs.css'
})
export class AdminAuditLogs implements OnInit {
  private auditLogsApiUrl = `${API_BASE_URL}/audit-logs`;

  logs: AuditLog[] = [];
  searchText = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  get filteredLogs(): AuditLog[] {
    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      return this.logs;
    }

    return this.logs.filter((log) => {
      const values = [
        this.formatDate(log.createdAt),
        this.formatUser(log),
        this.formatRole(log.userRole),
        this.formatAction(log.action),
        this.formatEntityType(log.entityType),
        log.description,
        log.action,
        log.entityType
      ];

      return values.some(value =>
        String(value || '').toLowerCase().includes(search)
      );
    });
  }

  loadAuditLogs(): void {
    this.http.get<AuditLog[]>(this.auditLogsApiUrl).subscribe({
      next: (logs) => {
        this.logs = logs;
      },
      error: (error) => {
        console.error('Błąd pobierania audytu zmian:', error);
        alert('Nie udało się pobrać audytu zmian.');
      }
    });
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('pl-PL');
  }

  formatUser(log: AuditLog): string {
    if (log.userName) {
      return log.userName;
    }

    if (log.userId) {
      return `Użytkownik ID ${log.userId}`;
    }

    return 'Nieznany użytkownik';
  }

  formatRole(role: string | null): string {
    if (role === 'ADMIN') {
      return 'Administrator';
    }

    if (role === 'AGENT') {
      return 'Agent';
    }

    return '-';
  }

  formatAction(action: string): string {
    const actionLabels: { [key: string]: string } = {
      CREATE_AGENT: 'Dodanie agenta',
      UPDATE_AGENT: 'Edycja agenta',
      UPDATE_AGENT_WITH_PASSWORD: 'Edycja agenta i hasła',
      DELETE_AGENT: 'Usunięcie agenta',

      CREATE_MEETING: 'Dodanie spotkania',
      UPDATE_MEETING: 'Edycja spotkania',
      UPDATE_MEETING_STATUS: 'Zmiana statusu spotkania',
      DELETE_MEETING: 'Usunięcie spotkania',

      CREATE_NOTE: 'Dodanie notatki',
      UPDATE_NOTE: 'Edycja notatki',
      DELETE_NOTE: 'Usunięcie notatki',

      UPLOAD_ATTACHMENT: 'Dodanie załącznika',
      DELETE_ATTACHMENT: 'Usunięcie załącznika',

      CREATE_WORK_TIME: 'Dodanie czasu pracy',
      UPDATE_WORK_TIME: 'Edycja czasu pracy',
      DELETE_WORK_TIME: 'Usunięcie czasu pracy',

      DEMO_DATA_SEED: 'Przygotowanie danych demo'
    };

    return actionLabels[action] || action;
  }

  formatEntityType(entityType: string): string {
    const entityLabels: { [key: string]: string } = {
      AGENT: 'Agent',
      MEETING: 'Spotkanie',
      MEETING_NOTE: 'Notatka',
      MEETING_ATTACHMENT: 'Załącznik',
      WORK_TIME_ENTRY: 'Czas pracy',
      SYSTEM: 'System'
    };

    return entityLabels[entityType] || entityType;
  }

  clearSearch(): void {
    this.searchText = '';
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
