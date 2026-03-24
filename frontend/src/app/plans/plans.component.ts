import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: PlanFeature[];
  cta: string;
  highlighted: boolean;
  colorClass: string;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="plans-page">
      <div class="plans-header">
        <a routerLink="/login" class="back-link"><mat-icon>arrow_back</mat-icon> Voltar</a>
        <div class="logo-icon"><mat-icon>psychology</mat-icon></div>
        <h1>Escolha o plano ideal para voce</h1>
        <p>Comece gratuitamente e escale conforme sua necessidade</p>
      </div>

      <div class="plans-grid">
        <div *ngFor="let plan of plans" class="plan-card" [class.highlighted]="plan.highlighted" [class]="plan.colorClass">
          <div class="ribbon" *ngIf="plan.highlighted">Mais Popular</div>
          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-pricing">
            <span class="plan-price">{{ plan.price }}</span>
            <span class="plan-period" *ngIf="plan.period">{{ plan.period }}</span>
          </div>
          <ul class="plan-features">
            <li *ngFor="let feature of plan.features" [class.disabled]="!feature.included">
              <mat-icon [class.check]="feature.included" [class.cross]="!feature.included">
                {{ feature.included ? 'check_circle' : 'cancel' }}
              </mat-icon>
              {{ feature.text }}
            </li>
          </ul>
          <a *ngIf="plan.cta !== 'Contato'" routerLink="/register" class="plan-cta" [class.cta-highlighted]="plan.highlighted">
            {{ plan.cta }}
          </a>
          <a *ngIf="plan.cta === 'Contato'" href="mailto:contato@triageai.com" class="plan-cta cta-outline">
            {{ plan.cta }}
          </a>
        </div>
      </div>

      <div class="plans-footer">
        <p>Todos os planos incluem suporte por email e atualizacoes automaticas.</p>
        <p>Duvidas? <a href="mailto:contato@triageai.com">Entre em contato</a></p>
      </div>
    </div>
  `,
  styles: [`
    .plans-page {
      min-height: 100vh;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      padding: 40px 24px 60px;
    }

    .plans-header {
      text-align: center;
      max-width: 600px;
      margin: 0 auto 48px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #6366f1;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
    }

    .back-link:hover { text-decoration: underline; }
    .back-link mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .logo-icon {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-radius: 14px;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
    }

    .logo-icon mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }

    .plans-header h1 {
      font-size: 32px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 0 0 12px;
    }

    .plans-header p { color: #6b7280; font-size: 16px; margin: 0; }

    /* Grid */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
      align-items: start;
    }

    /* Card */
    .plan-card {
      background: white;
      border-radius: 16px;
      padding: 28px 22px;
      border: 2px solid #e5e7eb;
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }

    .plan-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    }

    .plan-card.highlighted {
      border-color: #7c3aed;
      box-shadow: 0 8px 30px rgba(124, 58, 237, 0.15);
      transform: scale(1.03);
      z-index: 1;
    }

    .plan-card.highlighted:hover {
      transform: scale(1.03) translateY(-4px);
    }

    .ribbon {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .plan-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      margin-top: 4px;
    }

    .plan-pricing {
      margin-bottom: 24px;
    }

    .plan-price {
      font-size: 32px;
      font-weight: 800;
      color: #111827;
    }

    .plan-period {
      font-size: 14px;
      color: #9ca3af;
      font-weight: 400;
    }

    /* Features */
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0 0 24px;
      flex: 1;
    }

    .plan-features li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      color: #374151;
      padding: 6px 0;
      line-height: 1.4;
    }

    .plan-features li.disabled { color: #d1d5db; }

    .plan-features li mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .plan-features li mat-icon.check { color: #22c55e; }
    .plan-features li mat-icon.cross { color: #d1d5db; }

    /* CTA */
    .plan-cta {
      display: block;
      text-align: center;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      background: #f3f4f6;
      color: #374151;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .plan-cta:hover { background: #e5e7eb; }

    .plan-cta.cta-highlighted {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
    }

    .plan-cta.cta-highlighted:hover {
      background: linear-gradient(135deg, #6d28d9, #5b21b6);
    }

    .plan-cta.cta-outline {
      background: transparent;
      border: 2px solid #d97706;
      color: #d97706;
    }

    .plan-cta.cta-outline:hover {
      background: #fffbeb;
    }

    /* Footer */
    .plans-footer {
      text-align: center;
      margin-top: 48px;
      color: #9ca3af;
      font-size: 14px;
    }

    .plans-footer p { margin: 4px 0; }
    .plans-footer a { color: #6366f1; text-decoration: none; font-weight: 500; }
    .plans-footer a:hover { text-decoration: underline; }

    /* Responsive */
    @media (max-width: 1100px) {
      .plans-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 768px) {
      .plans-grid { grid-template-columns: repeat(2, 1fr); }
      .plan-card.highlighted { transform: scale(1); }
      .plan-card.highlighted:hover { transform: translateY(-4px); }
    }

    @media (max-width: 520px) {
      .plans-grid { grid-template-columns: 1fr; max-width: 380px; }
      .plans-header h1 { font-size: 24px; }
    }
  `]
})
export class PlansComponent {
  plans: Plan[] = [
    {
      id: 'FREE',
      name: 'Free',
      price: 'R$0',
      period: '/mes',
      highlighted: false,
      colorClass: '',
      cta: 'Comecar',
      features: [
        { text: '50 tickets/mes', included: true },
        { text: '3 usuarios', included: true },
        { text: '1 sistema', included: true },
        { text: 'IA basica', included: true },
        { text: 'Auto-fix', included: false },
        { text: 'API', included: false },
        { text: 'Analises Claude', included: false },
        { text: 'Suporte prioritario', included: false },
      ]
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 'R$99',
      period: '/mes',
      highlighted: false,
      colorClass: '',
      cta: 'Assinar',
      features: [
        { text: '500 tickets/mes', included: true },
        { text: '10 usuarios', included: true },
        { text: '5 sistemas', included: true },
        { text: 'IA basica', included: true },
        { text: 'Auto-fix', included: true },
        { text: 'API', included: true },
        { text: 'Analises Claude', included: false },
        { text: 'Suporte prioritario', included: false },
      ]
    },
    {
      id: 'BUSINESS',
      name: 'Business',
      price: 'R$299',
      period: '/mes',
      highlighted: false,
      colorClass: '',
      cta: 'Assinar',
      features: [
        { text: 'Tickets ilimitados', included: true },
        { text: 'Usuarios ilimitados', included: true },
        { text: 'Sistemas ilimitados', included: true },
        { text: 'IA avancada', included: true },
        { text: 'Auto-fix', included: true },
        { text: 'API', included: true },
        { text: 'Analises Claude', included: false },
        { text: 'Suporte prioritario', included: false },
      ]
    },
    {
      id: 'BUSINESS_CLAUDE',
      name: 'Business+Claude',
      price: 'R$500',
      period: '/mes',
      highlighted: true,
      colorClass: '',
      cta: 'Assinar',
      features: [
        { text: 'Tickets ilimitados', included: true },
        { text: 'Usuarios ilimitados', included: true },
        { text: 'Sistemas ilimitados', included: true },
        { text: 'IA avancada', included: true },
        { text: 'Auto-fix', included: true },
        { text: 'API', included: true },
        { text: '15 analises Claude/mes', included: true },
        { text: 'Suporte prioritario', included: false },
      ]
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 'R$999',
      period: '/mes',
      highlighted: false,
      colorClass: '',
      cta: 'Contato',
      features: [
        { text: 'Tickets ilimitados', included: true },
        { text: 'Usuarios ilimitados', included: true },
        { text: 'Sistemas ilimitados', included: true },
        { text: 'IA avancada', included: true },
        { text: 'Auto-fix', included: true },
        { text: 'API', included: true },
        { text: '100 analises Claude/mes', included: true },
        { text: 'Suporte prioritario', included: true },
      ]
    }
  ];
}
