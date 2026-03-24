import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

interface AdminStats {
  totalEmpresas: number;
  empresasAtivas: number;
  totalUsuarios: number;
  totalTickets: number;
  receitaMensal: number;
  porPlano: { [key: string]: number };
  ticketsHoje: number;
  ticketsSemana: number;
  recentEmpresas: { id: number; nome: string; plano: string; createdAt: string }[];
}

interface EmpresaAdmin {
  id: number;
  nome: string;
  documento: string;
  tipoDocumento: string;
  email: string;
  telefone: string;
  endereco: string;
  plano: string;
  totalUsuarios: number;
  ativo: boolean;
  createdAt: string;
  precoMensal: number;
}

interface UsuarioAdmin {
  id: number;
  name: string;
  email: string;
  role: string;
  empresaId: number | null;
  empresaNome: string | null;
}

interface PlanoInfo {
  key: string;
  nome: string;
  preco: number;
  limiteTickets: number;
  limiteUsuarios: number;
  limiteSistemas: number;
  limiteAnalisesClaude: number;
  features: string[];
  empresasCount: number;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatTabsModule, MatTooltipModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Painel Administrativo</h1>
        <p class="page-subtitle">Gerencie empresas, usuarios, planos e permissoes</p>
      </div>

      <mat-tab-group class="admin-tabs" animationDuration="200ms" (selectedIndexChange)="onTabChange($event)">

        <!-- TAB 1: DASHBOARD -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">dashboard</mat-icon>
            <span class="tab-label">Dashboard</span>
          </ng-template>

          <div class="tab-content">
            <!-- Revenue Card -->
            <div class="revenue-card">
              <div class="revenue-icon"><mat-icon>attach_money</mat-icon></div>
              <div class="revenue-info">
                <span class="revenue-label">Receita Mensal Estimada</span>
                <span class="revenue-value">R$ {{ formatCurrency(stats?.receitaMensal || 0) }}</span>
              </div>
              <div class="revenue-details">
                <span>{{ stats?.empresasAtivas || 0 }} empresas ativas</span>
              </div>
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
              <div class="stat-card green">
                <div class="stat-icon"><mat-icon>today</mat-icon></div>
                <div class="stat-info">
                  <span class="stat-value">{{ stats?.ticketsHoje || 0 }} <small>/ {{ stats?.ticketsSemana || 0 }}</small></span>
                  <span class="stat-label">Tickets Hoje / Semana</span>
                </div>
              </div>
            </div>

