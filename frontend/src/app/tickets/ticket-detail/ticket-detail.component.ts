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
import { MatInputModule } from '@angular/material/input';
import { Ticket } from '../../models/ticket.model';
import { RepoConfig } from '../../models/repo-config.model';
import { TicketService } from '../../services/ticket.service';
import { RepoConfigService } from '../../services/repo-config.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatSnackBarModule, MatDividerModule, MatProgressSpinnerModule, MatInputModule],
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

          <!-- PR Info Expandido -->
          <div class="pr-info" *ngIf="ticket.prUrl">
            <mat-divider></mat-divider>
            <div class="pr-card-expanded">
              <div class="pr-header">
                <div class="pr-header-left">
                  <mat-icon class="pr-icon">merge_type</mat-icon>
                  <div>
                    <strong class="pr-title">Pull Request</strong>
                    <span class="badge pr-status-badge"
                          [class.pr-open]="ticket.prStatus === 'OPEN'"
                          [class.pr-merged]="ticket.prStatus === 'MERGED'"
                          [class.pr-closed]="ticket.prStatus === 'CLOSED'">
                      {{ ticket.prStatus }}
                    </span>
                  </div>
                </div>
                <a [href]="ticket.prUrl" target="_blank" mat-stroked-button class="pr-link-btn">
                  <mat-icon>open_in_new</mat-icon> Ver no GitHub
                </a>
              </div>

              <div class="pr-details">
                <div class="pr-detail-item">
                  <mat-icon>account_tree</mat-icon>
                  <span class="pr-detail-label">Branch:</span>
                  <code class="pr-branch-name">{{ ticket.prBranch }}</code>
                </div>
                <div class="pr-detail-item" *ngIf="prSummaryData?.repo">
                  <mat-icon>folder</mat-icon>
                  <span class="pr-detail-label">Repositorio:</span>
                  <span>{{ prSummaryData.repo }}</span>
                </div>
                <div class="pr-detail-item" *ngIf="prSummaryData?.filesChanged">
                  <mat-icon>description</mat-icon>
                  <span class="pr-detail-label">Arquivos alterados:</span>
                  <span>{{ prSummaryData.filesChanged }}</span>
                </div>
                <div class="pr-detail-item" *ngIf="prSummaryData?.createdAt">
                  <mat-icon>schedule</mat-icon>
                  <span class="pr-detail-label">Criado em:</span>
                  <span>{{ prSummaryData.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>

              <div class="pr-fixes" *ngIf="prSummaryData?.fixes?.length">
                <h4><mat-icon>build_circle</mat-icon> Correcoes aplicadas</h4>
                <div class="pr-fix-item" *ngFor="let fix of prSummaryData.fixes">
                  <div class="pr-fix-file">
                    <mat-icon>insert_drive_file</mat-icon>
                    <code>{{ fix.file }}</code>
                  </div>
                  <p class="pr-fix-explanation">{{ fix.explanation }}</p>
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
                <mat-option value="CODE_REVIEW">Code Review</mat-option>
                <mat-option value="RESOLVIDO">Resolvido</mat-option>
                <mat-option value="FECHADO">Fechado</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <div class="sidebar-section">
            <h3><mat-icon>refresh</mat-icon> Reclassificar</h3>
            <p class="hint">Pede para a IA reavaliar este chamado com o modelo atual</p>
            <button mat-raised-button class="full-btn reclassify-btn" (click)="onReclassify()" [disabled]="reclassifyLoading">
              <mat-spinner *ngIf="reclassifyLoading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!reclassifyLoading">psychology</mat-icon>
              {{ reclassifyLoading ? 'Reclassificando...' : 'Reclassificar com IA' }}
            </button>
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
            <mat-form-field appearance="outline" *ngIf="repoConfigs.length > 0">
              <mat-label>Tipo de branch</mat-label>
              <mat-select [(ngModel)]="branchType">
                <mat-option value="fix">fix</mat-option>
                <mat-option value="feat">feat</mat-option>
                <mat-option value="hotfix">hotfix</mat-option>
                <mat-option value="bugfix">bugfix</mat-option>
                <mat-option value="chore">chore</mat-option>
                <mat-option value="refactor">refactor</mat-option>
                <mat-option value="docs">docs</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" *ngIf="repoConfigs.length > 0">
              <mat-label>Nome da branch</mat-label>
              <input matInput [(ngModel)]="branchNameInput">
            </mat-form-field>
            <div class="branch-preview" *ngIf="repoConfigs.length > 0">
              <code>{{ branchType }}/{{ branchNameInput }}</code>
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
    .st-code_review { background: #ede9fe; color: #7c3aed; }

    .branch-preview {
      margin: -8px 0 12px; padding: 6px 10px; background: #f1f5f9;
      border-radius: 6px; font-size: 13px;
    }
    .branch-preview code {
      font-family: 'Fira Code', 'Consolas', monospace; color: #334155;
    }

    .delete-btn { width: 100%; margin-top: 8px; }

    .reclassify-btn { background: linear-gradient(135deg, #f59e0b, #ef4444) !important; color: white !important; }
    .reclassify-btn mat-spinner { margin-right: 4px; }
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
    .pr-card-expanded {
      background: #f8fffe; border: 1px solid #d1fae5; border-radius: 12px;
      padding: 20px; margin-top: 16px;
    }
    .pr-header {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 12px;
    }
    .pr-header-left { display: flex; align-items: center; gap: 12px; }
    .pr-icon { color: #16a34a; font-size: 28px; width: 28px; height: 28px; }
    .pr-title { font-size: 16px; display: block; }
    .pr-status-badge { margin-left: 8px; font-size: 10px; padding: 2px 8px; border-radius: 4px; }
    .pr-open { background: #dbeafe; color: #1d4ed8; }
    .pr-merged { background: #ede9fe; color: #7c3aed; }
    .pr-closed { background: #fef2f2; color: #dc2626; }
    .pr-link-btn { font-size: 12px; }
    .pr-link-btn mat-icon { font-size: 14px; width: 14px; height: 14px; margin-right: 4px; }

    .pr-details {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      margin-top: 16px; padding: 14px; background: white;
      border-radius: 8px; border: 1px solid #e2e8f0;
    }
    .pr-detail-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .pr-detail-item mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64748b; }
    .pr-detail-label { color: #64748b; }
    .pr-branch-name {
      background: #f1f5f9; padding: 2px 8px; border-radius: 4px;
      font-size: 12px; color: #334155;
    }

    .pr-fixes { margin-top: 16px; }
    .pr-fixes h4 {
      font-size: 13px; font-weight: 600; color: #334155;
      display: flex; align-items: center; gap: 6px; margin: 0 0 12px;
    }
    .pr-fixes h4 mat-icon { font-size: 16px; width: 16px; height: 16px; color: #6366f1; }
    .pr-fix-item {
      background: white; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 12px; margin-bottom: 8px;
    }
    .pr-fix-file { display: flex; align-items: center; gap: 6px; }
    .pr-fix-file mat-icon { font-size: 16px; width: 16px; height: 16px; color: #6366f1; }
    .pr-fix-file code { font-size: 13px; font-weight: 600; color: #1e293b; }
    .pr-fix-explanation { font-size: 12px; color: #64748b; margin: 6px 0 0 22px; }

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
  prSummaryData: any = null;
  reclassifyLoading = false;
  branchType: string = 'fix';
  branchNameInput: string = '';

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
      this.branchNameInput = 'ticket-' + ticket.id;
      this.parsePrSummary();
    });
    this.repoConfigService.findAll().subscribe(configs => this.repoConfigs = configs);
  }

  onAutoFix(): void {
    if (!this.ticket || !this.selectedRepoId) return;
    this.fixLoading = true;
    this.fixResult = null;
    this.repoConfigService.autoFix(this.ticket.id, this.selectedRepoId, this.branchType, this.branchNameInput).subscribe({
      next: (result) => {
        this.fixResult = result;
        this.fixLoading = false;
        if (result.status === 'success') {
          this.snackBar.open('PR criado com sucesso!', 'OK', { duration: 4000 });
          // Reload ticket to get PR info
          this.ticketService.findById(this.ticket!.id).subscribe(t => {
            this.ticket = t;
            this.parsePrSummary();
          });
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

  onReclassify(): void {
    if (!this.ticket) return;
    this.reclassifyLoading = true;
    this.ticketService.reclassify(this.ticket.id).subscribe({
      next: (t) => {
        const oldCat = this.ticket!.categoria;
        const oldPri = this.ticket!.prioridade;
        const oldScore = this.ticket!.aiScore;
        this.ticket = t;
        this.feedbackCategoria = t.categoria;
        this.feedbackPrioridade = t.prioridade;
        this.newStatus = t.status;
        this.reclassifyLoading = false;
        this.snackBar.open(
          `Reclassificado! ${oldCat} → ${t.categoria} | ${oldPri} → ${t.prioridade} | Score: ${(t.aiScore * 100).toFixed(0)}%`,
          'OK', { duration: 5000 }
        );
      },
      error: () => {
        this.reclassifyLoading = false;
        this.snackBar.open('Erro ao reclassificar. Verifique se a IA esta rodando.', 'OK', { duration: 4000 });
      }
    });
  }

  parsePrSummary(): void {
    if (this.ticket?.prSummary) {
      try {
        this.prSummaryData = JSON.parse(this.ticket.prSummary);
      } catch (e) {
        this.prSummaryData = null;
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/tickets']);
  }
}
