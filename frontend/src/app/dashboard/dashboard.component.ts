import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStats } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, DatePipe],
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

    <div *ngIf="stats" class="dashboard-content">

      <!-- Row 1: Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card gradient-blue">
          <div class="card-icon-wrap"><mat-icon>confirmation_number</mat-icon></div>
          <div class="card-info">
            <span class="card-value">{{ stats.totalTickets }}</span>
            <span class="card-label">Total Tickets</span>
          </div>
        </div>

        <div class="summary-card gradient-green">
          <div class="card-icon-wrap"><mat-icon>today</mat-icon></div>
          <div class="card-info">
            <span class="card-value">{{ stats.ticketsHoje }}</span>
            <span class="card-label">Hoje</span>
          </div>
        </div>

        <div class="summary-card gradient-orange">
          <div class="card-icon-wrap"><mat-icon>date_range</mat-icon></div>
          <div class="card-info">
            <span class="card-value">{{ stats.ticketsSemana }}</span>
            <span class="card-label">Esta Semana</span>
          </div>
        </div>

        <div class="summary-card gradient-purple">
          <div class="card-icon-wrap"><mat-icon>merge_type</mat-icon></div>
          <div class="card-info">
            <span class="card-value">{{ stats.totalPRs }}</span>
            <span class="card-label">PRs Criados</span>
          </div>
        </div>

        <div class="summary-card gradient-teal">
          <div class="card-icon-wrap"><mat-icon>psychology</mat-icon></div>
          <div class="card-info">
            <span class="card-value">{{ (stats.mediaAiScore * 100).toFixed(0) }}%</span>
            <span class="card-label">Score Medio IA</span>
          </div>
        </div>
      </div>

      <!-- Row 2: Charts -->
      <div class="charts-grid">
        <!-- Por Categoria -->
        <div class="chart-card">
          <h3><mat-icon>category</mat-icon> Por Categoria</h3>
          <div class="chart-items">
            <div class="chart-item" *ngFor="let item of categoriaEntries">
              <div class="chart-item-header">
                <span class="chart-item-label">{{ item[0] }}</span>
                <span class="chart-item-value">{{ item[1] }} <span class="pct">({{ getPercentage(item[1]).toFixed(0) }}%)</span></span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" [class]="'bar-cat-' + item[0].toLowerCase()"
                     [style.width.%]="getPercentage(item[1])"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Por Status -->
        <div class="chart-card">
          <h3><mat-icon>pending_actions</mat-icon> Por Status</h3>
          <div class="status-stack">
            <div class="status-badge-row" *ngFor="let item of statusEntries">
              <div class="status-circle" [class]="'circle-' + item[0].toLowerCase()">
                {{ item[1] }}
              </div>
              <span class="status-label">{{ formatStatus(item[0]) }}</span>
            </div>
          </div>
        </div>

        <!-- Por Prioridade -->
        <div class="chart-card">
          <h3><mat-icon>priority_high</mat-icon> Por Prioridade</h3>
          <div class="chart-items">
            <div class="chart-item" *ngFor="let item of prioridadeEntries">
              <div class="chart-item-header">
                <span class="chart-item-label">{{ formatPrioridade(item[0]) }}</span>
                <span class="chart-item-value">{{ item[1] }}</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" [class]="'bar-pri-' + item[0].toLowerCase()"
                     [style.width.%]="getPercentage(item[1])"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 3: AI & PR Info -->
      <div class="info-grid">
        <!-- Modelo IA -->
        <div class="chart-card">
          <h3><mat-icon>smart_toy</mat-icon> Modelo IA</h3>
          <div *ngIf="stats.iaModelVersion === 0" class="ia-offline">
            <mat-icon>cloud_off</mat-icon>
            <span>IA offline</span>
          </div>
          <div *ngIf="stats.iaModelVersion !== 0" class="ia-info">
            <div class="ia-version-badge">v{{ stats.iaModelVersion }}</div>
            <div class="ia-metric">
              <div class="ia-metric-header">
                <span>Accuracy</span>
                <span class="ia-metric-value">{{ (stats.iaAccuracy * 100).toFixed(1) }}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill accent" [style.width.%]="stats.iaAccuracy * 100"></div>
              </div>
            </div>
            <div class="ia-metric">
              <div class="ia-metric-header">
                <span>F1 Score</span>
                <span class="ia-metric-value">{{ (stats.iaF1Score * 100).toFixed(1) }}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill primary" [style.width.%]="stats.iaF1Score * 100"></div>
              </div>
            </div>
            <div class="ia-detail-row">
              <span class="ia-detail-label">Dataset</span>
              <span class="ia-detail-value">{{ stats.iaDatasetSize | number }}</span>
            </div>
            <div class="ia-detail-row">
              <span class="ia-detail-label">Ultimo treino</span>
              <span class="ia-detail-value">{{ stats.iaTrainedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
        </div>

        <!-- Atividade de PRs -->
        <div class="chart-card">
          <h3><mat-icon>merge_type</mat-icon> Atividade de PRs</h3>
          <div *ngIf="stats.totalPRs === 0" class="pr-empty">
            <mat-icon>inbox</mat-icon>
            <span>Nenhum PR encontrado</span>
          </div>
          <div *ngIf="stats.totalPRs > 0" class="pr-info">
            <div class="pr-total">{{ stats.totalPRs }} <span>PRs no total</span></div>
            <div class="pr-bars">
              <div class="pr-bar-row">
                <span class="pr-bar-label">Merged</span>
                <div class="bar-bg flex-bar">
                  <div class="bar-fill bar-merged" [style.width.%]="getPrPercentage(stats.prsMerged)"></div>
                </div>
                <span class="pr-bar-count">{{ stats.prsMerged }}</span>
              </div>
              <div class="pr-bar-row">
                <span class="pr-bar-label">Open</span>
                <div class="bar-bg flex-bar">
                  <div class="bar-fill bar-open" [style.width.%]="getPrPercentage(stats.prsOpen)"></div>
                </div>
                <span class="pr-bar-count">{{ stats.prsOpen }}</span>
              </div>
              <div class="pr-bar-row">
                <span class="pr-bar-label">Closed</span>
                <div class="bar-bg flex-bar">
                  <div class="bar-fill bar-closed" [style.width.%]="getPrPercentage(stats.prsClosed)"></div>
                </div>
                <span class="pr-bar-count">{{ stats.prsClosed }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 4: Recent Tickets Table -->
      <div class="chart-card table-card">
        <h3><mat-icon>list_alt</mat-icon> Tickets Recentes</h3>
        <div class="table-wrapper" *ngIf="stats.ticketsRecentes && stats.ticketsRecentes.length > 0">
          <table mat-table [dataSource]="stats.ticketsRecentes.slice(0, 10)" class="tickets-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let t">{{ t.id }}</td>
            </ng-container>
            <ng-container matColumnDef="titulo">
              <th mat-header-cell *matHeaderCellDef>Titulo</th>
              <td mat-cell *matCellDef="let t" class="col-titulo">{{ t.titulo }}</td>
            </ng-container>
            <ng-container matColumnDef="categoria">
              <th mat-header-cell *matHeaderCellDef>Categoria</th>
              <td mat-cell *matCellDef="let t">
                <span class="badge" [class]="'badge-cat-' + (t.categoriaPredita || t.categoria || '').toLowerCase()">{{ t.categoriaPredita || t.categoria }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="prioridade">
              <th mat-header-cell *matHeaderCellDef>Prioridade</th>
              <td mat-cell *matCellDef="let t">
                <span class="badge" [class]="'badge-pri-' + (t.prioridadeSugerida || t.prioridade || '').toLowerCase()">{{ t.prioridadeSugerida || t.prioridade }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let t">
                <span class="badge" [class]="'badge-status-' + (t.status || '').toLowerCase()">{{ formatStatus(t.status) }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>Score IA</th>
              <td mat-cell *matCellDef="let t">{{ t.aiScore ? (t.aiScore * 100).toFixed(0) + '%' : '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="data">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let t">{{ t.criadoEm | date:'dd/MM/yyyy' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                class="clickable-row" (click)="goToTicket(row.id)"></tr>
          </table>
        </div>
        <div *ngIf="!stats.ticketsRecentes || stats.ticketsRecentes.length === 0" class="pr-empty">
          <mat-icon>inbox</mat-icon>
          <span>Nenhum ticket recente</span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --primary: #6366f1;
      --accent: #06b6d4;
      --bg-card: #ffffff;
      --border: #e5e7eb;
      --text: #1e293b;
      --text-secondary: #64748b;
      --radius: 12px;
    }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;
    }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; color: var(--text); }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }
    .new-btn { height: 44px; border-radius: 10px !important; font-weight: 600; }

    /* Row 1: Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .summary-card {
      border-radius: var(--radius);
      padding: 22px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      color: #fff;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.14);
    }

    .gradient-blue   { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .gradient-green  { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .gradient-orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .gradient-purple { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
    .gradient-teal   { background: linear-gradient(135deg, #14b8a6, #0d9488); }

    .card-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.20);
    }
    .card-icon-wrap mat-icon { font-size: 26px; width: 26px; height: 26px; color: #fff; }

    .card-info { display: flex; flex-direction: column; }
    .card-value { font-size: 28px; font-weight: 700; line-height: 1; }
    .card-label { font-size: 13px; opacity: 0.85; margin-top: 4px; font-weight: 500; }

    /* Row 2: Charts */
    .charts-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px;
    }

    .chart-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .chart-card h3 {
      font-size: 16px; font-weight: 600; margin: 0 0 20px;
      display: flex; align-items: center; gap: 8px; color: var(--text);
    }
    .chart-card h3 mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--primary); }

    .chart-items { display: flex; flex-direction: column; gap: 14px; }
    .chart-item-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .chart-item-label { font-size: 13px; font-weight: 500; color: var(--text); }
    .chart-item-value { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .pct { font-weight: 400; opacity: 0.7; }

    .bar-bg { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; min-width: 4px; }

    .bar-cat-tecnico        { background: #3b82f6; }
    .bar-cat-financeiro     { background: #ec4899; }
    .bar-cat-comercial      { background: #8b5cf6; }
    .bar-cat-administrativo { background: #14b8a6; }
    .bar-cat-outros         { background: #94a3b8; }

    .bar-pri-alta  { background: #ef4444; }
    .bar-pri-media { background: #f59e0b; }
    .bar-pri-baixa { background: #22c55e; }

    /* Status badges stacked */
    .status-stack { display: flex; flex-direction: column; gap: 14px; }
    .status-badge-row { display: flex; align-items: center; gap: 14px; }
    .status-circle {
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .circle-aberto       { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .circle-em_andamento { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .circle-resolvido    { background: linear-gradient(135deg, #10b981, #059669); }
    .circle-fechado      { background: linear-gradient(135deg, #94a3b8, #64748b); }
    .status-label { font-size: 14px; color: var(--text); font-weight: 500; }

    /* Row 3: Info grid */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;
    }

    /* IA section */
    .ia-offline {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 32px 0; color: #94a3b8;
    }
    .ia-offline mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .ia-offline span { font-size: 14px; font-weight: 500; }

    .ia-info { display: flex; flex-direction: column; gap: 16px; }
    .ia-version-badge {
      display: inline-flex; align-self: flex-start;
      background: var(--primary); color: #fff;
      padding: 4px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
    }

    .ia-metric { display: flex; flex-direction: column; gap: 6px; }
    .ia-metric-header { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); }
    .ia-metric-value { font-weight: 600; color: var(--text); }

    .progress-bar-bg {
      height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; border-radius: 4px; transition: width 0.6s ease;
    }
    .progress-bar-fill.accent  { background: var(--accent); }
    .progress-bar-fill.primary { background: var(--primary); }

    .ia-detail-row {
      display: flex; justify-content: space-between; font-size: 13px;
      padding: 8px 0; border-top: 1px solid var(--border);
    }
    .ia-detail-label { color: var(--text-secondary); }
    .ia-detail-value { font-weight: 600; color: var(--text); }

    /* PR section */
    .pr-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 32px 0; color: #94a3b8;
    }
    .pr-empty mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .pr-empty span { font-size: 14px; font-weight: 500; }

    .pr-info { display: flex; flex-direction: column; gap: 20px; }
    .pr-total { font-size: 32px; font-weight: 700; color: var(--text); }
    .pr-total span { font-size: 14px; font-weight: 400; color: var(--text-secondary); }

    .pr-bars { display: flex; flex-direction: column; gap: 12px; }
    .pr-bar-row { display: flex; align-items: center; gap: 12px; }
    .pr-bar-label { width: 60px; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
    .flex-bar { flex: 1; }
    .pr-bar-count { width: 32px; text-align: right; font-size: 13px; font-weight: 600; color: var(--text); }
    .bar-merged { background: #22c55e; }
    .bar-open   { background: #3b82f6; }
    .bar-closed { background: #ef4444; }

    /* Row 4: Table */
    .table-card { margin-bottom: 28px; }
    .table-wrapper { overflow-x: auto; }

    .tickets-table {
      width: 100%;
      border-collapse: collapse;
    }
    .tickets-table th {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      border-bottom: 2px solid var(--border);
      text-align: left;
    }
    .tickets-table td {
      font-size: 14px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    .col-titulo { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .clickable-row { cursor: pointer; transition: background 0.15s; }
    .clickable-row:hover { background: #f8fafc; }

    /* Badges */
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .badge-cat-tecnico        { background: #eff6ff; color: #2563eb; }
    .badge-cat-financeiro     { background: #fdf2f8; color: #db2777; }
    .badge-cat-comercial      { background: #f5f3ff; color: #7c3aed; }
    .badge-cat-administrativo { background: #f0fdfa; color: #0d9488; }
    .badge-cat-outros         { background: #f8fafc; color: #64748b; }

    .badge-pri-alta  { background: #fef2f2; color: #dc2626; }
    .badge-pri-media { background: #fffbeb; color: #d97706; }
    .badge-pri-baixa { background: #f0fdf4; color: #16a34a; }

    .badge-status-aberto       { background: #eff6ff; color: #2563eb; }
    .badge-status-em_andamento { background: #fffbeb; color: #d97706; }
    .badge-status-resolvido    { background: #f0fdf4; color: #16a34a; }
    .badge-status-fechado      { background: #f8fafc; color: #64748b; }

    /* Responsive */
    @media (max-width: 1280px) {
      .summary-cards { grid-template-columns: repeat(3, 1fr); }
      .charts-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 1024px) {
      .summary-cards { grid-template-columns: repeat(2, 1fr); }
      .info-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .page-header { flex-direction: column; gap: 16px; }
      .summary-cards { grid-template-columns: 1fr; }
      .charts-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  categoriaEntries: [string, number][] = [];
  prioridadeEntries: [string, number][] = [];
  statusEntries: [string, number][] = [];
  displayedColumns = ['id', 'titulo', 'categoria', 'prioridade', 'status', 'score', 'data'];

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe(stats => {
      this.stats = stats;
      this.categoriaEntries = Object.entries(stats.byCategoria);
      this.prioridadeEntries = Object.entries(stats.byPrioridade);
      this.statusEntries = Object.entries(stats.byStatus);
    });
  }

  getPercentage(value: number): number {
    if (!this.stats || this.stats.totalTickets === 0) return 0;
    return Math.max((value / this.stats.totalTickets) * 100, 3);
  }

  getPrPercentage(value: number): number {
    if (!this.stats || this.stats.totalPRs === 0) return 0;
    return Math.max((value / this.stats.totalPRs) * 100, 3);
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

  formatPrioridade(pri: string): string {
    const map: Record<string, string> = {
      'ALTA': 'Alta',
      'MEDIA': 'Media',
      'BAIXA': 'Baixa'
    };
    return map[pri] || pri;
  }

  goToTicket(id: number): void {
    this.router.navigate(['/tickets', id]);
  }
}
