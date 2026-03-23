import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TicketService } from '../../services/ticket.service';
import { SistemaService, Sistema } from '../../services/sistema.service';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule, MatSelectModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Novo Chamado</h1>
        <p class="page-subtitle">Descreva seu problema e a IA fara a classificacao automatica</p>
      </div>
    </div>

    <div class="form-layout">
      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>Sistema (opcional)</mat-label>
            <mat-select [(ngModel)]="selectedSistemaId" name="sistemaId" (selectionChange)="onSistemaChange()">
              <mat-option [value]="null">Nenhum</mat-option>
              <mat-option *ngFor="let s of sistemas" [value]="s.id">{{ s.nome }}</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="sistema-chip" *ngIf="selectedSistema">
            <mat-icon class="sistema-chip-icon">dns</mat-icon>
            <span>Repo: {{ selectedSistema.repoFullName || 'N/A' }}</span>
            <span class="chip-sep">|</span>
            <span>Branch: {{ selectedSistema.targetBranch || 'main' }}</span>
            <span class="chip-sep">|</span>
            <span>Auto-fix: {{ selectedSistema.autoFixEnabled ? 'Ativado' : 'Desativado' }}</span>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Titulo do chamado</mat-label>
            <input matInput [(ngModel)]="titulo" name="titulo" required placeholder="Ex: Sistema fora do ar">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descricao detalhada</mat-label>
            <textarea matInput [(ngModel)]="descricao" name="descricao" required rows="8"
                      placeholder="Descreva o problema com o maximo de detalhes possivel..."></textarea>
            <mat-hint align="end">{{ descricao.length }}/2000</mat-hint>
          </mat-form-field>

          <div class="form-actions">
            <button mat-button type="button" (click)="cancel()">Cancelar</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="loading || !titulo || !descricao" class="submit-btn">
              <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!loading">smart_toy</mat-icon>
              {{ loading ? 'Classificando com IA...' : 'Criar e Classificar' }}
            </button>
          </div>
        </form>
      </div>

      <div class="result-card" *ngIf="result">
        <div class="result-header">
          <mat-icon>check_circle</mat-icon>
          <h3>Classificacao da IA</h3>
        </div>
        <div class="result-items">
          <div class="result-item">
            <span class="result-label">Categoria</span>
            <span class="badge" [class]="'cat-' + result.categoria?.toLowerCase()">{{ result.categoria }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Prioridade</span>
            <span class="badge" [class]="'pri-' + result.prioridade?.toLowerCase()">{{ result.prioridade }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Confianca</span>
            <div class="score-bar">
              <div class="score-fill" [style.width.%]="(result.aiScore || 0) * 100"></div>
            </div>
            <span class="score-text">{{ (result.aiScore || 0) * 100 | number:'1.0-0' }}%</span>
          </div>
        </div>
        <p class="result-hint">Voce pode corrigir a classificacao na pagina de detalhes do chamado.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .form-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }

    .form-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 32px;
    }

    mat-form-field { width: 100%; margin-bottom: 8px; }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    .submit-btn { height: 44px; border-radius: 10px !important; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .submit-btn mat-spinner { margin-right: 4px; }

    .result-card {
      background: var(--bg-card); border: 2px solid #10b981;
      border-radius: var(--radius); padding: 32px; height: fit-content;
    }

    .result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .result-header mat-icon { color: #10b981; font-size: 28px; width: 28px; height: 28px; }
    .result-header h3 { margin: 0; font-size: 18px; font-weight: 600; }

    .result-items { display: flex; flex-direction: column; gap: 20px; }
    .result-item { display: flex; align-items: center; gap: 12px; }
    .result-label { font-size: 13px; color: var(--text-secondary); width: 80px; font-weight: 500; }

    .badge {
      padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase;
    }
    .pri-alta { background: #fef2f2; color: #dc2626; }
    .pri-media { background: #fffbeb; color: #d97706; }
    .pri-baixa { background: #f0fdf4; color: #16a34a; }
    .cat-tecnico { background: #eff6ff; color: #2563eb; }
    .cat-financeiro { background: #fdf2f8; color: #db2777; }
    .cat-comercial { background: #f5f3ff; color: #7c3aed; }
    .cat-administrativo { background: #f0fdfa; color: #0d9488; }
    .cat-outros { background: #f8fafc; color: #64748b; }

    .score-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .score-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #06b6d4); border-radius: 4px; transition: width 0.5s; }
    .score-text { font-size: 14px; font-weight: 600; color: var(--primary); min-width: 40px; text-align: right; }

    .result-hint { margin: 20px 0 0; font-size: 12px; color: var(--text-secondary); }

    .sistema-chip {
      display: flex; align-items: center; gap: 8px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #1e40af;
      flex-wrap: wrap;
    }
    .sistema-chip-icon { font-size: 16px; width: 16px; height: 16px; color: #3b82f6; }
    .chip-sep { color: #93c5fd; }

    @media (max-width: 768px) {
      .form-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketFormComponent {
  titulo = '';
  descricao = '';
  loading = false;
  result: any = null;
  sistemas: Sistema[] = [];
  selectedSistemaId: number | null = null;
  selectedSistema: Sistema | null = null;

  constructor(
    private ticketService: TicketService,
    private sistemaService: SistemaService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.sistemaService.findAll().subscribe(sistemas => this.sistemas = sistemas);
  }

  onSistemaChange(): void {
    this.selectedSistema = this.sistemas.find(s => s.id === this.selectedSistemaId) || null;
  }

  onSubmit(): void {
    this.loading = true;
    const data: any = { titulo: this.titulo, descricao: this.descricao };
    if (this.selectedSistemaId) {
      data.sistemaId = this.selectedSistemaId;
    }
    this.ticketService.create(data).subscribe({
      next: (ticket) => {
        this.result = ticket;
        this.loading = false;
        this.snackBar.open('Chamado criado com sucesso!', 'OK', { duration: 3000 });
        setTimeout(() => this.router.navigate(['/tickets', ticket.id]), 2500);
      },
      error: () => {
        this.snackBar.open('Erro ao criar chamado', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/tickets']);
  }
}
