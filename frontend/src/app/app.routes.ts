import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './pages/agent-dashboard/agent-dashboard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'admin',
    component: AdminDashboard
  },
  {
    path: 'agent',
    component: AgentDashboard
  }
];