import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './pages/agent-dashboard/agent-dashboard';
import { adminGuard, agentGuard } from './guards/auth.guard';
import { AdminAgents } from './pages/admin-agents/admin-agents';


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
    component: AdminDashboard,
    canActivate: [adminGuard]
  },
   {
    path: 'admin/agents',
    component: AdminAgents,
    canActivate: [adminGuard]
  },
  {
    path: 'agent',
    component: AgentDashboard,
    canActivate: [agentGuard]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];