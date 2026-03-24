import { Component } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TicketService } from '../../services/ticket.service';
import { SistemaService, Sistema } from '../../services/sistema.service';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatSnackBarModule, MatTooltipModule, UpperCasePipe
  ],
  template: `
    <div class="ticket-wizard">
      <h1>Novo Chamado</h1>
      <p class="subtitle">Descreva seu problema e a IA vai ajudar a detalhar</p>

      <!-- Step indicators -->
      <div class="steps-bar">
        <div class="step-indicator" [class.active]="step >= 1" [class.completed]="step > 1">
          <span class="step-num">1</span>
          <span class="step-label">Descrever</span>
        </div>
        <div class="step-line" [class.active]="step > 1"></div>
        <div class="step-indicator" [class.active]="step >= 2" [class.completed]="step > 2">
          <span class="step-num">2</span>
          <span class="step-label">Refinar com IA</span>
        </div>
        <div class="step-line" [class.active]="step > 2"></div>
        <div class="step-indicator" [class.active]="step >= 3">
          <span class="step-num">3</span>
          <span class="step-label">Confirmar</span>
        </div>
      </div>

      <!-- STEP 1: Describe -->
      <div class="step-content" *ngIf="step === 1">
        <mat-card class="form-card">
          <mat-form-field appearance="outline" class="full-width" *ngIf="sistemas.length > 0">
            <mat-label>Sistema (opcional)</mat-label>
            <mat-select [(ngModel)]="selectedSistemaId" (ngModelChange)="onSistemaChange()">
              <mat-option [value]="null">Nenhum</mat-option>
              <mat-option *ngFor="let s of sistemas" [value]="s.id">{{ s.nome }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Titulo do chamado*</mat-label>
            <input matInput [(ngModel)]="titulo" maxlength="200">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descreva o problema (pode ser generico, a IA vai ajudar)</mat-label>
            <textarea matInput [(ngModel)]="descricao" rows="6" maxlength="2000"></textarea>
            <mat-hint align="end">{{ descricao.length }}/2000</mat-hint>
          </mat-form-field>

          <div class="step-actions">
            <button mat-button routerLink="/tickets">Cancelar</button>
            <button mat-flat-button color="primary" (click)="analyzeWithAI()"
                    [disabled]="!titulo || !descricao || analyzing" class="analyze-btn">
              <mat-icon>{{ analyzing ? 'hourglass_empty' : 'psychology' }}</mat-icon>
              {{ analyzing ? 'Analisando...' : 'Analisar com IA' }}
            </button>
            <button mat-stroked-button (click)="skipToCreate()" [disabled]="!titulo || !descricao">
              Pular analise →
            </button>
          </div>
        </mat-card>
      </div>

      <!-- STEP 2: Refine -->
      <div class="step-content" *ngIf="step === 2">
        <!-- Classification Preview -->
        <div class="classification-row">
          <div class="class-card">
            <span class="class-label">Categoria</span>
            <span class="badge" [ngClass]="'cat-' + enrichData.classificacao.categoria.toLowerCase()">
              {{ enrichData.classificacao.categoria }}
            </span>
          </div>
          <div class="class-card">
            <span class="class-label">Prioridade</span>
            <span class="badge" [ngClass]="'pri-' + enrichData.classificacao.prioridade.toLowerCase()">
              {{ enrichData.classificacao.prioridade }}
            </span>
          </div>
          <div class="class-card">
            <span class="class-label">Score IA</span>
            <span class="score">{{ (enrichData.classificacao.score * 100).toFixed(0) }}%</span>
          </div>
          <div class="class-card" *ngIf="enrichData.impacto">
            <span class="class-label">Impacto</span>
            <span class="badge" [ngClass]="'impacto-' + enrichData.impacto">
              {{ enrichData.impacto | uppercase }}
            </span>
          </div>
        </div>

        <!-- Enriched Description -->
        <mat-card class="enrich-card">
          <h3><mat-icon>auto_fix_high</mat-icon> Descricao Enriquecida pela IA</h3>
          <mat-form-field appearance="outline" class="full-width">
            <textarea matInput [(ngModel)]="enrichedDescricao" rows="8"></textarea>
          </mat-form-field>
        </mat-card>

        <!-- Components Affected -->
        <div class="chips-row" *ngIf="enrichData.componentesAfetados?.length">
          <span class="chips-label">Componentes afetados:</span>
          <span class="chip" *ngFor="let c of enrichData.componentesAfetados">{{ c }}</span>
        </div>

        <!-- Steps to Reproduce -->
        <mat-card class="steps-card" *ngIf="enrichData.passosReproduzir?.length">
          <h4><mat-icon>format_list_numbered</mat-icon> Passos para Reproduzir</h4>
          <ol>
            <li *ngFor="let p of enrichData.passosReproduzir">{{ p }}</li>
          </ol>
        </mat-card>

        <!-- AI Questions -->
        <mat-card class="questions-card" *ngIf="enrichData.perguntas?.length">
          <h3><mat-icon>help_outline</mat-icon> A IA precisa de mais detalhes</h3>
          <p class="questions-hint">Responda para melhorar a qualidade do chamado (opcional)</p>
          <div class="question-item" *ngFor="let q of enrichData.perguntas; let i = index">
            <span class="question-num">{{ i + 1 }}</span>
            <div class="question-content">
              <p class="question-text">{{ q }}</p>
              <mat-form-field appearance="outline" class="full-width">
                <input matInput [(ngModel)]="respostas[i]" placeholder="Sua resposta...">
              </mat-form-field>
            </div>
          </div>
          <button mat-stroked-button color="primary" (click)="refineWithAnswers()"
                  [disabled]="refining || !hasAnyAnswer()" class="refine-btn">
            <mat-icon>{{ refining ? 'hourglass_empty' : 'refresh' }}</mat-icon>
            {{ refining ? 'Refinando...' : 'Refinar com respostas' }}
          </button>
        </mat-card>

        <!-- Suggestions -->
        <div class="suggestions-box" *ngIf="enrichData.sugestoes?.length">
          <mat-icon>lightbulb</mat-icon>
          <div>
            <strong>Sugestoes da IA:</strong>
            <ul>
              <li *ngFor="let s of enrichData.sugestoes">{{ s }}</li>
            </ul>
          </div>
        </div>

        <div class="step-actions">
          <button mat-button (click)="step = 1"><mat-icon>arrow_back</mat-icon> Editar</button>
          <button mat-flat-button color="primary" (click)="step = 3" class="approve-btn">
            <mat-icon>check</mat-icon> Aprovar descricao
          </button>
        </div>
      </div>

      <!-- STEP 3: Confirm -->
      <div class="step-content" *ngIf="step === 3">
        <mat-card class="confirm-card">
          <h3><mat-icon>preview</mat-icon> Preview do Chamado</h3>

          <div class="preview-field">
            <span class="preview-label">Titulo</span>
            <p class="preview-value">{{ titulo }}</p>
          </div>

          <div class="preview-field">
            <span class="preview-label">Descricao</span>
            <p class="preview-value preview-desc">{{ useEnriched ? enrichedDescricao : descricao }}</p>
          </div>

          <div class="preview-row">
            <div class="preview-field">
              <span class="preview-label">Categoria</span>
              <span class="badge" *ngIf="enrichData" [ngClass]="'cat-' + enrichData.classificacao.categoria.toLowerCase()">
                {{ enrichData.classificacao.categoria }}
              </span>
            </div>
            <div class="preview-field">
              <span class="preview-label">Prioridade</span>
              <span class="badge" *ngIf="enrichData" [ngClass]="'pri-' + enrichData.classificacao.prioridade.toLowerCase()">
                {{ enrichData.classificacao.prioridade }}
              </span>
            </div>
            <div class="preview-field" *ngIf="selectedSistema">
              <span class="preview-label">Sistema</span>
              <span>{{ selectedSistema.nome }}</span>
            </div>
          </div>

          <mat-slide-toggle [(ngModel)]="useEnriched" *ngIf="enrichData && enrichedDescricao !== descricao">
            Usar descricao enriquecida pela IA
          </mat-slide-toggle>
        </mat-card>

        <div class="step-actions">
          <button mat-button (click)="step = enrichData ? 2 : 1">
            <mat-icon>arrow_back</mat-icon> Voltar
          </button>
          <button mat-flat-button class="create-btn" (click)="createTicket()" [disabled]="creating">
            <mat-icon>{{ creating ? 'hourglass_empty' : 'send' }}</mat-icon>
            {{ creating ? 'Criando...' : 'Criar Chamado' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Layout */
    .ticket-wizard {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary, #1e293b);
    }

    .subtitle {
      color: var(--text-secondary, #64748b);
      margin: 4px 0 24px;
      font-size: 14px;
    }

    /* Steps Bar */
    .steps-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 32px;
      padding: 0 16px;
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
    }

    .step-num {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      background: #e2e8f0;
      color: #94a3b8;
      transition: all 0.3s ease;
    }

    .step-indicator.active .step-num {
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      color: white;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);
    }

    .step-indicator.completed .step-num {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    }

    .step-label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      white-space: nowrap;
    }

    .step-indicator.active .step-label,
    .step-indicator.completed .step-label {
      color: var(--text-primary, #1e293b);
    }

    .step-line {
      flex: 1;
      height: 3px;
      background: #e2e8f0;
      margin: 0 12px;
      margin-bottom: 22px;
      border-radius: 2px;
      transition: background 0.3s ease;
      min-width: 40px;
      max-width: 120px;
    }

    .step-line.active {
      background: linear-gradient(90deg, #10b981, #6366f1);
    }

    /* Step Content */
    .step-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Form Card */
    .form-card {
      padding: 28px;
    }

    .full-width {
      width: 100%;
    }

    /* Step Actions */
    .step-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    /* Analyze Button */
    .analyze-btn {
      background: linear-gradient(135deg, #7c3aed, #6366f1) !important;
      color: white !important;
      font-weight: 600 !important;
      border-radius: 10px !important;
      height: 44px;
      display: flex !important;
      align-items: center;
      gap: 8px;
    }

    .analyze-btn:disabled {
      opacity: 0.5 !important;
    }

    /* Classification Row */
    .classification-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .class-card {
      background: var(--bg-card, white);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .class-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary, #64748b);
    }

    .score {
      font-size: 24px;
      font-weight: 700;
      color: #7c3aed;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .cat-bug { background: #fef2f2; color: #dc2626; }
    .cat-feature { background: #f0fdf4; color: #16a34a; }
    .cat-improvement { background: #eff6ff; color: #2563eb; }
    .cat-question { background: #fefce8; color: #ca8a04; }
    .cat-task { background: #f5f3ff; color: #7c3aed; }

    .pri-critica, .pri-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    .pri-alta, .pri-high { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; }
    .pri-media, .pri-medium { background: #fefce8; color: #ca8a04; border: 1px solid #fde047; }
    .pri-baixa, .pri-low { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }

    .impacto-alto { background: #fef2f2; color: #dc2626; }
    .impacto-medio { background: #fefce8; color: #ca8a04; }
    .impacto-baixo { background: #f0fdf4; color: #16a34a; }

    /* Enrich Card */
    .enrich-card {
      padding: 24px;
      margin-bottom: 20px;
    }

    .enrich-card h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px;
      color: #7c3aed;
    }

    .enrich-card h3 mat-icon {
      color: #7c3aed;
    }

    /* Chips Row */
    .chips-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 20px;
      padding: 0 4px;
    }

    .chips-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
    }

    .chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    /* Steps Card */
    .steps-card {
      padding: 24px;
      margin-bottom: 20px;
    }

    .steps-card h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--text-primary, #1e293b);
    }

    .steps-card ol {
      margin: 0;
      padding-left: 20px;
    }

    .steps-card ol li {
      margin-bottom: 6px;
      font-size: 14px;
      color: var(--text-secondary, #475569);
    }

    /* Questions Card */
    .questions-card {
      padding: 24px;
      margin-bottom: 20px;
    }

    .questions-card h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px;
      color: #d97706;
    }

    .questions-card h3 mat-icon {
      color: #d97706;
    }

    .questions-hint {
      font-size: 13px;
      color: var(--text-secondary, #64748b);
      margin: 0 0 16px;
    }

    .question-item {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .question-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      background: #fef3c7;
      color: #d97706;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .question-content {
      flex: 1;
    }

    .question-text {
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 8px;
      color: var(--text-primary, #1e293b);
    }

    .refine-btn {
      margin-top: 8px;
    }

    /* Suggestions Box */
    .suggestions-box {
      display: flex;
      gap: 12px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .suggestions-box > mat-icon {
      color: #d97706;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .suggestions-box strong {
      font-size: 14px;
      color: #92400e;
    }

    .suggestions-box ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }

    .suggestions-box ul li {
      font-size: 13px;
      color: #78350f;
      margin-bottom: 4px;
    }

    /* Approve Button */
    .approve-btn {
      font-weight: 600 !important;
      border-radius: 10px !important;
      height: 44px;
    }

    /* Confirm Card */
    .confirm-card {
      padding: 28px;
      margin-bottom: 20px;
    }

    .confirm-card h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 24px;
      color: var(--text-primary, #1e293b);
    }

    .preview-field {
      margin-bottom: 20px;
    }

    .preview-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary, #64748b);
    }

    .preview-value {
      font-size: 15px;
      margin: 6px 0 0;
      color: var(--text-primary, #1e293b);
      line-height: 1.6;
    }

    .preview-desc {
      white-space: pre-wrap;
      background: var(--bg-subtle, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      padding: 16px;
      font-size: 14px;
    }

    .preview-row {
      display: flex;
      gap: 32px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    /* Create Button */
    .create-btn {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      color: white !important;
      font-weight: 600 !important;
      border-radius: 10px !important;
      height: 44px;
      display: flex !important;
      align-items: center;
      gap: 8px;
    }

    .create-btn:disabled {
      opacity: 0.5 !important;
    }

    /* Mobile Responsive */
    @media (max-width: 600px) {
      .ticket-wizard {
        padding: 16px 8px;
      }

      h1 { font-size: 22px; }

      .steps-bar {
        padding: 0 8px;
      }

      .step-label {
        font-size: 10px;
      }

      .step-num {
        width: 30px;
        height: 30px;
        font-size: 12px;
      }

      .step-line {
        min-width: 20px;
        margin: 0 6px;
      }

      .classification-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .step-actions {
        flex-direction: column;
      }

      .step-actions button {
        width: 100%;
      }

      .preview-row {
        flex-direction: column;
        gap: 16px;
      }

      .form-card, .enrich-card, .steps-card, .questions-card, .confirm-card {
        padding: 16px;
      }
    }
  `]
})
export class TicketFormComponent {
  step = 1;
  titulo = '';
  descricao = '';
  selectedSistemaId: number | null = null;
  selectedSistema: Sistema | null = null;
  sistemas: Sistema[] = [];
  analyzing = false;
  refining = false;
  creating = false;
  enrichData: any = null;
  enrichedDescricao = '';
  respostas: string[] = [];
  useEnriched = true;

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

