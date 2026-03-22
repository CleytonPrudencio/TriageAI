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
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="auth-page">
      <div class="auth-left">
        <div class="brand">
          <div class="logo">
            <mat-icon>psychology</mat-icon>
          </div>
          <h1>TriageAI</h1>
          <p>Priorizacao inteligente de chamados com Inteligencia Artificial</p>
        </div>
        <div class="features">
          <div class="feature">
            <mat-icon>bolt</mat-icon>
            <span>Classificacao automatica por IA</span>
          </div>
          <div class="feature">
            <mat-icon>speed</mat-icon>
            <span>Reducao de 70% no tempo de triagem</span>
          </div>
          <div class="feature">
            <mat-icon>trending_up</mat-icon>
            <span>Aprendizado continuo com feedback</span>
          </div>
        </div>
      </div>

      <div class="auth-right">
        <div class="auth-form-wrapper">
          <h2>Bem-vindo de volta</h2>
          <p class="subtitle">Entre com suas credenciais para continuar</p>

          <form (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput type="email" [(ngModel)]="email" name="email" required placeholder="seu@email.com">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" required>
              <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" class="submit-btn" [disabled]="loading">
              {{ loading ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>

          <p class="auth-link">
            Nao tem conta? <a routerLink="/register">Criar conta</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      min-height: 100vh;
    }

    .auth-left {
      flex: 1;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px;
      color: white;
    }

    .brand .logo {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .brand .logo mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .brand h1 {
      font-size: 40px;
      font-weight: 700;
      margin: 0 0 12px;
    }

    .brand p {
      font-size: 18px;
      opacity: 0.85;
      margin: 0 0 48px;
      line-height: 1.6;
    }

    .features {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 15px;
      opacity: 0.9;
    }

    .feature mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      opacity: 0.8;
    }

    .auth-right {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: var(--bg);
    }

    .auth-form-wrapper {
      width: 100%;
      max-width: 420px;
    }

    h2 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      color: var(--text);
    }

    .subtitle {
      color: var(--text-secondary);
      margin: 0 0 32px;
      font-size: 15px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 4px;
    }

    mat-icon[matPrefix] {
      margin-right: 8px;
      color: var(--text-secondary);
    }

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
      color: var(--text-secondary);
      font-size: 14px;
    }

    .auth-link a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .auth-page { flex-direction: column; }
      .auth-left { padding: 40px 24px; min-height: auto; }
      .brand h1 { font-size: 28px; }
      .brand p { font-size: 14px; margin-bottom: 24px; }
      .features { display: none; }
      .auth-right { padding: 24px; }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  showPassword = false;

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {}

  onSubmit(): void {
    this.loading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.snackBar.open('Email ou senha incorretos', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }
}
