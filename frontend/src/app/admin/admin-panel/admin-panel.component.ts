import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface AdminStats {
  totalEmpresas: number;
  empresasAtivas: number;
  totalUsuarios: number;
  totalTickets: number;
  planoDistribuicao: { [key: string]: number };
}

interface EmpresaAdmin {
  id: number;
  nome: string;
  documento: string;
  plano: string;
  totalUsuarios: number;
  ativo: boolean;
  criadoEm: string;
}

interface UsuarioAdmin {
  id: number;
  name: string;
  email: string;
  role: string;
  criadoEm: string;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Painel Administrativo</h1>
        <p class="page-subtitle">Gerencie empresas, usuarios e planos</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card blue">
          <div class="stat-icon"><mat-icon>business</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.totalEmpresas || 0 }}</span>
            <span class="stat-label">Total Empresas</span>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.empresasAtivas || 0 }}</span>
            <span class="stat-label">Empresas Ativas</span>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon"><mat-icon>people</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.totalUsuarios || 0 }}</span>
            <span class="stat-label">Total Usuarios</span>
          </div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon"><mat-icon>confirmation_number</mat-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.totalTickets || 0 }}</span>
            <span class="stat-label">Total Tickets</span>
          </div>
        </div>
      </div>

      <!-- Plans Distribution -->
      <div class="section-card" *ngIf="stats?.planoDistribuicao">
        <h2 class="section-title"><mat-icon>bar_chart</mat-icon> Distribuicao por Plano</h2>
        <div class="plan-bars">
          <div class="plan-bar-row" *ngFor="let plan of planOrder">
            <span class="plan-bar-label">{{ plan }}</span>
            <div class="plan-bar-track">
              <div class="plan-bar-fill" [class]="'bar-' + plan.toLowerCase().replace('+', '_')"
                   [style.width.%]="getBarWidth(stats!.planoDistribuicao[plan] || 0)"></div>
            </div>
            <span class="plan-bar-count">{{ stats!.planoDistribuicao[plan] || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Empresas Table -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title"><mat-icon>business</mat-icon> Empresas</h2>
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Buscar empresa..." [(ngModel)]="searchTerm" (input)="filterEmpresas()">
          </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Documento</th>
                <th>Plano</th>
                <th>Usuarios</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let empresa of filteredEmpresas">
                <tr [class.expanded]="expandedEmpresaId === empresa.id" (click)="toggleExpand(empresa)">
                  <td class="expand-cell">
                    <mat-icon class="expand-icon" [class.rotated]="expandedEmpresaId === empresa.id">chevron_right</mat-icon>
                  </td>
                  <td class="name-cell">{{ empresa.nome }}</td>
                  <td>{{ maskDocumento(empresa.documento) }}</td>
                  <td>
                    <span class="plan-badge" [class]="'plan-' + empresa.plano.toLowerCase().replace('_', '-')">
                      {{ formatPlanName(empresa.plano) }}
                    </span>
                  </td>
                  <td>{{ empresa.totalUsuarios }}</td>
                  <td>
                    <span class="status-badge" [class.active]="empresa.ativo" [class.inactive]="!empresa.ativo">
                      {{ empresa.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td>{{ formatDate(empresa.criadoEm) }}</td>
                  <td class="actions-cell" (click)="$event.stopPropagation()">
                    <div class="action-group">
                      <div class="plan-select-wrapper" *ngIf="changingPlanId !== empresa.id">
                        <button class="action-btn" (click)="changingPlanId = empresa.id" title="Alterar plano">
                          <mat-icon>swap_horiz</mat-icon>
                        </button>
                      </div>
                      <div class="plan-select-wrapper" *ngIf="changingPlanId === empresa.id">
                        <select [(ngModel)]="selectedPlan" (change)="changePlan(empresa)" class="plan-dropdown">
                          <option value="">Selecionar...</option>
                          <option *ngFor="let p of allPlans" [value]="p">{{ formatPlanName(p) }}</option>
                        </select>
                        <button class="action-btn cancel" (click)="changingPlanId = null" title="Cancelar">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                      <button class="action-btn" [class.toggle-off]="empresa.ativo" [class.toggle-on]="!empresa.ativo"
                              (click)="toggleActive(empresa)" title="{{ empresa.ativo ? 'Desativar' : 'Ativar' }}">
                        <mat-icon>{{ empresa.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
                <!-- Expanded User List -->
                <tr *ngIf="expandedEmpresaId === empresa.id" class="expanded-row">
                  <td colspan="8">
                    <div class="users-panel">
                      <h4><mat-icon>people</mat-icon> Usuarios de {{ empresa.nome }}</h4>
                      <div *ngIf="loadingUsers" class="loading-users">Carregando usuarios...</div>
                      <table class="users-table" *ngIf="!loadingUsers && empresaUsers.length > 0">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Data cadastro</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let user of empresaUsers">
                            <td>{{ user.name }}</td>
                            <td>{{ user.email }}</td>
                            <td><span class="role-badge" [class]="'role-' + user.role.toLowerCase()">{{ user.role }}</span></td>
                            <td>{{ formatDate(user.criadoEm) }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div *ngIf="!loadingUsers && empresaUsers.length === 0" class="no-users">Nenhum usuario encontrado</div>
                    </div>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <div *ngIf="filteredEmpresas.length === 0" class="empty-state">
          <mat-icon>search_off</mat-icon>
          <p>Nenhuma empresa encontrada</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1200px; }

    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; color: var(--text, #111827); }
    .page-subtitle { color: var(--text-secondary, #6b7280); font-size: 15px; margin: 0; }

    /* Stats Cards */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid #e5e7eb;
      border-left: 4px solid;
    }

    .stat-card.blue { border-left-color: #3b82f6; }
    .stat-card.blue .stat-icon { background: #eff6ff; color: #3b82f6; }
    .stat-card.green { border-left-color: #22c55e; }
    .stat-card.green .stat-icon { background: #f0fdf4; color: #22c55e; }
    .stat-card.purple { border-left-color: #8b5cf6; }
    .stat-card.purple .stat-icon { background: #f5f3ff; color: #8b5cf6; }
    .stat-card.orange { border-left-color: #f97316; }
    .stat-card.orange .stat-icon { background: #fff7ed; color: #f97316; }

    .stat-icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 28px; font-weight: 700; color: var(--text, #111827); line-height: 1.2; }
    .stat-label { font-size: 13px; color: var(--text-secondary, #6b7280); margin-top: 2px; }

    /* Section Card */
    .section-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e5e7eb;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #111827);
      margin: 0 0 20px;
    }

    .section-title mat-icon { color: #6366f1; font-size: 22px; width: 22px; height: 22px; }

    /* Plan Bars */
    .plan-bars { display: flex; flex-direction: column; gap: 12px; }

    .plan-bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .plan-bar-label {
      width: 140px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #374151);
      text-align: right;
      flex-shrink: 0;
    }

    .plan-bar-track {
      flex: 1;
      height: 24px;
      background: #f3f4f6;
      border-radius: 6px;
      overflow: hidden;
    }

    .plan-bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.5s ease;
      min-width: 4px;
    }

    .bar-free { background: #9ca3af; }
    .bar-pro { background: #3b82f6; }
    .bar-business { background: #22c55e; }
    .bar-business_claude { background: #8b5cf6; }
    .bar-enterprise { background: #d97706; }

    .plan-bar-count {
      width: 40px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #111827);
      text-align: right;
    }

    /* Search */
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 250px;
    }

    .search-box mat-icon { color: #9ca3af; font-size: 20px; width: 20px; height: 20px; }

    .search-box input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      flex: 1;
      color: var(--text, #111827);
    }

    /* Table */
    .table-wrapper { overflow-x: auto; margin-top: 16px; }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .admin-table thead th {
      text-align: left;
      padding: 12px 14px;
      font-weight: 600;
      color: var(--text-secondary, #6b7280);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
      white-space: nowrap;
    }

    .admin-table tbody tr {
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.15s;
    }

    .admin-table tbody tr:nth-child(odd):not(.expanded-row) { background: #fafbfc; }
    .admin-table tbody tr:hover:not(.expanded-row) { background: #f0f1f5; }
    .admin-table tbody tr.expanded { background: #eef2ff; }

    .admin-table td {
      padding: 12px 14px;
      color: var(--text, #111827);
      white-space: nowrap;
    }

    .name-cell { font-weight: 600; }

    .expand-cell { width: 32px; padding-right: 0 !important; }
    .expand-icon { font-size: 18px; width: 18px; height: 18px; color: #9ca3af; transition: transform 0.2s; }
    .expand-icon.rotated { transform: rotate(90deg); }

    /* Plan Badges */
    .plan-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .plan-free { background: #f3f4f6; color: #6b7280; }
    .plan-pro { background: #dbeafe; color: #1d4ed8; }
    .plan-business { background: #dcfce7; color: #15803d; }
    .plan-business-claude { background: #ede9fe; color: #7c3aed; }
    .plan-enterprise { background: #fef3c7; color: #b45309; }

    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.inactive { background: #fee2e2; color: #dc2626; }

    /* Actions */
    .actions-cell { cursor: default !important; }

    .action-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-btn {
      background: none;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      transition: all 0.15s;
    }

    .action-btn:hover { background: #f3f4f6; color: #111827; }
    .action-btn.cancel:hover { background: #fee2e2; color: #dc2626; }
    .action-btn.toggle-off:hover { background: #fee2e2; color: #dc2626; }
    .action-btn.toggle-on:hover { background: #dcfce7; color: #15803d; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .plan-select-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .plan-dropdown {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      background: white;
      color: var(--text, #111827);
      cursor: pointer;
    }

    /* Expanded Row */
    .expanded-row { cursor: default !important; }
    .expanded-row td { padding: 0 !important; background: #f8f9ff !important; }

    .users-panel {
      padding: 20px 24px;
      border-top: 2px solid #6366f1;
    }

    .users-panel h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #4f46e5;
      margin: 0 0 12px;
    }

    .users-panel h4 mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .users-table th {
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
      color: var(--text-secondary, #6b7280);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e5e7eb;
    }

    .users-table td {
      padding: 8px 12px;
      color: var(--text, #374151);
    }

    .users-table tbody tr:nth-child(odd) { background: rgba(99, 102, 241, 0.04); }

    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-admin { background: #fef3c7; color: #92400e; }
    .role-user { background: #dbeafe; color: #1e40af; }
    .role-manager { background: #e0e7ff; color: #3730a3; }

    .loading-users, .no-users {
      text-align: center;
      padding: 16px;
      color: var(--text-secondary, #9ca3af);
      font-size: 13px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary, #9ca3af);
    }

    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.5; }
    .empty-state p { margin: 8px 0 0; font-size: 14px; }

    /* Responsive */
    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
      .section-header { flex-direction: column; align-items: flex-start; }
      .search-box { min-width: unset; width: 100%; }
      .plan-bar-label { width: 100px; font-size: 11px; }
    }
  `]
})
export class AdminPanelComponent implements OnInit {
  private readonly API = 'http://localhost:8080/api/admin';

  stats: AdminStats | null = null;
  empresas: EmpresaAdmin[] = [];
  filteredEmpresas: EmpresaAdmin[] = [];
  searchTerm = '';

  expandedEmpresaId: number | null = null;
  empresaUsers: UsuarioAdmin[] = [];
  loadingUsers = false;

  changingPlanId: number | null = null;
  selectedPlan = '';

  allPlans = ['FREE', 'PRO', 'BUSINESS', 'BUSINESS_CLAUDE', 'ENTERPRISE'];
  planOrder = ['FREE', 'PRO', 'BUSINESS', 'BUSINESS_CLAUDE', 'ENTERPRISE'];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadEmpresas();
  }

  loadStats(): void {
    this.http.get<AdminStats>(`${this.API}/stats`).subscribe({
      next: (data) => this.stats = data,
      error: () => this.snackBar.open('Erro ao carregar estatisticas', 'OK', { duration: 3000 })
    });
  }

  loadEmpresas(): void {
    this.http.get<EmpresaAdmin[]>(`${this.API}/empresas`).subscribe({
      next: (data) => {
        this.empresas = data;
        this.filterEmpresas();
      },
      error: () => this.snackBar.open('Erro ao carregar empresas', 'OK', { duration: 3000 })
    });
  }

  filterEmpresas(): void {
    const term = this.searchTerm.toLowerCase();
    if (!term) {
      this.filteredEmpresas = [...this.empresas];
    } else {
      this.filteredEmpresas = this.empresas.filter(e =>
        e.nome.toLowerCase().includes(term) ||
        e.documento.includes(term) ||
        e.plano.toLowerCase().includes(term)
      );
    }
  }

  toggleExpand(empresa: EmpresaAdmin): void {
    if (this.expandedEmpresaId === empresa.id) {
      this.expandedEmpresaId = null;
      this.empresaUsers = [];
    } else {
      this.expandedEmpresaId = empresa.id;
      this.loadUsers(empresa.id);
    }
  }

  loadUsers(empresaId: number): void {
    this.loadingUsers = true;
    this.empresaUsers = [];
    this.http.get<UsuarioAdmin[]>(`${this.API}/empresas/${empresaId}/usuarios`).subscribe({
      next: (data) => {
        this.empresaUsers = data;
        this.loadingUsers = false;
      },
      error: () => {
        this.loadingUsers = false;
        this.snackBar.open('Erro ao carregar usuarios', 'OK', { duration: 3000 });
      }
    });
  }

  changePlan(empresa: EmpresaAdmin): void {
    if (!this.selectedPlan) return;
    this.http.put(`${this.API}/empresas/${empresa.id}/plano`, { plano: this.selectedPlan }).subscribe({
      next: () => {
        empresa.plano = this.selectedPlan;
        this.changingPlanId = null;
        this.selectedPlan = '';
        this.snackBar.open('Plano alterado com sucesso', 'OK', { duration: 3000 });
        this.loadStats();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erro ao alterar plano', 'OK', { duration: 3000 });
      }
    });
  }

  toggleActive(empresa: EmpresaAdmin): void {
    this.http.put(`${this.API}/empresas/${empresa.id}/toggle`, {}).subscribe({
      next: () => {
        empresa.ativo = !empresa.ativo;
        this.snackBar.open(empresa.ativo ? 'Empresa ativada' : 'Empresa desativada', 'OK', { duration: 3000 });
        this.loadStats();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erro ao alterar status', 'OK', { duration: 3000 });
      }
    });
  }

  getBarWidth(count: number): number {
    if (!this.stats?.planoDistribuicao) return 0;
    const max = Math.max(...Object.values(this.stats.planoDistribuicao), 1);
    return Math.max((count / max) * 100, count > 0 ? 4 : 0);
  }

  formatPlanName(plan: string): string {
    const names: { [key: string]: string } = {
      'FREE': 'Free',
      'PRO': 'Pro',
      'BUSINESS': 'Business',
      'BUSINESS_CLAUDE': 'Business+Claude',
      'ENTERPRISE': 'Enterprise'
    };
    return names[plan] || plan;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  maskDocumento(doc: string): string {
    if (!doc) return '';
    const digits = doc.replace(/\D/g, '');
    if (digits.length <= 11) {
      return '***.' + digits.substring(3, 6) + '.' + digits.substring(6, 9) + '-**';
    }
    return '**.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/****-**';
  }
}
