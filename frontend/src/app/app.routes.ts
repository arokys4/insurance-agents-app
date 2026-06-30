import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './pages/agent-dashboard/agent-dashboard';
import { adminGuard, agentGuard, authGuard } from './guards/auth.guard';
import { AdminAgents } from './pages/admin-agents/admin-agents';
import { AdminMeetings } from './pages/admin-meetings/admin-meetings';
import { AdminCalendar } from './pages/admin-calendar/admin-calendar';
import { AdminWorkTime } from './pages/admin-work-time/admin-work-time';
import { ChangePassword } from './pages/change-password/change-password';
import { AgentCalendar } from './pages/agent-calendar/agent-calendar';
import { AgentWorkTime } from './pages/agent-work-time/agent-work-time';
import { AgentDocuments } from './pages/agent-documents/agent-documents';
import { AdminAuditLogs } from './pages/admin-audit-logs/admin-audit-logs';
import { MyAccount } from './pages/my-account/my-account';

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
    path: 'change-password',
    component: ChangePassword,
    canActivate: [authGuard]
  },
  {
    path: 'my-account',
    component: MyAccount,
    canActivate: [authGuard]
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
    path: 'admin/meetings',
    component: AdminMeetings,
    canActivate: [adminGuard]
  },
  {
    path: 'agent',
    component: AgentDashboard,
    canActivate: [agentGuard]
  },
  {
    path: 'agent/calendar',
    component: AgentCalendar,
    canActivate: [agentGuard]
  },
  {
    path: 'agent/work-time',
    component: AgentWorkTime,
    canActivate: [agentGuard]
  },
  {
    path: 'agent/documents',
    component: AgentDocuments,
    canActivate: [agentGuard]
  },
  {
    path: 'admin/calendar',
    component: AdminCalendar,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/work-time',
    component: AdminWorkTime,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/audit-logs',
    component: AdminAuditLogs,
    canActivate: [adminGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