            <!-- Plan Distribution -->
            <div class="section-card" *ngIf="stats?.porPlano">
              <h2 class="section-title"><mat-icon>bar_chart</mat-icon> Distribuicao por Plano</h2>
              <div class="plan-bars">
                <div class="plan-bar-row" *ngFor="let plan of planOrder">
                  <span class="plan-bar-label">{{ formatPlanName(plan) }}</span>
                  <div class="plan-bar-track">
                    <div class="plan-bar-fill" [class]="'bar-' + plan.toLowerCase().replace('_', '-')"
                         [style.width.%]="getBarWidth(stats!.porPlano[plan] || 0)"></div>
                  </div>
                  <span class="plan-bar-count">{{ stats!.porPlano[plan] || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Recent Empresas -->
            <div class="section-card" *ngIf="stats?.recentEmpresas?.length">
              <h2 class="section-title"><mat-icon>schedule</mat-icon> Empresas Recentes</h2>
              <div class="recent-list">
                <div class="recent-item" *ngFor="let e of stats!.recentEmpresas">
                  <div class="recent-info">
                    <span class="recent-name">{{ e.nome }}</span>
                    <span class="plan-badge" [class]="'plan-' + e.plano.toLowerCase().replace('_', '-')">{{ formatPlanName(e.plano) }}</span>
                  </div>
                  <span class="recent-date">{{ formatDate(e.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- TAB 2: EMPRESAS -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">business</mat-icon>
            <span class="tab-label">Empresas</span>
          </ng-template>

          <div class="tab-content">
            <!-- Create Empresa Form -->
            <div class="create-form-card" *ngIf="showEmpresaForm">
              <h3><mat-icon>add_business</mat-icon> {{ editingEmpresa ? 'Editar Empresa' : 'Nova Empresa' }}</h3>
              <div class="form-grid">
                <div class="form-field">
                  <label>Nome *</label>
                  <input type="text" [(ngModel)]="empresaForm.nome" placeholder="Nome da empresa">
                </div>
                <div class="form-field">
                  <label>Documento</label>
                  <input type="text" [(ngModel)]="empresaForm.documento" placeholder="CNPJ ou CPF">
                </div>
                <div class="form-field">
                  <label>Email</label>
                  <input type="email" [(ngModel)]="empresaForm.email" placeholder="email@empresa.com">
                </div>
                <div class="form-field">
                  <label>Telefone</label>
                  <input type="text" [(ngModel)]="empresaForm.telefone" placeholder="(00) 00000-0000">
                </div>
                <div class="form-field">
                  <label>Plano</label>
                  <select [(ngModel)]="empresaForm.plano">
                    <option *ngFor="let p of allPlans" [value]="p">{{ formatPlanName(p) }}</option>
                  </select>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" (click)="saveEmpresa()">
                  <mat-icon>save</mat-icon> {{ editingEmpresa ? 'Salvar' : 'Criar' }}
                </button>
                <button class="btn btn-secondary" (click)="cancelEmpresaForm()">
                  <mat-icon>close</mat-icon> Cancelar
                </button>
              </div>
            </div>

            <!-- Filters Row -->
            <div class="filters-row">
              <div class="search-box">
                <mat-icon>search</mat-icon>
                <input type="text" placeholder="Buscar empresa..." [(ngModel)]="empresaSearch" (input)="filterEmpresas()">
              </div>
              <select class="filter-select" [(ngModel)]="empresaPlanFilter" (change)="filterEmpresas()">
                <option value="">Todos os planos</option>
                <option *ngFor="let p of allPlans" [value]="p">{{ formatPlanName(p) }}</option>
              </select>
              <select class="filter-select" [(ngModel)]="empresaStatusFilter" (change)="filterEmpresas()">
                <option value="">Todos os status</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <button class="btn btn-primary btn-add" (click)="openEmpresaForm()" matTooltip="Criar empresa">
                <mat-icon>add</mat-icon> Nova Empresa
              </button>
            </div>

            <!-- Empresas Table -->
            <div class="section-card">
              <div class="table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Documento</th>
                      <th>Email</th>
                      <th>Plano</th>
                      <th>Usuarios</th>
                      <th>Status</th>
                      <th>Criado</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let empresa of filteredEmpresas" class="table-row">
                      <td class="name-cell">{{ empresa.nome }}</td>
                      <td>{{ maskDocumento(empresa.documento) }}</td>
                      <td>{{ empresa.email || '-' }}</td>
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
                      <td>{{ formatDate(empresa.createdAt) }}</td>
                      <td class="actions-cell">
                        <div class="action-group">
                          <button class="action-btn" (click)="editEmpresa(empresa)" matTooltip="Editar">
                            <mat-icon>edit</mat-icon>
                          </button>
                          <button class="action-btn" (click)="viewEmpresaUsers(empresa)" matTooltip="Usuarios">
                            <mat-icon>people</mat-icon>
                          </button>
                          <div class="plan-select-wrapper" *ngIf="changingPlanId !== empresa.id">
                            <button class="action-btn" (click)="startChangePlan(empresa)" matTooltip="Alterar plano">
                              <mat-icon>swap_horiz</mat-icon>
                            </button>
                          </div>
                          <div class="plan-select-wrapper" *ngIf="changingPlanId === empresa.id">
                            <select [(ngModel)]="selectedPlan" (change)="changePlan(empresa)" class="plan-dropdown">
                              <option value="">Selecionar...</option>
                              <option *ngFor="let p of allPlans" [value]="p">{{ formatPlanName(p) }}</option>
                            </select>
                            <button class="action-btn cancel" (click)="changingPlanId = null" matTooltip="Cancelar">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                          <button class="action-btn" [class.toggle-off]="empresa.ativo" [class.toggle-on]="!empresa.ativo"
                                  (click)="toggleActive(empresa)" [matTooltip]="empresa.ativo ? 'Desativar' : 'Ativar'">
                            <mat-icon>{{ empresa.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div *ngIf="filteredEmpresas.length === 0" class="empty-state">
                <mat-icon>search_off</mat-icon>
                <p>Nenhuma empresa encontrada</p>
              </div>
            </div>

            <!-- Empresa Users Modal -->
            <div class="section-card" *ngIf="viewingEmpresaUsers">
              <div class="section-header">
                <h2 class="section-title"><mat-icon>people</mat-icon> Usuarios de {{ viewingEmpresaUsers.nome }}</h2>
                <button class="btn btn-secondary" (click)="viewingEmpresaUsers = null; empresaUsersList = []">
                  <mat-icon>close</mat-icon> Fechar
                </button>
              </div>
              <div *ngIf="loadingEmpresaUsers" class="loading-text">Carregando usuarios...</div>
              <table class="admin-table" *ngIf="!loadingEmpresaUsers && empresaUsersList.length > 0">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let u of empresaUsersList">
                    <td>{{ u.name }}</td>
                    <td>{{ u.email }}</td>
                    <td><span class="role-badge" [class]="'role-' + u.role.toLowerCase()">{{ u.role }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div *ngIf="!loadingEmpresaUsers && empresaUsersList.length === 0" class="empty-state small">
                <p>Nenhum usuario nesta empresa</p>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- TAB 3: USUARIOS -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">people</mat-icon>
            <span class="tab-label">Usuarios</span>
          </ng-template>

          <div class="tab-content">
            <!-- Create User Form -->
            <div class="create-form-card" *ngIf="showUserForm">
              <h3><mat-icon>person_add</mat-icon> {{ editingUser ? 'Editar Usuario' : 'Novo Usuario' }}</h3>
              <div class="form-grid">
                <div class="form-field">
                  <label>Nome *</label>
                  <input type="text" [(ngModel)]="userForm.name" placeholder="Nome completo">
                </div>
                <div class="form-field">
                  <label>Email *</label>
                  <input type="email" [(ngModel)]="userForm.email" placeholder="email@exemplo.com">
                </div>
                <div class="form-field" *ngIf="!editingUser">
                  <label>Senha *</label>
                  <input type="password" [(ngModel)]="userForm.password" placeholder="Minimo 6 caracteres">
                </div>
                <div class="form-field">
                  <label>Role</label>
                  <select [(ngModel)]="userForm.role">
                    <option value="ADMIN">Admin</option>
                    <option value="AGENT">Agente</option>
                    <option value="CLIENT">Cliente</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Empresa</label>
                  <select [(ngModel)]="userForm.empresaId">
                    <option value="">Sem empresa</option>
                    <option *ngFor="let e of empresas" [value]="e.id">{{ e.nome }}</option>
                  </select>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" (click)="saveUser()">
                  <mat-icon>save</mat-icon> {{ editingUser ? 'Salvar' : 'Criar' }}
                </button>
                <button class="btn btn-secondary" (click)="cancelUserForm()">
                  <mat-icon>close</mat-icon> Cancelar
                </button>
              </div>
            </div>

            <!-- Filters Row -->
            <div class="filters-row">
              <div class="search-box">
                <mat-icon>search</mat-icon>
                <input type="text" placeholder="Buscar usuario..." [(ngModel)]="userSearch" (input)="filterUsers()">
              </div>
              <select class="filter-select" [(ngModel)]="userRoleFilter" (change)="filterUsers()">
                <option value="">Todas as roles</option>
                <option value="ADMIN">Admin</option>
                <option value="AGENT">Agente</option>
                <option value="CLIENT">Cliente</option>
              </select>
              <select class="filter-select" [(ngModel)]="userEmpresaFilter" (change)="filterUsers()">
                <option value="">Todas as empresas</option>
                <option *ngFor="let e of empresas" [value]="e.id">{{ e.nome }}</option>
              </select>
              <button class="btn btn-primary btn-add" (click)="openUserForm()" matTooltip="Criar usuario">
                <mat-icon>add</mat-icon> Novo Usuario
              </button>
            </div>

            <!-- Users Table -->
            <div class="section-card">
              <div class="table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Empresa</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of filteredUsers" class="table-row">
                      <td class="name-cell">{{ user.name }}</td>
                      <td>{{ user.email }}</td>
                      <td>
                        <span class="role-badge" [class]="'role-' + user.role.toLowerCase()">{{ user.role }}</span>
                      </td>
                      <td>{{ user.empresaNome || '-' }}</td>
                      <td class="actions-cell">
                        <div class="action-group">
                          <button class="action-btn" (click)="editUser(user)" matTooltip="Editar">
                            <mat-icon>edit</mat-icon>
                          </button>
                          <div class="plan-select-wrapper" *ngIf="changingRoleId !== user.id">
                            <button class="action-btn" (click)="startChangeRole(user)" matTooltip="Alterar role">
                              <mat-icon>admin_panel_settings</mat-icon>
                            </button>
                          </div>
                          <div class="plan-select-wrapper" *ngIf="changingRoleId === user.id">
                            <select [(ngModel)]="selectedRole" (change)="changeRole(user)" class="plan-dropdown">
                              <option value="">Selecionar...</option>
                              <option value="ADMIN">Admin</option>
                              <option value="AGENT">Agente</option>
                              <option value="CLIENT">Cliente</option>
                            </select>
                            <button class="action-btn cancel" (click)="changingRoleId = null" matTooltip="Cancelar">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                          <button class="action-btn" (click)="openResetPassword(user)" matTooltip="Reset senha">
                            <mat-icon>lock_reset</mat-icon>
                          </button>
                          <button class="action-btn delete" (click)="deleteUser(user)" matTooltip="Excluir">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div *ngIf="filteredUsers.length === 0" class="empty-state">
                <mat-icon>search_off</mat-icon>
                <p>Nenhum usuario encontrado</p>
              </div>
            </div>

            <!-- Reset Password Card -->
            <div class="create-form-card" *ngIf="resettingPasswordUser">
              <h3><mat-icon>lock_reset</mat-icon> Reset Senha - {{ resettingPasswordUser.name }}</h3>
              <div class="form-grid">
                <div class="form-field">
                  <label>Nova Senha *</label>
                  <input type="password" [(ngModel)]="newPassword" placeholder="Minimo 6 caracteres">
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" (click)="resetPassword()">
                  <mat-icon>save</mat-icon> Alterar Senha
                </button>
                <button class="btn btn-secondary" (click)="resettingPasswordUser = null; newPassword = ''">
                  <mat-icon>close</mat-icon> Cancelar
                </button>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- TAB 4: PLANOS -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">credit_card</mat-icon>
            <span class="tab-label">Planos</span>
          </ng-template>

          <div class="tab-content">
            <div class="plans-grid">
              <div class="plan-card" *ngFor="let plano of planos" [class]="'plan-card-' + plano.key.toLowerCase().replace('_', '-')">
                <div class="plan-card-header">
                  <h3>{{ plano.nome }}</h3>
                  <span class="plan-price">
                    {{ plano.preco === 0 ? 'Gratis' : 'R$ ' + formatCurrency(plano.preco) + '/mes' }}
                  </span>
                </div>
                <div class="plan-card-empresas">
                  <mat-icon>business</mat-icon>
                  <span>{{ plano.empresasCount }} empresa{{ plano.empresasCount !== 1 ? 's' : '' }}</span>
                </div>
                <div class="plan-card-limits">
                  <div class="limit-row">
                    <mat-icon>confirmation_number</mat-icon>
                    <span>{{ plano.limiteTickets >= 2147483647 ? 'Ilimitado' : plano.limiteTickets }} tickets/mes</span>
                  </div>
                  <div class="limit-row">
                    <mat-icon>people</mat-icon>
                    <span>{{ plano.limiteUsuarios >= 2147483647 ? 'Ilimitado' : plano.limiteUsuarios }} usuarios</span>
                  </div>
                  <div class="limit-row">
                    <mat-icon>dns</mat-icon>
                    <span>{{ plano.limiteSistemas >= 2147483647 ? 'Ilimitado' : plano.limiteSistemas }} sistemas</span>
                  </div>
                  <div class="limit-row">
                    <mat-icon>psychology</mat-icon>
                    <span>{{ plano.limiteAnalisesClaude === 0 ? 'Sem analise Claude' : plano.limiteAnalisesClaude + ' analises Claude/mes' }}</span>
                  </div>
                </div>
                <div class="plan-card-features">
                  <div class="feature-item" *ngFor="let f of plano.features">
                    <mat-icon>check_circle</mat-icon>
                    <span>{{ f }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1300px; }

    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; color: var(--text, #111827); }
    .page-subtitle { color: var(--text-secondary, #6b7280); font-size: 15px; margin: 0; }

    /* Tabs */
    .admin-tabs { margin-bottom: 0; }
    :host ::ng-deep .mat-mdc-tab-group { --mdc-tab-indicator-active-indicator-color: #6366f1; }
    :host ::ng-deep .mat-mdc-tab:not(.mdc-tab--active) .mdc-tab__text-label { color: #6b7280; }
    :host ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #6366f1; }
    .tab-icon { margin-right: 8px; font-size: 20px; width: 20px; height: 20px; }
    .tab-label { font-weight: 500; }
    .tab-content { padding-top: 24px; }

    /* Revenue Card */
    .revenue-card {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-radius: 16px;
      padding: 28px 32px;
      color: white;
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }
    .revenue-icon {
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .revenue-icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .revenue-info { display: flex; flex-direction: column; flex: 1; }
    .revenue-label { font-size: 14px; opacity: 0.85; }
    .revenue-value { font-size: 36px; font-weight: 700; line-height: 1.2; margin-top: 4px; }
    .revenue-details { font-size: 14px; opacity: 0.75; }

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
    .stat-value small { font-size: 16px; font-weight: 500; color: var(--text-secondary, #6b7280); }
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
      margin-bottom: 16px;
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
    .plan-bar-row { display: flex; align-items: center; gap: 12px; }
    .plan-bar-label { width: 140px; font-size: 13px; font-weight: 600; color: var(--text, #374151); text-align: right; flex-shrink: 0; }
    .plan-bar-track { flex: 1; height: 24px; background: #f3f4f6; border-radius: 6px; overflow: hidden; }
    .plan-bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; min-width: 4px; }
    .bar-free { background: #9ca3af; }
    .bar-pro { background: #3b82f6; }
    .bar-business { background: #22c55e; }
    .bar-business-claude { background: #8b5cf6; }
    .bar-enterprise { background: #d97706; }
    .plan-bar-count { width: 40px; font-size: 14px; font-weight: 700; color: var(--text, #111827); text-align: right; }

    /* Recent List */
    .recent-list { display: flex; flex-direction: column; gap: 0; }
    .recent-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .recent-item:last-child { border-bottom: none; }
    .recent-info { display: flex; align-items: center; gap: 12px; }
    .recent-name { font-weight: 600; color: var(--text, #111827); font-size: 14px; }
    .recent-date { font-size: 13px; color: var(--text-secondary, #9ca3af); }

    /* Filters Row */
    .filters-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 220px;
      flex: 1;
    }
    .search-box mat-icon { color: #9ca3af; font-size: 20px; width: 20px; height: 20px; }
    .search-box input { border: none; outline: none; background: transparent; font-size: 14px; flex: 1; color: var(--text, #111827); }
    .filter-select {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 14px;
      background: white;
      color: var(--text, #111827);
      cursor: pointer;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .btn-add mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Create Form Card */
    .create-form-card {
      background: white;
      border: 2px solid #6366f1;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .create-form-card h3 {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 600; color: #4f46e5;
      margin: 0 0 20px;
    }
    .create-form-card h3 mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .form-field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .form-field input, .form-field select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      color: var(--text, #111827);
      background: white;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .form-field input:focus, .form-field select:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }
    .form-actions { display: flex; gap: 10px; }

    /* Table */
    .table-wrapper { overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
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
      transition: background 0.15s;
    }
    .admin-table tbody tr:hover { background: #f8f9ff; }
    .admin-table td { padding: 12px 14px; color: var(--text, #111827); white-space: nowrap; }
    .name-cell { font-weight: 600; }

    /* Badges */
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

    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.inactive { background: #fee2e2; color: #dc2626; }

    .role-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .role-admin { background: #fef3c7; color: #92400e; }
    .role-agent { background: #dbeafe; color: #1e40af; }
    .role-client { background: #e0e7ff; color: #3730a3; }

    /* Actions */
    .actions-cell { cursor: default !important; }
    .action-group { display: flex; align-items: center; gap: 4px; }
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
    .action-btn.delete:hover { background: #fee2e2; color: #dc2626; }
    .action-btn.toggle-off:hover { background: #fee2e2; color: #dc2626; }
    .action-btn.toggle-on:hover { background: #dcfce7; color: #15803d; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .plan-select-wrapper { display: flex; align-items: center; gap: 4px; }
    .plan-dropdown {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      background: white;
      color: var(--text, #111827);
      cursor: pointer;
    }

    /* Plans Grid */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }
    .plan-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .plan-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
    .plan-card-free { border-color: #d1d5db; }
    .plan-card-pro { border-color: #93c5fd; }
    .plan-card-business { border-color: #86efac; }
    .plan-card-business-claude { border-color: #c4b5fd; }
    .plan-card-enterprise { border-color: #fcd34d; }
    .plan-card-header h3 { font-size: 18px; font-weight: 700; margin: 0 0 4px; color: var(--text, #111827); }
    .plan-price { font-size: 24px; font-weight: 700; color: #6366f1; }
    .plan-card-empresas {
      display: flex; align-items: center; gap: 6px;
      margin-top: 16px; padding: 10px 14px;
      background: #f8f9ff; border-radius: 8px;
      font-size: 13px; font-weight: 600; color: #4f46e5;
    }
    .plan-card-empresas mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .plan-card-limits {
      margin-top: 16px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .limit-row {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--text, #374151);
    }
    .limit-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; }
    .plan-card-features {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
      display: flex; flex-direction: column; gap: 6px;
    }
    .feature-item {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--text, #374151);
    }
    .feature-item mat-icon { font-size: 16px; width: 16px; height: 16px; color: #22c55e; }

    /* Empty & Loading */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary, #9ca3af);
    }
    .empty-state.small { padding: 20px; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.5; }
    .empty-state p { margin: 8px 0 0; font-size: 14px; }
    .loading-text { text-align: center; padding: 20px; color: var(--text-secondary, #9ca3af); font-size: 14px; }

    /* Responsive */
    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .plans-grid { grid-template-columns: repeat(2, 1fr); }
      .revenue-card { flex-direction: column; text-align: center; }
    }
    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
      .plans-grid { grid-template-columns: 1fr; }
      .filters-row { flex-direction: column; align-items: stretch; }
      .search-box { min-width: unset; }
      .plan-bar-label { width: 100px; font-size: 11px; }
    }
  `]
})
export class AdminPanelComponent implements OnInit {
  private readonly API = 'http://localhost:8080/api/admin';

  // Dashboard
  stats: AdminStats | null = null;

  // Empresas
  empresas: EmpresaAdmin[] = [];
  filteredEmpresas: EmpresaAdmin[] = [];
  empresaSearch = '';
  empresaPlanFilter = '';
  empresaStatusFilter = '';
  showEmpresaForm = false;
  editingEmpresa: EmpresaAdmin | null = null;
  empresaForm = { nome: '', documento: '', email: '', telefone: '', plano: 'FREE' };
  changingPlanId: number | null = null;
  selectedPlan = '';
  viewingEmpresaUsers: EmpresaAdmin | null = null;
  empresaUsersList: { id: number; name: string; email: string; role: string }[] = [];
  loadingEmpresaUsers = false;

  // Usuarios
  usuarios: UsuarioAdmin[] = [];
  filteredUsers: UsuarioAdmin[] = [];
  userSearch = '';
  userRoleFilter = '';
  userEmpresaFilter = '';
  showUserForm = false;
  editingUser: UsuarioAdmin | null = null;
  userForm = { name: '', email: '', password: '', role: 'CLIENT', empresaId: '' };
  changingRoleId: number | null = null;
  selectedRole = '';
  resettingPasswordUser: UsuarioAdmin | null = null;
  newPassword = '';

  // Planos
  planos: PlanoInfo[] = [];

  allPlans = ['FREE', 'PRO', 'BUSINESS', 'BUSINESS_CLAUDE', 'ENTERPRISE'];
  planOrder = ['FREE', 'PRO', 'BUSINESS', 'BUSINESS_CLAUDE', 'ENTERPRISE'];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadEmpresas();
  }

  onTabChange(index: number): void {
    if (index === 0) this.loadStats();
    if (index === 1) this.loadEmpresas();
    if (index === 2) { this.loadUsuarios(); this.loadEmpresas(); }
    if (index === 3) this.loadPlanos();
  }

  // ========== DASHBOARD ==========
  loadStats(): void {
    this.http.get<AdminStats>(`${this.API}/stats`).subscribe({
      next: (data) => this.stats = data,
      error: () => this.snack('Erro ao carregar estatisticas')
    });
  }

  // ========== EMPRESAS ==========
  loadEmpresas(): void {
    this.http.get<EmpresaAdmin[]>(`${this.API}/empresas`).subscribe({
      next: (data) => { this.empresas = data; this.filterEmpresas(); },
      error: () => this.snack('Erro ao carregar empresas')
    });
  }

  filterEmpresas(): void {
    let result = [...this.empresas];
    const term = this.empresaSearch.toLowerCase();
    if (term) {
      result = result.filter(e =>
        e.nome.toLowerCase().includes(term) ||
        (e.documento && e.documento.includes(term)) ||
        (e.email && e.email.toLowerCase().includes(term))
      );
    }
    if (this.empresaPlanFilter) {
      result = result.filter(e => e.plano === this.empresaPlanFilter);
    }
    if (this.empresaStatusFilter !== '') {
      const isActive = this.empresaStatusFilter === 'true';
      result = result.filter(e => e.ativo === isActive);
    }
    this.filteredEmpresas = result;
  }

  openEmpresaForm(): void {
    this.editingEmpresa = null;
    this.empresaForm = { nome: '', documento: '', email: '', telefone: '', plano: 'FREE' };
    this.showEmpresaForm = true;
  }

  editEmpresa(empresa: EmpresaAdmin): void {
    this.editingEmpresa = empresa;
    this.empresaForm = {
      nome: empresa.nome,
      documento: empresa.documento || '',
      email: empresa.email || '',
      telefone: empresa.telefone || '',
      plano: empresa.plano
    };
    this.showEmpresaForm = true;
  }

  cancelEmpresaForm(): void {
    this.showEmpresaForm = false;
    this.editingEmpresa = null;
  }

  saveEmpresa(): void {
    if (!this.empresaForm.nome) {
      this.snack('Nome e obrigatorio');
      return;
    }
    if (this.editingEmpresa) {
      this.http.put(`${this.API}/empresas/${this.editingEmpresa.id}`, this.empresaForm).subscribe({
        next: () => {
          this.snack('Empresa atualizada com sucesso');
          this.showEmpresaForm = false;
          this.editingEmpresa = null;
          this.loadEmpresas();
          this.loadStats();
        },
        error: (err) => this.snack(err.error?.message || 'Erro ao atualizar empresa')
      });
    } else {
      this.http.post(`${this.API}/empresas`, this.empresaForm).subscribe({
        next: () => {
          this.snack('Empresa criada com sucesso');
          this.showEmpresaForm = false;
          this.loadEmpresas();
          this.loadStats();
        },
        error: (err) => this.snack(err.error?.message || 'Erro ao criar empresa')
      });
    }
  }

  startChangePlan(empresa: EmpresaAdmin): void {
    this.changingPlanId = empresa.id;
    this.selectedPlan = '';
  }

  changePlan(empresa: EmpresaAdmin): void {
    if (!this.selectedPlan) return;
    this.http.put(`${this.API}/empresas/${empresa.id}/plano`, { plano: this.selectedPlan }).subscribe({
      next: () => {
        empresa.plano = this.selectedPlan;
        this.changingPlanId = null;
        this.selectedPlan = '';
        this.snack('Plano alterado com sucesso');
        this.loadStats();
      },
      error: (err) => this.snack(err.error?.message || 'Erro ao alterar plano')
    });
  }

  toggleActive(empresa: EmpresaAdmin): void {
    this.http.put(`${this.API}/empresas/${empresa.id}/toggle`, {}).subscribe({
      next: () => {
        empresa.ativo = !empresa.ativo;
        this.snack(empresa.ativo ? 'Empresa ativada' : 'Empresa desativada');
        this.loadStats();
      },
      error: (err) => this.snack(err.error?.message || 'Erro ao alterar status')
    });
  }

  viewEmpresaUsers(empresa: EmpresaAdmin): void {
    this.viewingEmpresaUsers = empresa;
    this.loadingEmpresaUsers = true;
    this.empresaUsersList = [];
    this.http.get<any[]>(`${this.API}/empresas/${empresa.id}/usuarios`).subscribe({
      next: (data) => { this.empresaUsersList = data; this.loadingEmpresaUsers = false; },
      error: () => { this.loadingEmpresaUsers = false; this.snack('Erro ao carregar usuarios'); }
    });
  }

  // ========== USUARIOS ==========
  loadUsuarios(): void {
    this.http.get<UsuarioAdmin[]>(`${this.API}/usuarios`).subscribe({
      next: (data) => { this.usuarios = data; this.filterUsers(); },
      error: () => this.snack('Erro ao carregar usuarios')
    });
  }

  filterUsers(): void {
    let result = [...this.usuarios];
    const term = this.userSearch.toLowerCase();
    if (term) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.empresaNome && u.empresaNome.toLowerCase().includes(term))
      );
    }
    if (this.userRoleFilter) {
      result = result.filter(u => u.role === this.userRoleFilter);
    }
    if (this.userEmpresaFilter) {
      result = result.filter(u => u.empresaId !== null && u.empresaId.toString() === this.userEmpresaFilter);
    }
    this.filteredUsers = result;
  }

  openUserForm(): void {
    this.editingUser = null;
    this.userForm = { name: '', email: '', password: '', role: 'CLIENT', empresaId: '' };
    this.showUserForm = true;
  }

  editUser(user: UsuarioAdmin): void {
    this.editingUser = user;
    this.userForm = {
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      empresaId: user.empresaId ? user.empresaId.toString() : ''
    };
    this.showUserForm = true;
  }

  cancelUserForm(): void {
    this.showUserForm = false;
    this.editingUser = null;
  }

  saveUser(): void {
    if (!this.userForm.name || !this.userForm.email) {
      this.snack('Nome e email sao obrigatorios');
      return;
    }
    if (!this.editingUser && !this.userForm.password) {
      this.snack('Senha e obrigatoria para novo usuario');
      return;
    }
    if (this.editingUser) {
      const body: any = {
        name: this.userForm.name,
        email: this.userForm.email,
        role: this.userForm.role,
        empresaId: this.userForm.empresaId
      };
      this.http.put(`${this.API}/usuarios/${this.editingUser.id}`, body).subscribe({
        next: () => {
          this.snack('Usuario atualizado com sucesso');
          this.showUserForm = false;
          this.editingUser = null;
          this.loadUsuarios();
        },
        error: (err) => this.snack(err.error?.message || 'Erro ao atualizar usuario')
      });
    } else {
      this.http.post(`${this.API}/usuarios`, this.userForm).subscribe({
        next: () => {
          this.snack('Usuario criado com sucesso');
          this.showUserForm = false;
          this.loadUsuarios();
          this.loadStats();
        },
        error: (err) => this.snack(err.error?.message || 'Erro ao criar usuario')
      });
    }
  }

  startChangeRole(user: UsuarioAdmin): void {
    this.changingRoleId = user.id;
    this.selectedRole = '';
  }

  changeRole(user: UsuarioAdmin): void {
    if (!this.selectedRole) return;
    this.http.put(`${this.API}/usuarios/${user.id}/role`, { role: this.selectedRole }).subscribe({
      next: () => {
        user.role = this.selectedRole;
        this.changingRoleId = null;
        this.selectedRole = '';
        this.snack('Role alterada com sucesso');
      },
      error: (err) => this.snack(err.error?.message || 'Erro ao alterar role')
    });
  }

  openResetPassword(user: UsuarioAdmin): void {
    this.resettingPasswordUser = user;
    this.newPassword = '';
  }

  resetPassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.snack('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    this.http.put(`${this.API}/usuarios/${this.resettingPasswordUser!.id}/reset-password`, { newPassword: this.newPassword }).subscribe({
      next: () => {
        this.snack('Senha alterada com sucesso');
        this.resettingPasswordUser = null;
        this.newPassword = '';
      },
      error: (err) => this.snack(err.error?.message || 'Erro ao alterar senha')
    });
  }

  deleteUser(user: UsuarioAdmin): void {
    if (!confirm(`Tem certeza que deseja excluir o usuario "${user.name}"?`)) return;
    this.http.delete(`${this.API}/usuarios/${user.id}`).subscribe({
      next: () => {
        this.snack('Usuario excluido com sucesso');
        this.loadUsuarios();
        this.loadStats();
      },
      error: (err) => this.snack(err.error?.message || 'Erro ao excluir usuario')
    });
  }

  // ========== PLANOS ==========
  loadPlanos(): void {
    this.http.get<PlanoInfo[]>(`${this.API}/planos`).subscribe({
      next: (data) => this.planos = data,
      error: () => this.snack('Erro ao carregar planos')
    });
  }

  // ========== HELPERS ==========
  getBarWidth(count: number): number {
    if (!this.stats?.porPlano) return 0;
    const max = Math.max(...Object.values(this.stats.porPlano), 1);
    return Math.max((count / max) * 100, count > 0 ? 4 : 0);
  }

  formatPlanName(plan: string): string {
    const names: { [key: string]: string } = {
      'FREE': 'Free', 'PRO': 'Pro', 'BUSINESS': 'Business',
      'BUSINESS_CLAUDE': 'Business+Claude', 'ENTERPRISE': 'Enterprise'
    };
    return names[plan] || plan;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  maskDocumento(doc: string): string {
    if (!doc) return '-';
    const digits = doc.replace(/\D/g, '');
    if (digits.length <= 11) {
      return '***.' + digits.substring(3, 6) + '.' + digits.substring(6, 9) + '-**';
    }
    return '**.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/****-**';
  }

  private snack(msg: string): void {
    this.snackBar.open(msg, 'OK', { duration: 3000 });
  }
}
