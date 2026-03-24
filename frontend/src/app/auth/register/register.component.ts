import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="register-page">
      <div class="register-container">
        <div class="register-card">
          <div class="card-header">
            <div class="logo-icon"><mat-icon>psychology</mat-icon></div>
            <h1>TriageAI</h1>
            <p class="subtitle">Crie sua conta e comece a usar a priorizacao inteligente</p>
          </div>

          <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nome da empresa/pessoa</mat-label>
                <mat-icon matPrefix>business</mat-icon>
                <input matInput [(ngModel)]="nomeEmpresa" name="nomeEmpresa" required>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>CPF ou CNPJ</mat-label>
                <mat-icon matPrefix>badge</mat-icon>
                <input matInput [(ngModel)]="documento" name="documento" required
                       (input)="onDocumentoInput($event)" [maxLength]="18"
                       placeholder="000.000.000-00 ou 00.000.000/0000-00">
                <mat-hint *ngIf="documento && !isDocumentoValid()" class="error-hint">Formato invalido</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nome do usuario</mat-label>
                <mat-icon matPrefix>person</mat-icon>
                <input matInput [(ngModel)]="name" name="name" required>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <mat-icon matPrefix>email</mat-icon>
                <input matInput type="email" [(ngModel)]="email" name="email" required
                       pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}">
              </mat-form-field>
            </div>

            <div class="form-row two-cols">
              <mat-form-field appearance="outline">
                <mat-label>Senha</mat-label>
                <mat-icon matPrefix>lock</mat-icon>
                <input matInput [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" required minlength="6">
                <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirmar senha</mat-label>
                <mat-icon matPrefix>lock_outline</mat-icon>
                <input matInput [type]="showPassword ? 'text' : 'password'" [(ngModel)]="confirmPassword" name="confirmPassword" required>
                <mat-hint *ngIf="confirmPassword && password !== confirmPassword" class="error-hint">Senhas nao coincidem</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Telefone (opcional)</mat-label>
                <mat-icon matPrefix>phone</mat-icon>
                <input matInput [(ngModel)]="telefone" name="telefone" (input)="onTelefoneInput($event)">
              </mat-form-field>
            </div>

            <div class="plan-section">
              <label class="section-label">Escolha seu plano</label>
              <div class="plan-cards">
                <div class="plan-card" [class.selected]="plano === 'FREE'" (click)="plano = 'FREE'">
                  <div class="plan-header">
                    <h3>Free</h3>
                    <span class="plan-price">R$ 0</span>
                  </div>
                  <ul class="plan-features">
                    <li><mat-icon>check</mat-icon> 50 tickets/mes</li>
                    <li><mat-icon>check</mat-icon> 3 usuarios</li>
                    <li><mat-icon>check</mat-icon> 1 sistema</li>
                    <li><mat-icon>check</mat-icon> Classificacao IA</li>
                  </ul>
                </div>

                <div class="plan-card premium" [class.selected]="plano === 'PREMIUM'" (click)="plano = 'PREMIUM'">
                  <div class="badge-recommended">Recomendado</div>
                  <div class="plan-header">
                    <h3>Premium</h3>
                    <span class="plan-price">R$ 99<small>/mes</small></span>
                  </div>
                  <ul class="plan-features">
                    <li><mat-icon>check</mat-icon> Tickets ilimitados</li>
                    <li><mat-icon>check</mat-icon> Usuarios ilimitados</li>
                    <li><mat-icon>check</mat-icon> Auto-fix com IA</li>
                    <li><mat-icon>check</mat-icon> Claude AI integrado</li>
                    <li><mat-icon>check</mat-icon> API integracao</li>
                    <li><mat-icon>check</mat-icon> Suporte prioritario</li>
                  </ul>
                </div>
              </div>
            </div>

            <div *ngIf="errorMessage" class="error-banner">
              <mat-icon>error_outline</mat-icon>
              {{ errorMessage }}
            </div>

            <button mat-raised-button color="primary" type="submit" class="submit-btn"
                    [disabled]="loading || !registerForm.valid || password !== confirmPassword || !isDocumentoValid()">
              {{ loading ? 'Criando conta...' : 'Criar conta' }}
            </button>
          </form>

          <p class="auth-link">Ja tem conta? <a routerLink="/login">Entrar</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
    }

    .register-container {
      width: 100%;
      max-width: 600px;
    }

    .register-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .card-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-icon {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-radius: 14px;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }

    .logo-icon mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }

    .card-header h1 {
      font-size: 28px; font-weight: 700; margin: 0 0 8px; color: #1e1b4b;
    }

    .card-header .subtitle {
      color: #6b7280; font-size: 14px; margin: 0;
    }

    mat-form-field { width: 100%; }
    .full-width { width: 100%; }

    .form-row { margin-bottom: 4px; }

    .form-row.two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    mat-icon[matPrefix] { margin-right: 8px; color: #9ca3af; }

    .error-hint { color: #ef4444 !important; }

    .section-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }

    .plan-section { margin-bottom: 24px; }

    .plan-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .plan-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .plan-card:hover { border-color: #a5b4fc; }

    .plan-card.selected {
      border-color: #6366f1;
      background: #f5f3ff;
      box-shadow: 0 0 0 1px #6366f1;
    }

    .plan-card.premium.selected {
      border-color: #7c3aed;
      background: #faf5ff;
      box-shadow: 0 0 0 1px #7c3aed;
    }

    .badge-recommended {
      position: absolute;
      top: -10px;
      right: 12px;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .plan-header h3 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
    }

    .plan-price {
      font-size: 24px;
      font-weight: 700;
      color: #6366f1;
    }

    .plan-price small { font-size: 13px; font-weight: 400; color: #9ca3af; }

    .premium .plan-price { color: #7c3aed; }

    .plan-features {
      list-style: none;
      padding: 0;
      margin: 16px 0 0;
    }

    .plan-features li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #4b5563;
      padding: 4px 0;
    }

    .plan-features li mat-icon {
      font-size: 16px; width: 16px; height: 16px; color: #22c55e;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .error-banner mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .submit-btn {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 10px !important;
      margin-top: 8px;
    }

    .auth-link {
      text-align: center;
      margin-top: 24px;
      color: #6b7280;
      font-size: 14px;
    }

    .auth-link a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 600;
    }

    .auth-link a:hover { text-decoration: underline; }

    @media (max-width: 640px) {
      .register-card { padding: 24px; }
      .form-row.two-cols { grid-template-columns: 1fr; }
      .plan-cards { grid-template-columns: 1fr; }
    }
  `]
})
export class RegisterComponent {
  nomeEmpresa = '';
  documento = '';
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  telefone = '';
  plano = 'FREE';
  loading = false;
  showPassword = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {}

  onDocumentoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '');
    if (digits.length <= 11) {
      // CPF: XXX.XXX.XXX-XX
      if (digits.length > 9) digits = digits.substring(0, 11);
      let masked = '';
      for (let i = 0; i < digits.length; i++) {
        if (i === 3 || i === 6) masked += '.';
        if (i === 9) masked += '-';
        masked += digits[i];
      }
      this.documento = masked;
    } else {
      // CNPJ: XX.XXX.XXX/XXXX-XX
      if (digits.length > 14) digits = digits.substring(0, 14);
      let masked = '';
      for (let i = 0; i < digits.length; i++) {
        if (i === 2 || i === 5) masked += '.';
        if (i === 8) masked += '/';
        if (i === 12) masked += '-';
        masked += digits[i];
      }
      this.documento = masked;
    }
    input.value = this.documento;
  }

  onTelefoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '');
    if (digits.length > 11) digits = digits.substring(0, 11);
    let masked = '';
    if (digits.length > 0) {
      masked = '(' + digits.substring(0, 2);
      if (digits.length > 2) masked += ') ' + digits.substring(2, 7);
      if (digits.length > 7) masked += '-' + digits.substring(7, 11);
    }
    this.telefone = masked;
    input.value = this.telefone;
  }

  isDocumentoValid(): boolean {
    const digits = this.documento.replace(/\D/g, '');
    if (digits.length === 11) {
      // CPF format check
      return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(this.documento);
    }
    if (digits.length === 14) {
      // CNPJ format check
      return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(this.documento);
    }
    return false;
  }

  onSubmit(): void {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'As senhas nao coincidem';
      return;
    }
    if (!this.isDocumentoValid()) {
      this.errorMessage = 'CPF ou CNPJ invalido';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.authService.register({
      nomeEmpresa: this.nomeEmpresa,
      documento: this.documento,
      name: this.name,
      email: this.email,
      password: this.password,
      telefone: this.telefone || undefined,
      plano: this.plano
    }).subscribe({
      next: () => this.router.navigate(['/tutorial']),
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao criar conta. Tente novamente.';
        this.loading = false;
      }
    });
  }
}
