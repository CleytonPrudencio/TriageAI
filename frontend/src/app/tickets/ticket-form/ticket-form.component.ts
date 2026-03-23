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
        <!-- Loading overlay -->
        <div class="loading-overlay" *ngIf="loading">
          <div class="loading-content">
            <mat-spinner diameter="48"></mat-spinner>
            <h3>Classificando com IA...</h3>
            <p>Analisando o chamado e atribuindo categoria e prioridade</p>
          </div>
        </div>

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
            <span>Branch: Auto (IA)</span>
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
    </div>
  `,
  styles: [`
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .form-layout { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 24px; max-width: 720px; }

    .form-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 32px; position: relative;
      overflow: hidden;
    }

    .loading-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.92); z-index: 10;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius);
    }
    .loading-content { text-align: center; }
    .loading-content mat-spinner { margin: 0 auto 16px; }
    .loading-content h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #1e40af; }
    .loading-content p { margin: 0; font-size: 14px; color: #64748b; }

    mat-form-field { width: 100%; margin-bottom: 8px; }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    .submit-btn { height: 44px; border-radius: 10px !important; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .submit-btn mat-spinner { margin-right: 4px; }


    .sistema-chip {
      display: flex; align-items: center; gap: 8px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #1e40af;
      flex-wrap: wrap;
    }
    .sistema-chip-icon { font-size: 16px; width: 16px; height: 16px; color: #3b82f6; }
    .chip-sep { color: #93c5fd; }

  `]
})
export class TicketFormComponent {
  titulo = '';
  descricao = '';
  loading = false;
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
        this.snackBar.open('Chamado criado com sucesso!', 'OK', { duration: 3000 });
        this.router.navigate(['/tickets', ticket.id]);
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
