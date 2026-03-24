import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'tickets', loadComponent: () => import('./tickets/ticket-list/ticket-list.component').then(m => m.TicketListComponent) },
      { path: 'tickets/new', loadComponent: () => import('./tickets/ticket-form/ticket-form.component').then(m => m.TicketFormComponent) },
      { path: 'tickets/board', loadComponent: () => import('./tickets/ticket-board/ticket-board.component').then(m => m.TicketBoardComponent) },
      { path: 'tickets/:id', loadComponent: () => import('./tickets/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent) },
      { path: 'settings/repos', loadComponent: () => import('./settings/repo-config/repo-config.component').then(m => m.RepoConfigComponent) },
      { path: 'settings/training', loadComponent: () => import('./settings/ai-training/ai-training.component').then(m => m.AiTrainingComponent) },
      { path: 'config', loadComponent: () => import('./settings/config/config.component').then(m => m.ConfigComponent) },
      { path: 'sistemas', loadComponent: () => import('./settings/sistemas/sistemas.component').then(m => m.SistemasComponent) },
      { path: 'tutorial', loadComponent: () => import('./settings/tutorial/tutorial.component').then(m => m.TutorialComponent) },
      { path: 'profile', loadComponent: () => import('./settings/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },
  { path: '**', redirectTo: 'login' },
];
