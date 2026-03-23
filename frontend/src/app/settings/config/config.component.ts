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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatSnackBarModule,
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

    mat-card-content { padding: 16px !important; }
  `]
})
export class ConfigComponent implements OnInit {
  config: any = { anthropic_key_set: false, anthropic_key_preview: '' };
  anthropicKey = '';
  showKey = false;
  saving = false;
  aiOnline = false;

  apiKeys: any[] = [];
  newKeyName = '';
  generatedKey = '';

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadApiKeys();
    this.checkAiService();
  }

  loadConfig(): void {
    this.http.get<any>('/api/config').subscribe({
      next: (data) => this.config = data,
      error: () => {}
    });
  }

  loadApiKeys(): void {
    this.http.get<any[]>('/api/api-keys').subscribe({
      next: (keys) => this.apiKeys = keys,
      error: () => {}
    });
  }

  checkAiService(): void {
    this.http.get<any>('/api/dashboard').subscribe({
      next: () => this.aiOnline = true,
      error: () => this.aiOnline = false
    });
  }

  saveAnthropicKey(): void {
    this.saving = true;
    this.http.post<any>('/api/config', { anthropic_api_key: this.anthropicKey }).subscribe({
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
    this.http.post<any>('/api/api-keys', { name: this.newKeyName }).subscribe({
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
    this.http.delete<any>(`/api/api-keys/${id}`).subscribe({
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
}
