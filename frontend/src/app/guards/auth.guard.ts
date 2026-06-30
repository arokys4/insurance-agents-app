import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function hasRole(expectedRole: 'ADMIN' | 'AGENT'): boolean {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (!token || !userJson) {
    return false;
  }

  try {
    const user = JSON.parse(userJson);
    return user.role === expectedRole;
  } catch {
    localStorage.clear();
    return false;
  }
}

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (hasRole('ADMIN')) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (token && userJson) {
    try {
      JSON.parse(userJson);
    } catch {
      localStorage.clear();
      router.navigate(['/login']);
      return false;
    }

    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const agentGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (hasRole('AGENT')) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
