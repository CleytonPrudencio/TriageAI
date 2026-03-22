import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStats } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="page-subtitle">Visao geral dos chamados e metricas</p>
      </div>
      <a mat-raised-button color="primary" routerLink="/tickets/new" class="new-btn">
        <mat-icon>add</mat-icon> Novo Chamado
      </a>
    </div>

    <div *ngIf="stats">
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon total"><mat-icon>confirmation_number</mat-icon></div>
          <div class="card-info">
            <span class="card-value">{{ stats.totalTickets }}</span>
            <span class="card-label">Total de Chamados</span>
          </div>
        </div>

        <div class="summary-card" *ngFor="let item of prioridadeEntries">
          <div class="card-icon" [class]="'icon-' + item[0].toLowerCase()">
            <mat-icon>{{ item[0] === 'ALTA' ? 'keyboard_double_arrow_up' : item[0] === 'MEDIA' ? 'drag_handle' : 'keyboard_double_arrow_down' }}</mat-icon>
          </div>
          <div class="card-info">
            <span class="card-value">{{ item[1] }}</span>
            <span class="card-label">{{ item[0] === 'ALTA' ? 'Prioridade Alta' : item[0] === 'MEDIA' ? 'Prioridade Media' : 'Prioridade Baixa' }}</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- By Category -->
        <div class="chart-card">
          <h3><mat-icon>category</mat-icon> Por Categoria</h3>
          <div class="chart-items">
            <div class="chart-item" *ngFor="let item of categoriaEntries">
              <div class="chart-item-header">
                <span class="chart-item-label">{{ item[0] }}</span>
                <span class="chart-item-value">{{ item[1] }}</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" [class]="'bar-cat-' + item[0].toLowerCase()"
                     [style.width.%]="getPercentage(item[1])"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- By Status -->
        <div class="chart-card">
          <h3><mat-icon>pending_actions</mat-icon> Por Status</h3>
          <div class="status-grid">
            <div class="status-item" *ngFor="let item of statusEntries">
              <div class="status-circle" [class]="'circle-' + item[0].toLowerCase()">
                {{ item[1] }}
              </div>
              <span class="status-label">{{ formatStatus(item[0]) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;
    }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }
    .new-btn { height: 44px; border-radius: 10px !important; font-weight: 600; }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .card-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .card-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .card-icon.total { background: #eff6ff; color: #2563eb; }
    .card-icon.icon-alta { background: #fef2f2; color: #dc2626; }
    .card-icon.icon-media { background: #fffbeb; color: #d97706; }
    .card-icon.icon-baixa { background: #f0fdf4; color: #16a34a; }

    .card-info { display: flex; flex-direction: column; }
    .card-value { font-size: 28px; font-weight: 700; line-height: 1; }
    .card-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

    .charts-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    }

    .chart-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px;
    }
    .chart-card h3 {
      font-size: 16px; font-weight: 600; margin: 0 0 24px;
      display: flex; align-items: center; gap: 8px;
    }
    .chart-card h3 mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--primary); }

    .chart-items { display: flex; flex-direction: column; gap: 16px; }
    .chart-item-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .chart-item-label { font-size: 13px; font-weight: 500; }
    .chart-item-value { font-size: 13px; font-weight: 600; }

    .bar-bg { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; min-width: 4px; }

    .bar-cat-tecnico { background: #3b82f6; }
    .bar-cat-financeiro { background: #ec4899; }
    .bar-cat-comercial { background: #8b5cf6; }
    .bar-cat-administrativo { background: #14b8a6; }
    .bar-cat-outros { background: #94a3b8; }

    .status-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .status-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .status-circle {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700; color: white;
    }
    .circle-aberto { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .circle-em_andamento { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .circle-resolvido { background: linear-gradient(135deg, #10b981, #059669); }
    .circle-fechado { background: linear-gradient(135deg, #94a3b8, #64748b); }
    .status-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; text-align: center; }

    @media (max-width: 1024px) {
      .summary-cards { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .page-header { flex-direction: column; gap: 16px; }
      .summary-cards { grid-template-columns: 1fr; }
      .charts-grid { grid-template-columns: 1fr; }
      .status-grid { grid-template-columns: repeat(4, 1fr); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  categoriaEntries: [string, number][] = [];
  prioridadeEntries: [string, number][] = [];
  statusEntries: [string, number][] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe(stats => {
      this.stats = stats;
      this.categoriaEntries = Object.entries(stats.byCategoria);
      this.prioridadeEntries = Object.entries(stats.byPrioridade);
      this.statusEntries = Object.entries(stats.byStatus);
    });
  }

  getPercentage(value: number): number {
    if (!this.stats) return 0;
    return Math.max((value / this.stats.totalTickets) * 100, 3);
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      'ABERTO': 'Aberto',
      'EM_ANDAMENTO': 'Em Andamento',
      'RESOLVIDO': 'Resolvido',
      'FECHADO': 'Fechado'
    };
    return map[status] || status;
  }
}
