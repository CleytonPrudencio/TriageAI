import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ticket } from '../../models/ticket.model';
import { RepoConfig } from '../../models/repo-config.model';
import { TicketService } from '../../services/ticket.service';
import { RepoConfigService } from '../../services/repo-config.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatSnackBarModule, MatDividerModule, MatProgressSpinnerModule],
  template: `
    <div *ngIf="ticket">
      <div class="page-header">
        <button mat-button (click)="goBack()" class="back-btn">
          <mat-icon>arrow_back</mat-icon> Voltar
        </button>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <div class="detail-top">
            <span class="ticket-id">#{{ ticket.id }}</span>
            <span class="badge priority" [class]="'pri-' + ticket.prioridade?.toLowerCase()">{{ ticket.prioridade }}</span>
            <span class="badge status" [class]="'st-' + ticket.status?.toLowerCase()">{{ ticket.status?.replace('_', ' ') }}</span>
          </div>

          <h1 class="detail-title">{{ ticket.titulo }}</h1>

          <div class="meta-row">
            <div class="meta-item">
              <mat-icon>person</mat-icon>
              <span>{{ ticket.userName || 'N/A' }}</span>
            </div>
            <div class="meta-item">
              <mat-icon>calendar_today</mat-icon>
              <span>{{ ticket.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="meta-item">
              <mat-icon>smart_toy</mat-icon>
              <span>Score IA: {{ (ticket.aiScore || 0) * 100 | number:'1.0-0' }}%</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="detail-description">
            <h3>Descricao</h3>
            <p>{{ ticket.descricao }}</p>
          </div>

          <!-- PR Info -->
          <div class="pr-info" *ngIf="ticket.prUrl">
            <mat-divider></mat-divider>
            <div class="pr-card">
              <mat-icon>merge_type</mat-icon>
              <div>
                <strong>Pull Request</strong>
                <a [href]="ticket.prUrl" target="_blank" class="pr-link">{{ ticket.prUrl }}</a>
                <div class="pr-meta">
                  <span class="badge st-aberto">{{ ticket.prStatus }}</span>
                  <span>Branch: {{ ticket.prBranch }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="sidebar-section">
            <h3>Informacoes</h3>
            <div class="info-row">
              <span class="info-label">Categoria</span>
              <span class="badge" [class]="'cat-' + ticket.categoria?.toLowerCase()">{{ ticket.categoria }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Prioridade</span>
              <span class="badge" [class]="'pri-' + ticket.prioridade?.toLowerCase()">{{ ticket.prioridade }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="badge" [class]="'st-' + ticket.status?.toLowerCase()">{{ ticket.status }}</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="sidebar-section">
            <h3>Alterar Status</h3>
            <mat-form-field appearance="outline">
              <mat-select [(ngModel)]="newStatus" (selectionChange)="onStatusChange()">
                <mat-option value="ABERTO">Aberto</mat-option>
                <mat-option value="EM_ANDAMENTO">Em Andamento</mat-option>
                <mat-option value="RESOLVIDO">Resolvido</mat-option>
                <mat-option value="FECHADO">Fechado</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <div class="sidebar-section">
            <h3><mat-icon>feedback</mat-icon> Corrigir IA</h3>
            <p class="hint">Corrija a classificacao para melhorar o modelo</p>
            <mat-form-field appearance="outline">
              <mat-label>Categoria correta</mat-label>
              <mat-select [(ngModel)]="feedbackCategoria">
                <mat-option value="TECNICO">Tecnico</mat-option>
                <mat-option value="FINANCEIRO">Financeiro</mat-option>
                <mat-option value="COMERCIAL">Comercial</mat-option>
                <mat-option value="ADMINISTRATIVO">Administrativo</mat-option>
                <mat-option value="OUTROS">Outros</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Prioridade correta</mat-label>
              <mat-select [(ngModel)]="feedbackPrioridade">
                <mat-option value="ALTA">Alta</mat-option>
                <mat-option value="MEDIA">Media</mat-option>
                <mat-option value="BAIXA">Baixa</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="onFeedback()" class="full-btn" [disabled]="feedbackLoading">
              <mat-spinner *ngIf="feedbackLoading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!feedbackLoading">send</mat-icon>
              {{ feedbackLoading ? 'Enviando...' : 'Enviar Correcao' }}
            </button>
          </div>

          <mat-divider></mat-divider>

          <div class="sidebar-section" *ngIf="ticket.categoria === 'TECNICO'">
            <h3><mat-icon>build</mat-icon> Auto-Fix</h3>
            <p class="hint">Analisa o repo e cria um PR com a correcao</p>
            <mat-form-field appearance="outline" *ngIf="repoConfigs.length > 0">
              <mat-label>Repositorio</mat-label>
              <mat-select [(ngModel)]="selectedRepoId">
                <mat-option *ngFor="let rc of repoConfigs" [value]="rc.id">
                  {{ rc.name }} ({{ rc.repoOwner }}/{{ rc.repoName }})
                </mat-option>
              </mat-select>
            </mat-form-field>
            <div *ngIf="repoConfigs.length === 0" class="hint">
              Nenhum repo configurado. Va em Configuracoes > Repositorios.
            </div>
            <button mat-raised-button color="accent" (click)="onAutoFix()" class="full-btn autofix-btn"
                    [disabled]="!selectedRepoId || fixLoading" *ngIf="repoConfigs.length > 0 && !ticket.prUrl">
              <mat-spinner *ngIf="fixLoading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!fixLoading">rocket_launch</mat-icon>
              {{ fixLoading ? 'Analisando e criando PR...' : 'Executar Auto-Fix' }}
            </button>
            <div *ngIf="fixResult" class="fix-result" [class.success]="fixResult.status === 'success'" [class.error]="fixResult.status === 'error'">
              <mat-icon>{{ fixResult.status === 'success' ? 'check_circle' : 'error' }}</mat-icon>
              <span>{{ fixResult.message }}</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <button mat-button color="warn" (click)="onDelete()" class="delete-btn">
            <mat-icon>delete_outline</mat-icon> Excluir chamado
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back-btn { color: var(--text-secondary); margin-bottom: 16px; }

    .detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }

    .detail-main {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 32px;
    }

    .detail-top { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .ticket-id { color: var(--text-secondary); font-size: 14px; font-weight: 600; }
    .detail-title { font-size: 24px; font-weight: 700; margin: 0 0 16px; }

    .meta-row { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
    .meta-item { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; }
    .meta-item mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .detail-description { margin-top: 24px; }
    .detail-description h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-description p { font-size: 15px; line-height: 1.7; color: var(--text); margin: 0; }

    .detail-sidebar {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px;
      height: fit-content;
    }

    .sidebar-section { padding: 16px 0; }
    .sidebar-section:first-child { padding-top: 0; }
    .sidebar-section h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; display: flex; align-items: center; gap: 6px; }
    .sidebar-section h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }

    .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .info-label { font-size: 13px; color: var(--text-secondary); }

    .hint { font-size: 12px; color: var(--text-secondary); margin: 0 0 12px; }

    mat-form-field { width: 100%; }

    .full-btn { width: 100%; height: 40px; border-radius: 8px !important; font-weight: 600; }

    .badge {
      padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase;
    }
    .pri-alta { background: #fef2f2; color: #dc2626; }
    .pri-media { background: #fffbeb; color: #d97706; }
    .pri-baixa { background: #f0fdf4; color: #16a34a; }
    .cat-tecnico { background: #eff6ff; color: #2563eb; }
    .cat-financeiro { background: #fdf2f8; color: #db2777; }
    .cat-comercial { background: #f5f3ff; color: #7c3aed; }
    .cat-administrativo { background: #f0fdfa; color: #0d9488; }
    .cat-outros { background: #f8fafc; color: #64748b; }
    .st-aberto { background: #dbeafe; color: #1d4ed8; }
    .st-em_andamento { background: #fef3c7; color: #b45309; }
    .st-resolvido { background: #d1fae5; color: #059669; }
    .st-fechado { background: #f1f5f9; color: #475569; }

    .delete-btn { width: 100%; margin-top: 8px; }

    .autofix-btn { background: linear-gradient(135deg, #6366f1, #06b6d4) !important; color: white !important; }
    .autofix-btn mat-spinner { margin-right: 4px; }

    .fix-result {
      display: flex; align-items: center; gap: 8px; padding: 12px;
      border-radius: 8px; margin-top: 12px; font-size: 13px;
    }
    .fix-result.success { background: #f0fdf4; color: #16a34a; }
    .fix-result.error { background: #fef2f2; color: #dc2626; }
    .fix-result mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .pr-info { margin-top: 24px; }
    .pr-card {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 16px; background: #f0fdf4; border-radius: 8px; margin-top: 16px;
    }
    .pr-card mat-icon { color: #16a34a; font-size: 24px; width: 24px; height: 24px; margin-top: 2px; }
    .pr-link { color: var(--primary); text-decoration: none; font-size: 13px; display: block; margin-top: 4px; word-break: break-all; }
    .pr-meta { display: flex; gap: 12px; align-items: center; margin-top: 8px; font-size: 12px; color: var(--text-secondary); }

    @media (max-width: 768px) {
      .detail-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketDetailComponent implements OnInit {
  ticket: Ticket | null = null;
  newStatus = '';
  feedbackCategoria = '';
  feedbackPrioridade = '';
  repoConfigs: RepoConfig[] = [];
  selectedRepoId: number | null = null;
  feedbackLoading = false;
  fixLoading = false;
  fixResult: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private repoConfigService: RepoConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.ticketService.findById(id).subscribe(ticket => {
      this.ticket = ticket;
      this.newStatus = ticket.status;
      this.feedbackCategoria = ticket.categoria;
      this.feedbackPrioridade = ticket.prioridade;
    });
    this.repoConfigService.findAll().subscribe(configs => this.repoConfigs = configs);
  }

  onAutoFix(): void {
    if (!this.ticket || !this.selectedRepoId) return;
    this.fixLoading = true;
    this.fixResult = null;
    this.repoConfigService.autoFix(this.ticket.id, this.selectedRepoId).subscribe({
      next: (result) => {
        this.fixResult = result;
        this.fixLoading = false;
        if (result.status === 'success') {
          this.snackBar.open('PR criado com sucesso!', 'OK', { duration: 4000 });
          // Reload ticket to get PR info
          this.ticketService.findById(this.ticket!.id).subscribe(t => this.ticket = t);
        }
      },
      error: (err) => {
        this.fixResult = { status: 'error', message: 'Erro ao executar auto-fix' };
        this.fixLoading = false;
      }
    });
  }

  onStatusChange(): void {
    if (!this.ticket) return;
    this.ticketService.updateStatus(this.ticket.id, this.newStatus).subscribe({
      next: (t) => {
        this.ticket = t;
        this.snackBar.open('Status atualizado', 'OK', { duration: 2000 });
      },
      error: (err) => {
        console.error('Status error:', err);
        this.snackBar.open('Erro ao atualizar status', 'OK', { duration: 3000 });
      }
    });
  }

  onFeedback(): void {
    if (!this.ticket) return;
    this.feedbackLoading = true;
    this.ticketService.feedback(this.ticket.id, {
      categoria: this.feedbackCategoria,
      prioridade: this.feedbackPrioridade
    }).subscribe({
      next: (t) => {
        this.ticket = t;
        this.feedbackLoading = false;
        this.snackBar.open('Correcao enviada! A IA vai aprender com isso.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.feedbackLoading = false;
        console.error('Feedback error:', err);
        this.snackBar.open('Erro ao enviar correcao: ' + (err.error?.message || err.message || 'erro desconhecido'), 'OK', { duration: 4000 });
      }
    });
  }

  onDelete(): void {
    if (!this.ticket) return;
    if (confirm('Tem certeza que deseja excluir este chamado?')) {
      this.ticketService.delete(this.ticket.id).subscribe(() => {
        this.snackBar.open('Chamado excluido', 'OK', { duration: 2000 });
        this.router.navigate(['/tickets']);
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/tickets']);
  }
}