  analyzeWithAI(): void {
    this.analyzing = true;
    this.ticketService.enrichTicket({
      text: this.titulo + ' ' + this.descricao,
      sistema: this.selectedSistema?.nome
    }).subscribe({
      next: (data) => {
        this.enrichData = data;
        this.enrichedDescricao = data.descricaoEnriquecida || this.descricao;
        this.respostas = (data.perguntas || []).map(() => '');
        this.analyzing = false;
        this.step = 2;
      },
      error: () => {
        this.snackBar.open('Erro ao analisar com IA. Tente novamente.', 'OK', { duration: 4000 });
        this.analyzing = false;
      }
    });
  }

  refineWithAnswers(): void {
    this.refining = true;
    const mappedRespostas = this.enrichData.perguntas.map((q: string, i: number) => ({
      pergunta: q,
      resposta: this.respostas[i]
    })).filter((r: any) => r.resposta?.trim());

    this.ticketService.refineTicket({
      text: this.titulo + ' ' + this.descricao,
      descricaoAtual: this.enrichedDescricao,
      respostas: mappedRespostas
    }).subscribe({
      next: (data) => {
        this.enrichedDescricao = data.descricaoEnriquecida || this.enrichedDescricao;
        if (data.classificacao) {
          this.enrichData.classificacao = data.classificacao;
        }
        if (data.componentesAfetados) {
          this.enrichData.componentesAfetados = data.componentesAfetados;
        }
        if (data.passosReproduzir) {
          this.enrichData.passosReproduzir = data.passosReproduzir;
        }
        this.refining = false;
        this.snackBar.open('Descricao refinada com sucesso!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erro ao refinar. Tente novamente.', 'OK', { duration: 4000 });
        this.refining = false;
      }
    });
  }

  skipToCreate(): void {
    this.step = 3;
  }

  hasAnyAnswer(): boolean {
    return this.respostas.some(r => r?.trim().length > 0);
  }

  createTicket(): void {
    this.creating = true;
    const data: any = {
      titulo: this.titulo,
      descricao: this.useEnriched && this.enrichedDescricao ? this.enrichedDescricao : this.descricao
    };
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
        this.creating = false;
      }
    });
  }
}
