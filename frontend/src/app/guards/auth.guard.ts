import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

interface StoredUser {
  role: 'ADMIN' | 'AGENT';
  mustChangePassword?: boolean;
}

function getStoredUser(): StoredUser | null {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (!token || !userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson);
  } catch {
    localStorage.clear();
    return null;
  }
}

function canActivateRole(expectedRole: 'ADMIN' | 'AGENT', router: Router): boolean {
  const user = getStoredUser();

  if (!user || user.role !== expectedRole) {
    router.navigate(['/login']);
    return false;
  }

  if (user.mustChangePassword) {
    router.navigate(['/change-password']);
    return false;
  }

  return true;
}

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  return canActivateRole('ADMIN', router);
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = getStoredUser();

  if (user) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const agentGuard: CanActivateFn = () => {
  const router = inject(Router);

  return canActivateRole('AGENT', router);
};
