import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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

          <!-- Auto-Fix Processing Banner -->
          <div class="processing-banner" *ngIf="ticket.status === 'EM_ANDAMENTO' && !ticket.prUrl">
            <div class="processing-content">
              <div class="processing-spinner"></div>
              <div class="processing-text">
                <h4>IA Processando Auto-Fix</h4>
                <p>A IA esta analisando o repositorio e gerando a correcao automaticamente. Isso pode levar alguns minutos.</p>
                <div class="processing-steps">
                  <span class="step active"><mat-icon>check_circle</mat-icon> Ticket classificado</span>
                  <span class="step active"><mat-icon>sync</mat-icon> Analisando codigo...</span>
                  <span class="step"><mat-icon>schedule</mat-icon> Criando branch e PR</span>
                </div>
              </div>
            </div>
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
                <div class="pr-header-actions">
                  <a [href]="ticket.prUrl" target="_blank" mat-stroked-button class="pr-link-btn">
                    <mat-icon>open_in_new</mat-icon> Ver no GitHub
                  </a>
                  <button mat-stroked-button color="warn" class="pr-action-btn"
                          (click)="deleteAutoFix()" [disabled]="deletingFix"
                          *ngIf="ticket.prStatus === 'OPEN' || ticket.prStatus === 'FAILED' || ticket.prStatus === 'ANALYSIS_FAILED'">
                    <mat-icon>{{ deletingFix ? 'hourglass_empty' : 'delete_sweep' }}</mat-icon>
                    {{ deletingFix ? 'Removendo...' : 'Apagar PR e Branch' }}
                  </button>
                </div>
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

              <!-- Resumo geral do PR -->
              <div class="pr-summary-box" *ngIf="prSummaryData?.fixes?.length">
                <h4><mat-icon>summarize</mat-icon> Resumo da Correcao</h4>
                <p class="pr-summary-text">
                  A IA analisou o repositorio <strong>{{ prSummaryData?.repo }}</strong>,
                  identificou os arquivos afetados e gerou <strong>{{ prSummaryData?.filesChanged }} correcao(oes)</strong>
                  na branch <code class="branch-code-inline">{{ ticket.prBranch }}</code>.
                  As alteracoes incluem {{ getFixSummaryText() }}.
                </p>
              </div>

              <!-- Review / Approve (para casos excepcionais) -->
              <div class="pr-review-section" *ngIf="ticket.prStatus === 'OPEN'">
                <h4><mat-icon>rate_review</mat-icon> Review</h4>
                <div class="review-actions">
                  <button mat-raised-button class="approve-btn" (click)="approvePr()" [disabled]="reviewLoading">
                    <mat-icon>check_circle</mat-icon>
                    {{ reviewLoading ? 'Enviando...' : 'Aprovar PR' }}
                  </button>
                  <button mat-stroked-button color="warn" class="request-changes-btn" (click)="requestChangesPr()" [disabled]="reviewLoading">
                    <mat-icon>feedback</mat-icon>
                    Solicitar Alteracoes
                  </button>
                </div>
                <mat-form-field appearance="outline" class="review-comment-field" *ngIf="showReviewComment">
                  <mat-label>Comentario (opcional)</mat-label>
                  <textarea matInput [(ngModel)]="reviewComment" rows="3"></textarea>
                </mat-form-field>
                <button mat-flat-button color="warn" class="send-review-btn" *ngIf="showReviewComment"
                        (click)="submitRequestChanges()" [disabled]="reviewLoading">
                  <mat-icon>send</mat-icon> Enviar Review
                </button>
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

          <!-- Auto-Fix inline (shown when no PR exists) -->
          <div class="autofix-inline" *ngIf="!ticket.prUrl && ticket.categoria === 'TECNICO' && repoConfigs.length > 0">
            <div class="autofix-inline-header">
              <mat-icon>build</mat-icon>
              <div>
                <h4>Auto-Fix</h4>
                <p>Selecione o repositorio e execute para gerar a correcao automaticamente</p>
              </div>
            </div>
            <div class="autofix-inline-form">
              <mat-form-field appearance="outline">
                <mat-label>Repositorio *</mat-label>
                <mat-select [(ngModel)]="selectedRepoId">
                  <mat-option *ngFor="let rc of repoConfigs" [value]="rc.id">
                    {{ rc.name }} ({{ rc.repoOwner }}/{{ rc.repoName }})
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <div class="autofix-inline-row">
                <mat-form-field appearance="outline" class="inline-field">
                  <mat-label>Tipo</mat-label>
                  <mat-select [(ngModel)]="branchType">
                    <mat-option value="auto">auto (IA)</mat-option>
                    <mat-option value="fix">fix</mat-option>
                    <mat-option value="feat">feat</mat-option>
                    <mat-option value="hotfix">hotfix</mat-option>
                    <mat-option value="bugfix">bugfix</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="inline-field">
                  <mat-label>Nome *</mat-label>
                  <input matInput [(ngModel)]="branchNameInput">
                </mat-form-field>
              </div>
              <div class="branch-preview" *ngIf="selectedRepoId && branchNameInput">
                <code>{{ branchType === 'auto' ? '(IA)' : branchType }}/{{ branchNameInput }}</code>
              </div>
              <button mat-raised-button class="autofix-inline-btn" (click)="onAutoFix()"
                      [disabled]="!selectedRepoId || !branchNameInput || fixLoading">
                <mat-spinner *ngIf="fixLoading" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!fixLoading">rocket_launch</mat-icon>
                {{ fixLoading ? 'Analisando e criando PR...' : 'Executar Auto-Fix' }}
              </button>
            </div>
            <div *ngIf="fixResult" class="fix-result" [class.success]="fixResult.status === 'success'" [class.error]="fixResult.status === 'error'">
              <mat-icon>{{ fixResult.status === 'success' ? 'check_circle' : 'error' }}</mat-icon>
              <span>{{ fixResult.message }}</span>
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

          <!-- Sistema Info -->
          <div class="sidebar-section" *ngIf="ticket.sistemaName">
            <mat-divider></mat-divider>
            <h3><mat-icon class="section-title-icon">dns</mat-icon> Sistema</h3>
            <div class="sistema-info-card">
              <div class="info-row">
                <span class="info-label">Sistema</span>
                <strong>{{ ticket.sistemaName }}</strong>
              </div>
              <div class="info-row" *ngIf="ticket.sistemaAutoFix !== undefined && ticket.sistemaAutoFix !== null">
                <span class="info-label">Auto-Fix</span>
                <span class="badge auto-fix-badge" *ngIf="ticket.sistemaAutoFix">Automatico</span>
                <span class="badge" style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;" *ngIf="!ticket.sistemaAutoFix">Desativado</span>
              </div>
            </div>
          </div>

          <!-- Repo Info -->
          <div class="sidebar-section repo-info-section" *ngIf="prSummaryData?.repo || ticket.prUrl">
            <mat-divider></mat-divider>
            <h3><mat-icon class="section-title-icon">source</mat-icon> Repositorio</h3>
            <div class="repo-info-card">
              <div class="info-row" *ngIf="prSummaryData?.repo">
                <span class="info-label">Repo</span>
                <a [href]="'https://github.com/' + prSummaryData.repo" target="_blank" class="repo-link">
                  <mat-icon class="repo-icon-sm">open_in_new</mat-icon>
                  {{ prSummaryData.repo }}
                </a>
              </div>
              <div class="info-row" *ngIf="ticket.prBranch">
                <span class="info-label">Branch</span>
                <code class="branch-code">{{ ticket.prBranch }}</code>
              </div>
              <div class="info-row" *ngIf="ticket.prStatus">
                <span class="info-label">PR Status</span>
                <span class="badge pr-status-sm"
                      [class.pr-open]="ticket.prStatus === 'OPEN'"
                      [class.pr-merged]="ticket.prStatus === 'MERGED'"
                      [class.pr-approved]="ticket.prStatus === 'APPROVED'"
                      [class.pr-closed]="ticket.prStatus === 'CLOSED'">
                  {{ ticket.prStatus }}
                </span>
              </div>
              <div class="info-row" *ngIf="prSummaryData?.filesChanged">
                <span class="info-label">Arquivos</span>
                <span>{{ prSummaryData.filesChanged }} alterado(s)</span>
              </div>
              <a *ngIf="ticket.prUrl" [href]="ticket.prUrl" target="_blank"
                 mat-stroked-button class="repo-pr-btn">
                <mat-icon>open_in_new</mat-icon> Ver PR no GitHub
              </a>
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

          <div class="sidebar-section" id="autofix-section" *ngIf="ticket.categoria === 'TECNICO'">
            <h3><mat-icon>build</mat-icon> Auto-Fix</h3>
            <p class="hint">Analisa o repo e cria um PR com a correcao</p>

            <!-- Validacao: nenhum repo configurado -->
            <div *ngIf="repoConfigs.length === 0" class="validation-alert">
              <mat-icon>warning</mat-icon>
              <span>Nenhum repositorio configurado. Va em <strong>Repositorios</strong> para adicionar.</span>
            </div>

            <!-- Repo select -->
            <mat-form-field appearance="outline" *ngIf="repoConfigs.length > 0">
              <mat-label>Repositorio *</mat-label>
              <mat-select [(ngModel)]="selectedRepoId">
                <mat-option *ngFor="let rc of repoConfigs" [value]="rc.id">
                  {{ rc.name }} ({{ rc.repoOwner }}/{{ rc.repoName }})
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="!selectedRepoId" class="validation-hint">Selecione um repositorio</mat-hint>
            </mat-form-field>

            <!-- Branch type -->
            <mat-form-field appearance="outline" *ngIf="repoConfigs.length > 0">
              <mat-label>Tipo de branch</mat-label>
              <mat-select [(ngModel)]="branchType">
                <mat-option value="auto">auto (IA decide)</mat-option>
                <mat-option value="fix">fix</mat-option>
                <mat-option value="feat">feat</mat-option>
                <mat-option value="hotfix">hotfix</mat-option>
                <mat-option value="bugfix">bugfix</mat-option>
                <mat-option value="chore">chore</mat-option>
                <mat-option value="refactor">refactor</mat-option>
                <mat-option value="docs">docs</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Branch name -->
            <mat-form-field appearance="outline" *ngIf="repoConfigs.length > 0">
              <mat-label>Nome da branch *</mat-label>
              <input matInput [(ngModel)]="branchNameInput">
              <mat-hint *ngIf="!branchNameInput" class="validation-hint">Informe o nome da branch</mat-hint>
            </mat-form-field>

            <!-- Preview -->
            <div class="branch-preview" *ngIf="repoConfigs.length > 0 && selectedRepoId && branchNameInput">
              <code>{{ branchType === 'auto' ? '(IA)' : branchType }}/{{ branchNameInput }}</code>
            </div>

            <!-- Botao com validacao -->
            <button mat-raised-button color="accent" (click)="onAutoFix()" class="full-btn autofix-btn"
                    [disabled]="!selectedRepoId || !branchNameInput || fixLoading"
                    *ngIf="repoConfigs.length > 0 && !ticket.prUrl">
              <mat-spinner *ngIf="fixLoading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!fixLoading">rocket_launch</mat-icon>
              {{ fixLoading ? 'Analisando e criando PR...' : 'Executar Auto-Fix' }}
            </button>

            <!-- Mensagem de validacao quando clica sem preencher -->
            <div *ngIf="repoConfigs.length > 0 && (!selectedRepoId || !branchNameInput) && !ticket.prUrl" class="validation-summary">
              <mat-icon>info_outline</mat-icon>
              <span>Preencha repositorio e nome da branch para executar</span>
            </div>

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

    <!-- Confirm Dialog Overlay -->
    <div class="confirm-overlay" *ngIf="confirmDialog.show" (click)="closeConfirm()">
      <div class="confirm-dialog" (click)="$event.stopPropagation()">
        <div class="confirm-icon-wrap">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
        </div>
        <h3 class="confirm-title">{{ confirmDialog.title }}</h3>
        <p class="confirm-message">{{ confirmDialog.message }}</p>
        <div class="confirm-actions">
          <button mat-stroked-button (click)="closeConfirm()">Cancelar</button>
          <button mat-flat-button color="primary" (click)="confirmAction()">Confirmar</button>
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

    /* Confirm Dialog */
    .confirm-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(3px); }
    .confirm-dialog { background: white; border-radius: 16px; padding: 32px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: dialog-in 0.2s ease-out; }
    @keyframes dialog-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .confirm-icon-wrap { width: 56px; height: 56px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .confirm-icon { color: #f59e0b; font-size: 32px; width: 32px; height: 32px; }
    .confirm-title { margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #1e293b; }
    .confirm-message { margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5; }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .confirm-actions button { min-width: 120px; }

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
    .pr-approved { background: #ecfdf5; color: #059669; }
    .pr-closed { background: #fef2f2; color: #dc2626; }
    .pr-link-btn { font-size: 12px; }
    .pr-link-btn mat-icon { font-size: 14px; width: 14px; height: 14px; margin-right: 4px; }

    /* Repo Info Sidebar */
    .sistema-info-card { background: #f0fdf4; border-radius: 8px; padding: 12px; border: 1px solid #bbf7d0; }
    .auto-fix-badge { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }

    .repo-info-section h3 { display: flex; align-items: center; gap: 6px; }
    .section-title-icon { font-size: 20px; width: 20px; height: 20px; color: #6366f1; }
    .repo-info-card { background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }
    .repo-link { color: #6366f1; text-decoration: none; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; }
    .repo-link:hover { text-decoration: underline; }
    .repo-icon-sm { font-size: 14px; width: 14px; height: 14px; }
    .branch-code { background: #eff6ff !important; color: #1d4ed8 !important; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; display: inline-block; border: 1px solid #bfdbfe; }

    /* Validacoes Auto-Fix */
    .validation-alert { display: flex; align-items: center; gap: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 12px; color: #92400e; font-size: 13px; }
    .validation-alert mat-icon { color: #f59e0b; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .validation-hint { color: #ef4444 !important; font-size: 11px; }
    .validation-summary { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 12px; margin-top: 8px; }
    .validation-summary mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .pr-status-sm { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .repo-pr-btn { width: 100%; margin-top: 10px; font-size: 12px; }

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

    .processing-banner {
      background: linear-gradient(135deg, #eff6ff, #f0f9ff);
      border: 1px solid #93c5fd;
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
      animation: pulse-border 2s infinite;
    }
    @keyframes pulse-border {
      0%, 100% { border-color: #93c5fd; }
      50% { border-color: #3b82f6; }
    }
    .processing-content { display: flex; gap: 20px; align-items: flex-start; }
    .processing-spinner {
      width: 40px; height: 40px; border: 3px solid #e2e8f0;
      border-top-color: #3b82f6; border-radius: 50%;
      animation: spin 1s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .processing-text h4 { margin: 0 0 8px; color: #1e40af; font-size: 16px; }
    .processing-text p { margin: 0 0 12px; color: #64748b; font-size: 14px; }
    .processing-steps { display: flex; flex-direction: column; gap: 6px; }
    .processing-steps .step { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 13px; }
    .processing-steps .step.active { color: #3b82f6; }
    .processing-steps .step mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .pr-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .pr-action-btn { font-size: 12px; }

    /* PR Summary */
    .pr-summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .pr-summary-box h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 15px; color: #334155; }
    .pr-summary-text { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
    .branch-code-inline { background: #eff6ff; color: #1d4ed8; padding: 1px 6px; border-radius: 4px; font-size: 12px; border: 1px solid #bfdbfe; }
    .pr-summary-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .pr-summary-list li { display: flex; gap: 10px; align-items: flex-start; background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9; }
    .summary-file-icon { color: #6366f1; font-size: 18px; width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; }
    .summary-file-path { display: block; font-size: 12px; color: #1e293b; font-weight: 600; margin-bottom: 2px; }
    .summary-explanation { display: block; font-size: 12px; color: #64748b; line-height: 1.4; }

    /* Review Section */
    .pr-review-section { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .pr-review-section h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 15px; color: #854d0e; }
    .review-actions { display: flex; gap: 10px; }
    .approve-btn { background: #16a34a !important; color: white !important; }
    .request-changes-btn { font-size: 13px; }
    .review-comment-field { width: 100%; margin-top: 12px; }
    .send-review-btn { width: 100%; margin-top: 4px; }

    /* Auto-Fix Inline (no corpo do ticket) */
    .autofix-inline { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .autofix-inline-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .autofix-inline-header mat-icon { color: #6366f1; font-size: 28px; width: 28px; height: 28px; margin-top: 2px; }
    .autofix-inline-header h4 { margin: 0; font-size: 16px; color: #1e293b; }
    .autofix-inline-header p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
    .autofix-inline-form { display: flex; flex-direction: column; gap: 4px; }
    .autofix-inline-row { display: flex; gap: 12px; }
    .inline-field { flex: 1; }
    .autofix-inline-btn { background: linear-gradient(135deg, #6366f1, #06b6d4) !important; color: white !important; width: 100%; padding: 10px; font-size: 15px; }
    .autofix-inline-btn:disabled { opacity: 0.5; }
    .autofix-inline-btn mat-spinner { margin-right: 8px; }
    .highlight-section { animation: highlight-pulse 2s ease-out; }
    @keyframes highlight-pulse { 0% { box-shadow: 0 0 0 3px #6366f1; } 100% { box-shadow: none; } }
    .rerun-btn {
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      color: white !important;
      padding: 10px 24px;
      border-radius: 8px !important;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .detail-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketDetailComponent implements OnInit, OnDestroy {
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
  branchType: string = 'auto';
  branchNameInput: string = '';
  deletingFix = false;
  reviewLoading = false;
  showReviewComment = false;
  reviewComment = '';
  confirmDialog: { show: boolean; title: string; message: string; action: () => void } = { show: false, title: '', message: '', action: () => {} };
  private pollingInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private repoConfigService: RepoConfigService,
    private snackBar: MatSnackBar,
    private http: HttpClient
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
      if (ticket.status === 'EM_ANDAMENTO' && !ticket.prUrl) {
        this.startPolling();
      }
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

  deleteAutoFix(): void {
    if (!this.ticket) return;
    this.showConfirm('Apagar PR e Branch', 'Isso vai fechar o PR e deletar a branch no GitHub. Deseja continuar?', () => this.doDeleteAutoFix());
  }

  doDeleteAutoFix(): void {

    this.deletingFix = true;
    this.repoConfigService.deleteAutoFix(this.ticket.id).subscribe({
      next: () => {
        this.deletingFix = false;
        this.ticket!.prUrl = null as any;
        this.ticket!.prBranch = null as any;
        this.ticket!.prStatus = null as any;
        this.ticket!.prSummary = null as any;
        this.ticket!.status = 'ABERTO';
        this.prSummaryData = null;
        this.fixResult = null;
        this.snackBar.open('PR fechado e branch deletada!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.deletingFix = false;
        this.snackBar.open('Erro ao remover PR', 'OK', { duration: 3000 });
      }
    });
  }

  showConfirm(title: string, message: string, action: () => void): void {
    this.confirmDialog = { show: true, title, message, action };
  }

  closeConfirm(): void {
    this.confirmDialog = { show: false, title: '', message: '', action: () => {} };
  }

  confirmAction(): void {
    const action = this.confirmDialog.action;
    this.closeConfirm();
    action();
  }

  scrollToAutoFix(): void {
    // Se já tem repo e branch preenchidos, executa direto
    if (this.selectedRepoId && this.branchNameInput) {
      this.onAutoFix();
      return;
    }
    // Senão, rola até a seção para preencher
    const el = document.getElementById('autofix-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-section');
      setTimeout(() => el.classList.remove('highlight-section'), 2000);
    }
    this.snackBar.open('Preencha o repositorio e nome da branch antes de executar', 'OK', { duration: 4000 });
  }

  getFixSummaryText(): string {
    if (!this.prSummaryData?.fixes?.length) return '';
    const explanations = this.prSummaryData.fixes.map((f: any) => f.explanation).filter(Boolean);
    if (explanations.length <= 2) return explanations.join(' e ');
    return explanations.slice(0, -1).join('; ') + ' e ' + explanations[explanations.length - 1];
  }

  approvePr(): void {
    if (!this.ticket) return;
    this.showConfirm('Aprovar PR', 'Deseja aprovar este Pull Request no GitHub?', () => this.doApprovePr());
  }

  doApprovePr(): void {
    if (!this.ticket) return;
    this.reviewLoading = true;
    this.http.post<any>(`http://localhost:8080/api/git/review/${this.ticket!.id}`, {
      action: 'APPROVE', comment: 'Approved via TriageAI'
    }).subscribe({
      next: () => {
        this.reviewLoading = false;
        this.ticket!.prStatus = 'APPROVED';
        this.snackBar.open('PR aprovado com sucesso!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.reviewLoading = false;
        this.snackBar.open('Erro ao aprovar PR', 'OK', { duration: 3000 });
      }
    });
  }

  requestChangesPr(): void {
    this.showReviewComment = true;
  }

  submitRequestChanges(): void {
    if (!this.ticket) return;
    this.reviewLoading = true;
    this.http.post<any>(`http://localhost:8080/api/git/review/${this.ticket!.id}`, {
      action: 'REQUEST_CHANGES', comment: this.reviewComment || 'Changes requested via TriageAI'
    }).subscribe({
      next: () => {
        this.reviewLoading = false;
        this.showReviewComment = false;
        this.reviewComment = '';
        this.snackBar.open('Review enviado!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.reviewLoading = false;
        this.snackBar.open('Erro ao enviar review', 'OK', { duration: 3000 });
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
    this.showConfirm('Excluir Chamado', 'Tem certeza que deseja excluir este chamado? Esta acao nao pode ser desfeita.', () => {
      this.ticketService.delete(this.ticket!.id).subscribe(() => {
        this.snackBar.open('Chamado excluido', 'OK', { duration: 2000 });
        this.router.navigate(['/tickets']);
      });
    });
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

  startPolling(): void {
    this.pollingInterval = setInterval(() => {
      this.ticketService.findById(this.ticket!.id).subscribe(t => {
        this.ticket = t;
        if (t.prUrl || t.status !== 'EM_ANDAMENTO') {
          this.stopPolling();
          if (t.prSummary) {
            try { this.prSummaryData = JSON.parse(t.prSummary); } catch (e) {}
          }
        }
      });
    }, 5000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  goBack(): void {
    this.router.navigate(['/tickets']);
  }
}
