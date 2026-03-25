import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatExpansionModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="config-page">
      <h1>Configuracoes</h1>
      <p class="subtitle">Configure as integracoes e servicos do TriageAI</p>

      <!-- Claude API Section -->
      <mat-card class="config-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="config-icon claude-icon">psychology</mat-icon>
          <mat-card-title>Claude AI (Anthropic)</mat-card-title>
          <mat-card-subtitle>Chave de API para analise inteligente de codigo e geracao de dados</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="status-row">
            <span class="status-label">Status:</span>
            <span class="badge status-active" *ngIf="config.anthropic_key_set">Configurado</span>
            <span class="badge status-inactive" *ngIf="!config.anthropic_key_set">Nao configurado</span>
            <span class="key-preview" *ngIf="config.anthropic_key_preview">{{ config.anthropic_key_preview }}</span>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>API Key da Anthropic</mat-label>
            <input matInput [(ngModel)]="anthropicKey" [type]="showKey ? 'text' : 'password'" placeholder="sk-ant-api03-...">
            <button mat-icon-button matSuffix (click)="showKey = !showKey">
              <mat-icon>{{ showKey ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <button mat-flat-button color="primary" (click)="saveAnthropicKey()" [disabled]="!anthropicKey || saving">
            <mat-icon>save</mat-icon>
            {{ saving ? 'Salvando...' : 'Salvar Chave' }}
          </button>

          <!-- How to get key -->
          <mat-expansion-panel class="help-panel">
            <mat-expansion-panel-header>
              <mat-panel-title><mat-icon>help_outline</mat-icon> Como obter a API Key</mat-panel-title>
            </mat-expansion-panel-header>
            <ol class="steps-list">
              <li>Acesse <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></li>
              <li>Crie uma conta ou faca login</li>
              <li>Va em <strong>API Keys</strong> no menu lateral</li>
              <li>Clique em <strong>Create Key</strong></li>
              <li>Copie a chave (comeca com <code>sk-ant-api03-...</code>)</li>
              <li>Cole no campo acima e clique Salvar</li>
            </ol>
          </mat-expansion-panel>
        </mat-card-content>
      </mat-card>

      <!-- API Keys Section (for external integrations) -->
      <mat-card class="config-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="config-icon api-icon">vpn_key</mat-icon>
          <mat-card-title>API Keys (Integracoes Externas)</mat-card-title>
          <mat-card-subtitle>Chaves para Jira, Zendesk e outras plataformas consumirem o TriageAI</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="api-keys-list">
            <div class="api-key-item" *ngFor="let key of apiKeys">
              <div class="key-info">
                <strong>{{ key.name }}</strong>
                <code>{{ key.prefix }}</code>
                <span class="key-meta">Ultimo uso: {{ key.lastUsedAt }}</span>
              </div>
              <button mat-icon-button color="warn" (click)="revokeKey(key.id)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="empty-state" *ngIf="apiKeys.length === 0">
              <mat-icon>info_outline</mat-icon>
              <p>Nenhuma API key criada</p>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="create-key-form">
            <mat-form-field appearance="outline">
              <mat-label>Nome da integracao</mat-label>
              <input matInput [(ngModel)]="newKeyName" placeholder="Ex: Jira Production">
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="createApiKey()" [disabled]="!newKeyName">
              <mat-icon>add</mat-icon> Gerar API Key
            </button>
          </div>

          <!-- Show generated key -->
          <div class="generated-key-alert" *ngIf="generatedKey">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Salve esta chave agora! Ela nao sera exibida novamente.</strong>
              <code class="generated-key-value">{{ generatedKey }}</code>
              <button mat-stroked-button (click)="copyKey()">
                <mat-icon>content_copy</mat-icon> Copiar
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Service Status -->
      <mat-card class="config-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="config-icon status-icon">monitor_heart</mat-icon>
          <mat-card-title>Status dos Servicos</mat-card-title>
          <mat-card-subtitle>Verificacao de conectividade dos servicos</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="service-row">
            <span class="service-name"><mat-icon>storage</mat-icon> Backend API</span>
            <span class="badge status-active">Online</span>
          </div>
          <div class="service-row">
            <span class="service-name"><mat-icon>psychology</mat-icon> IA Service (Python)</span>
            <span class="badge" [class.status-active]="aiOnline" [class.status-inactive]="!aiOnline">
              {{ aiOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
          <div class="service-row">
            <span class="service-name"><mat-icon>cloud</mat-icon> Claude API</span>
            <span class="badge" [class.status-active]="config.anthropic_key_set" [class.status-inactive]="!config.anthropic_key_set">
              {{ config.anthropic_key_set ? 'Configurado' : 'Nao configurado' }}
            </span>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Autonomous Learning -->
      <mat-card class="config-card learning-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="config-icon learning-icon">auto_awesome</mat-icon>
          <mat-card-title>Aprendizado Autonomo</mat-card-title>
          <mat-card-subtitle>ML e Claude conversam para melhorar o modelo continuamente</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!-- Toggle + Status -->
          <div class="learning-header">
            <div class="learning-toggle">
              <label class="toggle-switch">
                <input type="checkbox" [checked]="learningRunning" (change)="toggleLearning($event)">
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">{{ learningRunning ? 'Ativo' : 'Pausado' }}</span>
            </div>
            <button mat-stroked-button (click)="runLearningNow()" [disabled]="learningCycleRunning" class="run-now-btn">
              <mat-icon>{{ learningCycleRunning ? 'hourglass_empty' : 'play_arrow' }}</mat-icon>
              {{ learningCycleRunning ? 'Executando...' : 'Executar Agora' }}
            </button>
          </div>

          <!-- Stats Cards -->
          <div class="learning-stats" *ngIf="learningStatus">
            <div class="stat-mini">
              <span class="stat-value">{{ learningStatus.total_cycles || 0 }}</span>
              <span class="stat-label">Ciclos</span>
            </div>
            <div class="stat-mini">
              <span class="stat-value">{{ learningStatus.total_evaluated || 0 }}</span>
              <span class="stat-label">Avaliados</span>
            </div>
            <div class="stat-mini">
              <span class="stat-value">{{ learningStatus.total_corrections || 0 }}</span>
              <span class="stat-label">Correcoes</span>
            </div>
            <div class="stat-mini">
              <span class="stat-value">{{ learningStatus.stats?.last_accuracy || 0 }}%</span>
              <span class="stat-label">Ultima Precisao</span>
            </div>
          </div>

          <!-- Claude para Sexta-Feira -->
          <div class="learning-header" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(139,92,246,0.1);">
            <div class="learning-toggle">
              <label class="toggle-switch">
                <input type="checkbox" [checked]="sextaFeiraUseClaude" (change)="toggleSextaFeiraClaude($event)">
                <span class="toggle-slider"></span>
              </label>
              <div>
                <span class="toggle-label">Sexta-Feira usa Claude</span>
                <p style="margin: 0; font-size: 12px; color: #64748b;">Quando ativado, Sexta-Feira compara suas respostas com o Claude e aprende as diferencas</p>
              </div>
            </div>
          </div>

          <!-- Config -->
          <mat-divider></mat-divider>
          <div class="learning-config">
            <h4><mat-icon>tune</mat-icon> Configuracoes do Ciclo</h4>
            <div class="config-grid">
              <mat-form-field appearance="outline">
                <mat-label>Intervalo (minutos)</mat-label>
                <mat-select [(ngModel)]="learningInterval" (selectionChange)="saveLearningConfig()">
                  <mat-option [value]="15">15 min</mat-option>
                  <mat-option [value]="30">30 min</mat-option>
                  <mat-option [value]="60">1 hora</mat-option>
                  <mat-option [value]="120">2 horas</mat-option>
                  <mat-option [value]="360">6 horas</mat-option>
                  <mat-option [value]="720">12 horas</mat-option>
                  <mat-option [value]="1440">24 horas</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Amostras por ciclo</mat-label>
                <mat-select [(ngModel)]="learningSamples" (selectionChange)="saveLearningConfig()">
                  <mat-option [value]="20">20</mat-option>
                  <mat-option [value]="50">50</mat-option>
                  <mat-option [value]="100">100</mat-option>
                  <mat-option [value]="200">200</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Re-treinar apos X correcoes</mat-label>
                <mat-select [(ngModel)]="learningRetrainThreshold" (selectionChange)="saveLearningConfig()">
                  <mat-option [value]="3">3</mat-option>
                  <mat-option [value]="5">5</mat-option>
                  <mat-option [value]="10">10</mat-option>
                  <mat-option [value]="20">20</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Recent Cycles -->
          <mat-divider></mat-divider>
          <div class="learning-history" *ngIf="learningStatus?.recent_cycles?.length">
            <h4><mat-icon>history</mat-icon> Ciclos Recentes</h4>
            <div class="cycle-list">
              <div class="cycle-item" *ngFor="let cycle of learningStatus.recent_cycles">
                <div class="cycle-time">{{ cycle.timestamp | date:'dd/MM HH:mm' }}</div>
                <div class="cycle-bar">
                  <div class="bar-agree" [style.width.%]="(cycle.agreements / cycle.evaluated) * 100"></div>
                </div>
                <div class="cycle-info">
                  <span class="agree-count">{{ cycle.agreements }}/{{ cycle.evaluated }}</span>
                  <span class="accuracy-badge" [class.high]="cycle.accuracy_vs_claude >= 85" [class.medium]="cycle.accuracy_vs_claude >= 70 && cycle.accuracy_vs_claude < 85" [class.low]="cycle.accuracy_vs_claude < 70">
                    {{ cycle.accuracy_vs_claude }}%
                  </span>
                  <mat-icon *ngIf="cycle.retrained" class="retrained-icon" matTooltip="Modelo re-treinado">model_training</mat-icon>
                </div>
              </div>
            </div>
          </div>

          <!-- How it works -->
          <mat-expansion-panel class="help-panel">
            <mat-expansion-panel-header>
              <mat-panel-title><mat-icon>help_outline</mat-icon> Como funciona</mat-panel-title>
            </mat-expansion-panel-header>
            <div class="help-content">
              <ol>
                <li><strong>Claude gera chamados</strong> — cria textos realistas de suporte e os classifica</li>
                <li><strong>ML classifica</strong> — o modelo local classifica os mesmos textos</li>
                <li><strong>Compara</strong> — onde divergirem; a resposta do Claude vira dado de treino</li>
                <li><strong>Re-treina</strong> — se teve correcoes suficientes; o modelo e atualizado automaticamente</li>
              </ol>
              <p class="help-note">Quanto mais ciclos rodam; mais o modelo ML se aproxima da qualidade do Claude; reduzindo custos de API.</p>
            </div>
          </mat-expansion-panel>
        </mat-card-content>
      </mat-card>

      <!-- API Documentation -->
      <mat-card class="config-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="config-icon doc-icon">description</mat-icon>
          <mat-card-title>Documentacao da API</mat-card-title>
          <mat-card-subtitle>Swagger, Collection e ambientes</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!-- Swagger -->
          <div class="doc-row">
            <div class="doc-info">
              <mat-icon>api</mat-icon>
              <div>
                <strong>Swagger UI</strong>
                <p>Documentacao interativa da API com teste direto</p>
              </div>
            </div>
            <a mat-stroked-button href="http://localhost:8080/swagger-ui.html" target="_blank">
              <mat-icon>open_in_new</mat-icon> Abrir Swagger
            </a>
          </div>

          <mat-divider></mat-divider>

          <!-- Collection Export -->
          <div class="doc-row">
            <div class="doc-info">
              <mat-icon>download</mat-icon>
              <div>
                <strong>Exportar Collection (Postman/Insomnia)</strong>
                <p>Baixe a collection com todas as rotas da API</p>
              </div>
            </div>
            <div class="export-controls">
              <mat-form-field appearance="outline" class="env-select">
                <mat-label>Ambiente</mat-label>
                <mat-select [(ngModel)]="selectedEnv">
                  <mat-option value="local">Local</mat-option>
                  <mat-option value="dev">Desenvolvimento</mat-option>
                  <mat-option value="staging">Staging</mat-option>
                  <mat-option value="prod">Producao</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" (click)="exportCollection()">
                <mat-icon>download</mat-icon> Exportar
              </button>
            </div>
          </div>

          <!-- Quick Info -->
          <div class="api-info-box">
            <h4>Endpoints disponiveis</h4>
            <div class="api-summary">
              <span class="api-method get">GET</span>
              <span class="api-method post">POST</span>
              <span class="api-method put">PUT</span>
              <span class="api-method delete">DELETE</span>
              <span class="api-count">40+ endpoints em 8 categorias</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .config-page { max-width: 900px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 4px; font-size: 28px; font-weight: 700; }
    .subtitle { color: #64748b; margin: 0 0 24px; }
    .config-card { margin-bottom: 24px; border-radius: 12px; }
    .config-icon { font-size: 28px; width: 28px; height: 28px; }
    .claude-icon { color: #8B5CF6; }
    .api-icon { color: #F59E0B; }
    .status-icon { color: #10B981; }
    .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .status-label { font-weight: 500; }
    .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-active { background: #dcfce7; color: #16a34a; }
    .status-inactive { background: #fef2f2; color: #dc2626; }
    .full-width { width: 100%; }
    .key-preview { font-family: monospace; color: #64748b; margin-left: 8px; }
    .help-panel { margin-top: 16px; }
    .steps-list { padding-left: 20px; line-height: 2; }
    .steps-list a { color: #6366f1; }
    .steps-list code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .api-keys-list { margin-bottom: 16px; }
    .api-key-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; }
    .key-info { display: flex; flex-direction: column; gap: 4px; }
    .key-info code { color: #64748b; font-size: 13px; }
    .key-meta { font-size: 12px; color: #94a3b8; }
    .empty-state { text-align: center; padding: 24px; color: #94a3b8; }
    .empty-state mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .create-key-form { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
    .generated-key-alert { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 16px; display: flex; gap: 12px; align-items: flex-start; }
    .generated-key-alert mat-icon { color: #f59e0b; flex-shrink: 0; margin-top: 2px; }
    .generated-key-value { display: block; background: #1e293b; color: #38bdf8; padding: 8px 16px; border-radius: 4px; margin: 8px 0; word-break: break-all; }
    .service-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .service-row:last-child { border-bottom: none; }
    .service-name { display: flex; align-items: center; gap: 8px; }
    .doc-icon { color: #0ea5e9; }
    .doc-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
    .doc-info { display: flex; align-items: center; gap: 12px; }
    .doc-info p { margin: 0; color: #64748b; font-size: 13px; }
    .export-controls { display: flex; align-items: center; gap: 8px; }
    .env-select { width: 160px; font-size: 13px; }
    .env-select .mat-mdc-form-field-subscript-wrapper { display: none; }
    .api-info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; margin-top: 12px; }
    .api-info-box h4 { margin: 0 0 8px; color: #0369a1; font-size: 14px; }
    .api-summary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .api-method { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: white; }
    .api-method.get { background: #22c55e; }
    .api-method.post { background: #3b82f6; }
    .api-method.put { background: #f59e0b; }
    .api-method.delete { background: #ef4444; }
    .api-count { color: #64748b; font-size: 13px; }

    .learning-icon { color: #8b5cf6; }
    .learning-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .learning-toggle { display: flex; align-items: center; gap: 12px; }
    .toggle-switch { position: relative; display: inline-block; width: 48px; height: 26px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #cbd5e1; border-radius: 26px; transition: .3s; }
    .toggle-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
    .toggle-switch input:checked + .toggle-slider { background: #8b5cf6; }
    .toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }
    .toggle-label { font-weight: 600; font-size: 14px; }
    .run-now-btn { border-color: #8b5cf6 !important; color: #8b5cf6 !important; }
    .learning-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-mini { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .stat-mini .stat-value { display: block; font-size: 24px; font-weight: 700; color: #1e293b; }
    .stat-mini .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .learning-config h4 { display: flex; align-items: center; gap: 8px; margin: 16px 0 12px; color: #475569; font-size: 14px; }
    .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .learning-history h4 { display: flex; align-items: center; gap: 8px; margin: 16px 0 12px; color: #475569; font-size: 14px; }
    .cycle-list { display: flex; flex-direction: column; gap: 6px; }
    .cycle-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; font-size: 13px; }
    .cycle-time { color: #64748b; min-width: 80px; font-family: monospace; }
    .cycle-bar { flex: 1; height: 8px; background: #fee2e2; border-radius: 4px; overflow: hidden; }
    .bar-agree { height: 100%; background: #22c55e; border-radius: 4px; transition: width 0.3s; }
    .cycle-info { display: flex; align-items: center; gap: 8px; min-width: 140px; }
    .agree-count { color: #64748b; font-family: monospace; }
    .accuracy-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .accuracy-badge.high { background: #dcfce7; color: #16a34a; }
    .accuracy-badge.medium { background: #fef3c7; color: #d97706; }
    .accuracy-badge.low { background: #fee2e2; color: #dc2626; }
    .retrained-icon { font-size: 16px; width: 16px; height: 16px; color: #8b5cf6; }
    .help-content ol { padding-left: 20px; line-height: 2; }
    .help-note { background: #f0f9ff; border-left: 3px solid #3b82f6; padding: 8px 12px; margin-top: 12px; font-size: 13px; color: #475569; }

    mat-card-content { padding: 16px !important; }
  `]
})
export class ConfigComponent implements OnInit {
  config: any = { anthropic_key_set: false, anthropic_key_preview: '' };
  anthropicKey = '';
  showKey = false;
  saving = false;
  aiOnline = false;

  selectedEnv = 'local';

  apiKeys: any[] = [];
  newKeyName = '';
  generatedKey = '';

  // Sexta-Feira Claude
  sextaFeiraUseClaude = false;

  // Learning
  learningRunning = false;
  learningCycleRunning = false;
  learningStatus: any = null;
  learningInterval = 60;
  learningSamples = 50;
  learningRetrainThreshold = 5;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadApiKeys();
    this.checkAiService();
    this.loadLearningStatus();
  }

  loadConfig(): void {
    this.http.get<any>('http://localhost:8080/api/config').subscribe({
      next: (data) => this.config = data,
      error: () => {}
    });
  }

  loadApiKeys(): void {
    this.http.get<any[]>('http://localhost:8080/api/api-keys').subscribe({
      next: (keys) => this.apiKeys = keys,
      error: () => {}
    });
  }

  checkAiService(): void {
    this.http.get<any>('http://localhost:8080/api/dashboard/stats').subscribe({
      next: () => this.aiOnline = true,
      error: () => this.aiOnline = false
    });
  }

  saveAnthropicKey(): void {
    this.saving = true;
    this.http.post<any>('http://localhost:8080/api/config', { anthropic_api_key: this.anthropicKey }).subscribe({
      next: (res) => {
        this.saving = false;
        this.anthropicKey = '';
        this.snackBar.open('Chave salva com sucesso!', 'OK', { duration: 3000 });
        this.loadConfig();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('Erro ao salvar chave: ' + (err.error?.error || 'Erro desconhecido'), 'OK', { duration: 5000 });
      }
    });
  }

  createApiKey(): void {
    this.http.post<any>('http://localhost:8080/api/api-keys', { name: this.newKeyName }).subscribe({
      next: (res) => {
        this.generatedKey = res.key;
        this.newKeyName = '';
        this.loadApiKeys();
        this.snackBar.open('API Key criada!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erro ao criar API Key', 'OK', { duration: 3000 });
      }
    });
  }

  revokeKey(id: number): void {
    this.http.delete<any>(`http://localhost:8080/api/api-keys/${id}`).subscribe({
      next: () => {
        this.loadApiKeys();
        this.snackBar.open('API Key revogada', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erro ao revogar API Key', 'OK', { duration: 3000 });
      }
    });
  }

  copyKey(): void {
    navigator.clipboard.writeText(this.generatedKey).then(() => {
      this.snackBar.open('Chave copiada!', 'OK', { duration: 2000 });
    });
  }

  exportCollection(): void {
    this.http.get(`http://localhost:8080/api/collection/postman?env=${this.selectedEnv}`)
      .subscribe({
        next: (data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `triageai-collection-${this.selectedEnv}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.snackBar.open('Collection exportada!', 'OK', { duration: 3000 });
        },
        error: () => this.snackBar.open('Erro ao exportar', 'OK', { duration: 3000 })
      });
  }

  // --- Learning ---
  loadLearningStatus(): void {
    this.http.get<any>('http://localhost:8000/learning/status').subscribe({
      next: (data) => {
        this.learningStatus = data;
        this.learningRunning = data.running;
      },
      error: () => {}
    });
    // Load config for interval/samples
    this.http.get<any>('http://localhost:8000/config').subscribe({
      next: (cfg) => {
        if (cfg.learning_interval) this.learningInterval = cfg.learning_interval;
        if (cfg.learning_samples) this.learningSamples = cfg.learning_samples;
        if (cfg.learning_retrain_threshold) this.learningRetrainThreshold = cfg.learning_retrain_threshold;
        if (cfg.sexta_feira_use_claude !== undefined) this.sextaFeiraUseClaude = cfg.sexta_feira_use_claude;
      },
      error: () => {}
    });
  }

  toggleLearning(event: any): void {
    const enabled = event.target.checked;
    this.http.post<any>('http://localhost:8000/learning/toggle', { enabled }).subscribe({
      next: (res) => {
        this.learningRunning = res.running;
        this.snackBar.open(res.message, 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erro ao alterar aprendizado', 'OK', { duration: 3000 })
    });
  }

  runLearningNow(): void {
    this.learningCycleRunning = true;
    this.snackBar.open('Ciclo de aprendizado iniciado...', 'OK', { duration: 2000 });
    this.http.post<any>('http://localhost:8000/learning/run-now', {}).subscribe({
      next: (res) => {
        this.learningCycleRunning = false;
        this.loadLearningStatus();
        const msg = res.status === 'skipped'
          ? `Pulado: ${res.reason}`
          : `Concluido! ${res.agreements || 0}/${res.evaluated || 0} concordaram (${res.accuracy_vs_claude || 0}%). ${res.corrections || 0} correcoes. Re-treinou: ${res.retrained ? 'Sim' : 'Nao'}`;
        this.snackBar.open(msg, 'OK', { duration: 8000 });
      },
      error: () => {
        this.learningCycleRunning = false;
        this.snackBar.open('Erro no ciclo de aprendizado', 'OK', { duration: 3000 });
      }
    });
  }

  toggleSextaFeiraClaude(event: any): void {
    this.sextaFeiraUseClaude = event.target.checked;
    this.http.post<any>('http://localhost:8000/config', { sexta_feira_use_claude: this.sextaFeiraUseClaude }).subscribe({
      next: () => this.snackBar.open(this.sextaFeiraUseClaude ? 'Sexta-Feira agora aprende com Claude!' : 'Sexta-Feira usando apenas modelo local', 'OK', { duration: 3000 }),
      error: () => {}
    });
  }

  saveLearningConfig(): void {
    this.http.post<any>('http://localhost:8000/config', {
      learning_interval: this.learningInterval,
      learning_samples: this.learningSamples,
      learning_retrain_threshold: this.learningRetrainThreshold
    }).subscribe({
      next: () => this.snackBar.open('Configuracao salva', 'OK', { duration: 2000 }),
      error: () => {}
    });
  }
}
