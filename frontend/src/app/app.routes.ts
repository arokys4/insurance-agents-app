import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './pages/agent-dashboard/agent-dashboard';
import { adminGuard, agentGuard } from './guards/auth.guard';
import { AdminAgents } from './pages/admin-agents/admin-agents';
import { AdminMeetings } from './pages/admin-meetings/admin-meetings';
import { AdminCalendar } from './pages/admin-calendar/admin-calendar';
import { AdminWorkTime } from './pages/admin-work-time/admin-work-time';
import { ChangePassword } from './pages/change-password/change-password';
import { AgentCalendar } from './pages/agent-calendar/agent-calendar';


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
    component: ChangePassword
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
    path: '**',
    redirectTo: 'login'
  },

];