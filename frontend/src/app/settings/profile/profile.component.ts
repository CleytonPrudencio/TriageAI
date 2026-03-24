import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  empresa: {
    nome: string;
    documento: string;
    tipo: string;
    telefone: string;
    endereco: string;
  };
  plano: {
    tipo: string;
    ticketsUsados: number;
    ticketsLimite: number;
    usuariosUsados: number;
    usuariosLimite: number;
    sistemasUsados: number;
    sistemasLimite: number;
  };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressBarModule, MatChipsModule, MatDialogModule],
  template: `
    <div class="profile-page" *ngIf="profile">
      <div class="page-header">
        <h1>Meu Perfil</h1>
        <p class="page-subtitle">Gerencie suas informacoes pessoais e da empresa</p>
      </div>

      <div class="profile-grid">
        <!-- User Info Card -->
        <div class="profile-card">
          <div class="card-title">
            <mat-icon>person</mat-icon>
            Informacoes do Usuario
          </div>

          <div class="user-header">
            <div class="avatar-large">{{ userInitials }}</div>
            <div class="user-header-info">
              <h3>{{ profile.name }}</h3>
              <span class="email-display">{{ profile.email }}</span>
              <span class="role-badge" [class]="'role-' + profile.role.toLowerCase()">{{ profile.role }}</span>
            </div>
          </div>

          <form (ngSubmit)="saveUser()">
            <mat-form-field appearance="outline">
              <mat-label>Nome</mat-label>
              <input matInput [(ngModel)]="profile.name" name="userName" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput [value]="profile.email" disabled>
              <mat-hint>O email nao pode ser alterado</mat-hint>
            </mat-form-field>

            <div class="password-section">
              <label class="section-label">Alterar senha</label>
              <div class="password-row">
                <mat-form-field appearance="outline">
                  <mat-label>Nova senha</mat-label>
                  <input matInput [type]="showNewPassword ? 'text' : 'password'" [(ngModel)]="newPassword" name="newPassword" minlength="6">
                  <button mat-icon-button matSuffix type="button" (click)="showNewPassword = !showNewPassword">
                    <mat-icon>{{ showNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Confirmar nova senha</mat-label>
                  <input matInput [type]="showNewPassword ? 'text' : 'password'" [(ngModel)]="confirmNewPassword" name="confirmNewPassword">
                  <mat-hint *ngIf="confirmNewPassword && newPassword !== confirmNewPassword" class="error-hint">Senhas nao coincidem</mat-hint>
                </mat-form-field>
              </div>
            </div>

            <button mat-raised-button color="primary" type="submit" class="save-btn" [disabled]="savingUser">
              <mat-icon>save</mat-icon>
              {{ savingUser ? 'Salvando...' : 'Salvar usuario' }}
            </button>
          </form>
        </div>

        <!-- Empresa Info Card -->
        <div class="profile-card">
          <div class="card-title">
            <mat-icon>business</mat-icon>
            Informacoes da Empresa
          </div>

          <form (ngSubmit)="saveEmpresa()">
            <mat-form-field appearance="outline">
              <mat-label>Nome da empresa</mat-label>
              <input matInput [(ngModel)]="profile.empresa.nome" name="empresaNome" required>
            </mat-form-field>

            <div class="documento-row">
              <mat-form-field appearance="outline" class="documento-field">
                <mat-label>Documento</mat-label>
                <input matInput [value]="maskDocumento(profile.empresa.documento)" disabled>
              </mat-form-field>
              <span class="tipo-badge" [class]="'tipo-' + profile.empresa.tipo.toLowerCase()">{{ profile.empresa.tipo }}</span>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Telefone</mat-label>
              <input matInput [(ngModel)]="profile.empresa.telefone" name="empresaTelefone">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Endereco</mat-label>
              <input matInput [(ngModel)]="profile.empresa.endereco" name="empresaEndereco">
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" class="save-btn" [disabled]="savingEmpresa">
              <mat-icon>save</mat-icon>
              {{ savingEmpresa ? 'Salvando...' : 'Salvar empresa' }}
            </button>
          </form>
        </div>

        <!-- Plano Card -->
        <div class="profile-card plano-card">
          <div class="card-title">
            <mat-icon>workspace_premium</mat-icon>
            Plano Atual
          </div>

          <div class="plano-header">
            <span class="plano-badge" [class]="'plano-' + profile.plano.tipo.toLowerCase().replace('_', '-')">
              {{ getPlanDisplayName(profile.plano.tipo) }}
            </span>
            <span class="plano-price">{{ getPlanPrice(profile.plano.tipo) }}</span>
          </div>
          <p class="plano-desc-text">{{ getPlanDescription(profile.plano.tipo) }}</p>

          <div class="usage-stats">
            <div class="usage-item">
              <div class="usage-header">
                <span class="usage-label">Tickets este mes</span>
                <span class="usage-value">{{ profile.plano.ticketsUsados }}/{{ profile.plano.ticketsLimite === -1 ? 'Ilimitado' : profile.plano.ticketsLimite }}</span>
              </div>
              <div class="progress-bar-wrapper" *ngIf="profile.plano.ticketsLimite !== -1">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="getPercent(profile.plano.ticketsUsados, profile.plano.ticketsLimite)"
                       [class.warning]="getPercent(profile.plano.ticketsUsados, profile.plano.ticketsLimite) > 80"
                       [class.danger]="getPercent(profile.plano.ticketsUsados, profile.plano.ticketsLimite) > 95"></div>
                </div>
              </div>
            </div>

            <div class="usage-item">
              <div class="usage-header">
                <span class="usage-label">Usuarios</span>
                <span class="usage-value">{{ profile.plano.usuariosUsados }}/{{ profile.plano.usuariosLimite === -1 ? 'Ilimitado' : profile.plano.usuariosLimite }}</span>
              </div>
              <div class="progress-bar-wrapper" *ngIf="profile.plano.usuariosLimite !== -1">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="getPercent(profile.plano.usuariosUsados, profile.plano.usuariosLimite)"
                       [class.warning]="getPercent(profile.plano.usuariosUsados, profile.plano.usuariosLimite) > 80"
                       [class.danger]="getPercent(profile.plano.usuariosUsados, profile.plano.usuariosLimite) > 95"></div>
                </div>
              </div>
            </div>

            <div class="usage-item">
              <div class="usage-header">
                <span class="usage-label">Sistemas</span>
                <span class="usage-value">{{ profile.plano.sistemasUsados }}/{{ profile.plano.sistemasLimite === -1 ? 'Ilimitado' : profile.plano.sistemasLimite }}</span>
              </div>
              <div class="progress-bar-wrapper" *ngIf="profile.plano.sistemasLimite !== -1">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="getPercent(profile.plano.sistemasUsados, profile.plano.sistemasLimite)"
                       [class.warning]="getPercent(profile.plano.sistemasUsados, profile.plano.sistemasLimite) > 80"
                       [class.danger]="getPercent(profile.plano.sistemasUsados, profile.plano.sistemasLimite) > 95"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="plano-actions">
            <a routerLink="/plans" class="view-plans-link">
              <mat-icon>visibility</mat-icon>
              Ver todos os planos
            </a>
            <button *ngIf="profile.plano.tipo !== 'ENTERPRISE'" mat-raised-button class="upgrade-btn" (click)="upgradePlano()" [disabled]="upgrading">
              <mat-icon>rocket_launch</mat-icon>
              {{ upgrading ? 'Processando...' : 'Fazer upgrade' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!profile && !loadError">
      <mat-icon>hourglass_empty</mat-icon>
      <p>Carregando perfil...</p>
    </div>

    <div class="error-state" *ngIf="loadError">
      <mat-icon>error_outline</mat-icon>
      <p>Erro ao carregar perfil</p>
      <button mat-raised-button color="primary" (click)="loadProfile()">Tentar novamente</button>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 900px; }

    .page-header { margin-bottom: 32px; }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; color: var(--text); }
    .page-subtitle { color: var(--text-secondary); font-size: 15px; margin: 0; }

    .profile-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .profile-card {
      background: var(--card-bg, white);
      border-radius: 12px;
      padding: 28px;
      border: 1px solid var(--border, #e5e7eb);
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 24px;
    }

    .card-title mat-icon { color: #6366f1; }

    .user-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border, #e5e7eb);
    }

    .avatar-large {
      width: 72px; height: 72px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 24px; font-weight: 700;
      flex-shrink: 0;
    }

    .user-header-info { display: flex; flex-direction: column; gap: 4px; }
    .user-header-info h3 { margin: 0; font-size: 20px; font-weight: 600; color: var(--text); }
    .email-display { color: var(--text-secondary); font-size: 14px; }

    .role-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: fit-content;
    }

    .role-admin { background: #fef3c7; color: #92400e; }
    .role-user { background: #dbeafe; color: #1e40af; }
    .role-manager { background: #e0e7ff; color: #3730a3; }

    mat-form-field { width: 100%; margin-bottom: 4px; }

    .password-section { margin-top: 16px; }

    .section-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 12px;
    }

    .password-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .error-hint { color: #ef4444 !important; }

    .save-btn {
      margin-top: 8px;
      height: 44px;
      font-weight: 600;
      border-radius: 10px !important;
    }

    .save-btn mat-icon { margin-right: 8px; font-size: 18px; width: 18px; height: 18px; }

    .documento-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .documento-field { flex: 1; }

    .tipo-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      white-space: nowrap;
      margin-bottom: 20px;
    }

    .tipo-cpf { background: #dbeafe; color: #1e40af; }
    .tipo-cnpj { background: #e0e7ff; color: #3730a3; }

    .plano-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    .plano-badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .plano-free { background: #f3f4f6; color: #6b7280; }
    .plano-pro { background: #dbeafe; color: #1d4ed8; }
    .plano-business { background: #dcfce7; color: #15803d; }
    .plano-business-claude { background: #ede9fe; color: #7c3aed; }
    .plano-enterprise { background: #fef3c7; color: #b45309; }
    .plano-premium { background: #ede9fe; color: #5b21b6; }

    .plano-price {
      font-size: 20px;
      font-weight: 700;
      color: var(--text, #111827);
    }

    .plano-desc-text {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0 0 20px;
    }

    .plano-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .view-plans-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #6366f1;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      padding: 8px 0;
    }

    .view-plans-link:hover { text-decoration: underline; }
    .view-plans-link mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .usage-stats {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 24px;
    }

    .usage-item {}

    .usage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .usage-label { font-size: 14px; color: var(--text-secondary); }
    .usage-value { font-size: 14px; font-weight: 600; color: var(--text); }

    .progress-bar-wrapper { width: 100%; }

    .progress-bar-bg {
      width: 100%;
      height: 8px;
      background: var(--border, #e5e7eb);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: #6366f1;
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .progress-bar-fill.warning { background: #f59e0b; }
    .progress-bar-fill.danger { background: #ef4444; }

    .upgrade-btn {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 10px !important;
      background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
      color: white !important;
    }

    .upgrade-btn mat-icon { margin-right: 8px; }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--text-secondary);
    }

    .loading-state mat-icon, .error-state mat-icon {
      font-size: 48px; width: 48px; height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    @media (max-width: 640px) {
      .password-row { grid-template-columns: 1fr; }
      .documento-row { flex-direction: column; align-items: flex-start; }
      .tipo-badge { margin-bottom: 0; }
      .plano-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly API = 'http://localhost:8080/api/profile';
  profile: ProfileData | null = null;
  loadError = false;

  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;

  savingUser = false;
  savingEmpresa = false;
  upgrading = false;

  userInitials = '';

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadError = false;
    this.http.get<ProfileData>(this.API).subscribe({
      next: (data) => {
        this.profile = data;
        this.userInitials = this.profile.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
      },
      error: () => {
        this.loadError = true;
      }
    });
  }

  maskDocumento(doc: string): string {
    if (!doc) return '';
    const digits = doc.replace(/\D/g, '');
    if (digits.length <= 11) {
      return '***.' + digits.substring(3, 6) + '.' + digits.substring(6, 9) + '-**';
    }
    return '**.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/****-**';
  }

  getPercent(used: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  saveUser(): void {
    if (!this.profile) return;
    if (this.newPassword && this.newPassword !== this.confirmNewPassword) {
      this.snackBar.open('As senhas nao coincidem', 'OK', { duration: 3000 });
      return;
    }
    if (this.newPassword && this.newPassword.length < 6) {
      this.snackBar.open('A senha deve ter no minimo 6 caracteres', 'OK', { duration: 3000 });
      return;
    }

    this.savingUser = true;
    const body: any = { name: this.profile.name };
    if (this.newPassword) {
      body.password = this.newPassword;
    }

    this.http.put(this.API, body).subscribe({
      next: () => {
        this.snackBar.open('Usuario atualizado com sucesso', 'OK', { duration: 3000 });
        this.savingUser = false;
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.updateStoredUser();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erro ao salvar', 'OK', { duration: 3000 });
        this.savingUser = false;
      }
    });
  }

  saveEmpresa(): void {
    if (!this.profile) return;
    this.savingEmpresa = true;

    this.http.put(`${this.API}/empresa`, {
      nome: this.profile.empresa.nome,
      telefone: this.profile.empresa.telefone,
      endereco: this.profile.empresa.endereco
    }).subscribe({
      next: () => {
        this.snackBar.open('Empresa atualizada com sucesso', 'OK', { duration: 3000 });
        this.savingEmpresa = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erro ao salvar', 'OK', { duration: 3000 });
        this.savingEmpresa = false;
      }
    });
  }

  upgradePlano(): void {
    const currentPlan = this.profile?.plano.tipo || 'FREE';
    const nextPlan = this.getNextPlan(currentPlan);
    if (!nextPlan) return;
    if (!confirm(`Deseja fazer upgrade para o plano ${this.getPlanDisplayName(nextPlan)}?`)) return;
    this.upgrading = true;

    this.http.put(`${this.API}/plano`, { tipo: nextPlan }).subscribe({
      next: () => {
        this.snackBar.open('Upgrade realizado com sucesso!', 'OK', { duration: 3000 });
        this.upgrading = false;
        this.loadProfile();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erro ao realizar upgrade', 'OK', { duration: 3000 });
        this.upgrading = false;
      }
    });
  }

  getPlanDisplayName(tipo: string): string {
    const names: { [key: string]: string } = {
      'FREE': 'Free', 'PRO': 'Pro', 'BUSINESS': 'Business',
      'BUSINESS_CLAUDE': 'Business+Claude', 'ENTERPRISE': 'Enterprise', 'PREMIUM': 'Premium'
    };
    return names[tipo] || tipo;
  }

  getPlanPrice(tipo: string): string {
    const prices: { [key: string]: string } = {
      'FREE': 'R$0/mes', 'PRO': 'R$99/mes', 'BUSINESS': 'R$299/mes',
      'BUSINESS_CLAUDE': 'R$500/mes', 'ENTERPRISE': 'R$999/mes', 'PREMIUM': 'R$99/mes'
    };
    return prices[tipo] || '';
  }

  getPlanDescription(tipo: string): string {
    const descs: { [key: string]: string } = {
      'FREE': 'Plano gratuito com recursos limitados',
      'PRO': 'Auto-fix e API incluidos',
      'BUSINESS': 'IA avancada com recursos ilimitados',
      'BUSINESS_CLAUDE': 'Analises Claude AI incluidas',
      'ENTERPRISE': 'Acesso completo com suporte prioritario',
      'PREMIUM': 'Acesso completo a todos os recursos'
    };
    return descs[tipo] || '';
  }

  private getNextPlan(current: string): string | null {
    const order = ['FREE', 'PRO', 'BUSINESS', 'BUSINESS_CLAUDE', 'ENTERPRISE'];
    const idx = order.indexOf(current);
    if (idx === -1 || idx >= order.length - 1) return null;
    return order[idx + 1];
  }

  private updateStoredUser(): void {
    if (!this.profile) return;
    const raw = localStorage.getItem('triageai_user');
    if (raw) {
      const user = JSON.parse(raw);
      user.name = this.profile.name;
      localStorage.setItem('triageai_user', JSON.stringify(user));
    }
  }
}
