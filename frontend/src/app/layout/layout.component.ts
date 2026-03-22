import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule, MatListModule, MatTooltipModule],
  template: `
    <div class="app-layout">
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo-area">
            <div class="logo-icon"><mat-icon>psychology</mat-icon></div>
            <span class="logo-text" *ngIf="!sidebarCollapsed">TriageAI</span>
          </div>
          <button mat-icon-button class="collapse-btn" (click)="sidebarCollapsed = !sidebarCollapsed">
            <mat-icon>{{ sidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" [matTooltip]="sidebarCollapsed ? 'Dashboard' : ''" matTooltipPosition="right">
            <mat-icon>dashboard</mat-icon>
            <span *ngIf="!sidebarCollapsed">Dashboard</span>
          </a>
          <a routerLink="/tickets" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item" [matTooltip]="sidebarCollapsed ? 'Chamados' : ''" matTooltipPosition="right">
            <mat-icon>confirmation_number</mat-icon>
            <span *ngIf="!sidebarCollapsed">Chamados</span>
          </a>
          <a routerLink="/tickets/new" routerLinkActive="active" class="nav-item" [matTooltip]="sidebarCollapsed ? 'Novo Chamado' : ''" matTooltipPosition="right">
            <mat-icon>add_circle_outline</mat-icon>
            <span *ngIf="!sidebarCollapsed">Novo Chamado</span>
          </a>
          <a routerLink="/settings/repos" routerLinkActive="active" class="nav-item" [matTooltip]="sidebarCollapsed ? 'Repositorios' : ''" matTooltipPosition="right">
            <mat-icon>settings</mat-icon>
            <span *ngIf="!sidebarCollapsed">Repositorios</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-area" *ngIf="!sidebarCollapsed">
            <div class="avatar">{{ userInitials }}</div>
            <div class="user-info">
              <span class="user-name">{{ userName }}</span>
              <span class="user-role">{{ userRole }}</span>
            </div>
          </div>
          <button mat-icon-button (click)="logout()" class="logout-btn" matTooltip="Sair" matTooltipPosition="right">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; min-height: 100vh; }

    .sidebar {
      width: 260px;
      background: #1e1b4b;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
    }

    .sidebar.collapsed { width: 72px; }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .logo-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .logo-text { color: white; font-size: 20px; font-weight: 700; white-space: nowrap; }
    .collapse-btn { color: rgba(255,255,255,0.5); }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
    .nav-item.active { background: rgba(99,102,241,0.3); color: white; }
    .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-area { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }

    .avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 13px; font-weight: 600;
      flex-shrink: 0;
    }

    .user-info { display: flex; flex-direction: column; min-width: 0; }
    .user-name { color: white; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .logout-btn { color: rgba(255,255,255,0.5); flex-shrink: 0; }
    .logout-btn:hover { color: #ef4444; }

    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 32px;
      background: var(--bg);
      min-height: 100vh;
      transition: margin-left 0.3s ease;
    }

    .sidebar.collapsed + .main-content,
    .sidebar.collapsed ~ .main-content { margin-left: 72px; }

    @media (max-width: 768px) {
      .sidebar { width: 72px; }
      .sidebar .logo-text, .sidebar .user-area span, .sidebar .nav-item span { display: none; }
      .sidebar .user-area { display: none; }
      .collapse-btn { display: none; }
      .main-content { margin-left: 72px; padding: 16px; }
    }
  `]
})
export class LayoutComponent {
  userName: string;
  userRole: string;
  userInitials: string;
  sidebarCollapsed = false;

  constructor(private authService: AuthService, private router: Router) {
    const user = this.authService.getUser();
    this.userName = user?.name || '';
    this.userRole = user?.role || '';
    this.userInitials = this.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
