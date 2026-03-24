import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { RepoConfig, RepoConfigRequest, GitRepo, GitConnection } from '../../models/repo-config.model';
import { RepoConfigService } from '../../services/repo-config.service';

@Component({
  selector: 'app-repo-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,
    MatProgressSpinnerModule, MatTooltipModule, MatChipsModule
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Repositorios</h1>
        <p class="page-subtitle">Conecte seu provedor e selecione repositorios para integracao com auto-fix</p>
      </div>
    </div>

    <div class="config-layout">
      <!-- Left Side: Connections + Repo List -->
      <div class="left-panel">

        <!-- Connected Providers -->
        <div class="panel-card" *ngIf="connections.length > 0">
          <div class="panel-header">
            <mat-icon>cloud_done</mat-icon>
            <h3>Provedores Conectados</h3>
          </div>
          <div class="connections-list">
            <div *ngFor="let conn of connections" class="connection-badge">
              <img *ngIf="conn.avatarUrl" [src]="conn.avatarUrl" class="connection-avatar" alt="avatar">
              <mat-icon *ngIf="!conn.avatarUrl" class="connection-avatar-icon">account_circle</mat-icon>
              <div class="connection-info">
                <span class="connection-provider">{{ conn.provider }}</span>
                <span class="connection-username">{{'@'}}{{ conn.username }}</span>
              </div>
              <button mat-icon-button class="connection-remove" (click)="disconnect(conn)"
                      matTooltip="Desconectar">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Connection Form (show if not all providers connected) -->
        <div class="panel-card" *ngIf="availableProviders.length > 0">
          <div class="panel-header">
            <mat-icon>cloud</mat-icon>
            <h3>Conectar Provedor</h3>
          </div>

          <div class="connection-form">
            <mat-form-field appearance="outline">
              <mat-label>Provedor</mat-label>
              <mat-select [(ngModel)]="selectedProvider" name="provider">
                <mat-option *ngFor="let p of availableProviders" [value]="p.value">
                  <mat-icon style="font-size: 18px; margin-right: 8px;">{{ p.icon }}</mat-icon> {{ p.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Token de Acesso (PAT)</mat-label>
              <input matInput type="password" [(ngModel)]="apiToken" name="apiToken"
                     placeholder="ghp_xxxx, glpat-xxxx, etc.">
              <mat-icon matSuffix style="color: var(--text-secondary); cursor: help;"
                        matTooltip="Token pessoal com permissao de leitura de repositorios">help_outline</mat-icon>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="connectProvider()"
                    [disabled]="!selectedProvider || !apiToken || connecting"
                    class="connect-btn">
              <mat-spinner *ngIf="connecting" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
              <mat-icon *ngIf="!connecting">link</mat-icon>
              <span *ngIf="connecting">Conectando...</span><span *ngIf="!connecting">Conectar</span>
            </button>
          </div>
        </div>

        <!-- Available Repos List -->
        <div class="panel-card" *ngIf="availableRepos.length > 0 || loadingRepos">
          <div class="panel-header">
            <mat-icon>list</mat-icon>
            <h3>Selecionar Repositorio</h3>
            <span class="config-count" *ngIf="availableRepos.length > 0">{{ availableRepos.length }}</span>
          </div>

          <div *ngIf="loadingRepos" class="loading-state">
            <mat-spinner diameter="32"></mat-spinner>
            <span>Carregando repositorios...</span>
          </div>

          <ng-container *ngIf="!loadingRepos">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Buscar repositorio...</mat-label>
              <input matInput [(ngModel)]="repoSearchTerm" name="repoSearch" placeholder="Filtrar por nome...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <div class="repo-list-container">
              <div *ngIf="filteredRepos.length === 0" class="empty-state-sm">
                <mat-icon>search_off</mat-icon>
                <p>Nenhum repositorio encontrado</p>
              </div>

              <div *ngFor="let repo of filteredRepos" class="available-repo-item"
                   [class.selected]="selectedRepo?.fullName === repo.fullName"
                   (click)="selectRepo(repo)">
                <div class="available-repo-info">
                  <div class="available-repo-name">
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary);">
                      {{ repo.isPrivate ? 'lock' : 'lock_open' }}
                    </mat-icon>
                    <strong>{{ repo.fullName }}</strong>
                  </div>
                  <div class="available-repo-meta">
                    <span class="meta-chip" *ngIf="repo.language">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">circle</mat-icon>
                      {{ repo.language }}
                    </span>
                    <span class="meta-chip">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">call_split</mat-icon>
                      {{ repo.defaultBranch }}
                    </span>
                    <span class="meta-chip" *ngIf="repo.isPrivate">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">lock</mat-icon>
                      Privado
                    </span>
                  </div>
                </div>
                <mat-icon class="select-icon" *ngIf="!isAlreadyConfigured(repo)">add_circle_outline</mat-icon>
                <mat-icon class="configured-icon" *ngIf="isAlreadyConfigured(repo)"
                          matTooltip="Ja configurado">check_circle</mat-icon>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Selected Repo Confirmation -->
        <div class="panel-card" *ngIf="selectedRepo && !isAlreadyConfigured(selectedRepo)">
          <div class="panel-header">
            <mat-icon>settings</mat-icon>
            <h3>Configurar Repositorio</h3>
          </div>

          <div class="selected-repo-summary">
            <div class="summary-row">
              <span class="summary-label">Repositorio:</span>
              <strong>{{ selectedRepo.fullName }}</strong>
            </div>
            <div class="summary-row">
              <span class="summary-label">Branch padrao:</span>
              <span>{{ selectedRepo.defaultBranch }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Visibilidade:</span>
              <span>{{ selectedRepo.isPrivate ? 'Privado' : 'Publico' }}</span>
            </div>
          </div>

          <mat-form-field appearance="outline" style="margin-top: 16px;">
            <mat-label>Nome para exibicao</mat-label>
            <input matInput [(ngModel)]="repoDisplayName" name="repoDisplayName"
                   placeholder="Ex: Backend Principal">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Reviewer (username) - opcional</mat-label>
            <input matInput [(ngModel)]="reviewerUsername" name="reviewerUsername"
                   placeholder="username do revisor">
          </mat-form-field>

          <div class="form-actions">
            <button mat-button (click)="cancelSelection()">Cancelar</button>
            <button mat-raised-button color="primary" (click)="saveSelectedRepo()"
                    [disabled]="savingRepo">
              <mat-spinner *ngIf="savingRepo" diameter="18" style="display: inline-block; margin-right: 8px;"></mat-spinner>
              <mat-icon *ngIf="!savingRepo">save</mat-icon>
              Salvar Repositorio
            </button>
          </div>
        </div>
      </div>

      <!-- Right Side: Configured Repos -->
      <div class="right-panel">
        <div class="panel-card">
          <div class="panel-header">
            <mat-icon>folder_special</mat-icon>
            <h3>Repositorios Configurados</h3>
            <span class="config-count" *ngIf="configs.length > 0">{{ configs.length }}</span>
          </div>

          <div *ngIf="configs.length === 0" class="empty-state">
            <mat-icon>folder_off</mat-icon>
            <p>Nenhum repositorio configurado</p>
            <span class="empty-hint">Conecte um provedor e selecione um repositorio para comecar</span>
          </div>

          <div *ngFor="let c of configs" class="repo-item"
               [class.editing-item]="editing && editingId === c.id">
            <div class="repo-info">
              <div class="repo-provider">
                <mat-icon>{{ c.provider === 'GITHUB' ? 'code' : c.provider === 'GITLAB' ? 'merge_type' : 'source' }}</mat-icon>
                <strong>{{ c.name }}</strong>
              </div>
              <span class="repo-url">{{ c.repoOwner }}/{{ c.repoName }}</span>
              <div class="repo-meta">
                <span class="badge">{{ c.provider }}</span>
                <span class="meta-text">branch: {{ c.defaultBranch }}</span>
                <span class="meta-text" *ngIf="c.reviewerUsername">reviewer: {{ c.reviewerUsername }}</span>
              </div>
            </div>
            <div class="repo-actions">
              <button mat-icon-button (click)="edit(c)" matTooltip="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="remove(c)" matTooltip="Excluir">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>

          <!-- Inline Edit Form -->
          <div *ngIf="editing" class="edit-form-card">
            <h4>Editando: {{ editForm.name }}</h4>
            <mat-form-field appearance="outline">
              <mat-label>Nome</mat-label>
              <input matInput [(ngModel)]="editForm.name" name="editName">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Branch padrao</mat-label>
              <input matInput [(ngModel)]="editForm.defaultBranch" name="editBranch">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Token de Acesso (novo)</mat-label>
              <input matInput type="password" [(ngModel)]="editForm.apiToken" name="editToken"
                     placeholder="Deixe vazio para manter o atual">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Reviewer (username)</mat-label>
              <input matInput [(ngModel)]="editForm.reviewerUsername" name="editReviewer">
            </mat-form-field>
            <div class="form-actions">
              <button mat-button (click)="cancelEdit()">Cancelar</button>
              <button mat-raised-button color="primary" (click)="saveEdit()">
                <mat-icon>save</mat-icon> Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .config-layout {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;
      align-items: start;
    }

    .left-panel, .right-panel { display: flex; flex-direction: column; gap: 20px; }

    .panel-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px;
    }

    .panel-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
    }
    .panel-header mat-icon {
      color: var(--primary); font-size: 22px; width: 22px; height: 22px;
    }
    .panel-header h3 { margin: 0; font-size: 16px; font-weight: 600; flex: 1; }
    .config-count {
      background: var(--primary); color: white; border-radius: 12px;
      padding: 2px 10px; font-size: 12px; font-weight: 600;
    }

    /* Connected providers badges */
    .connections-list { display: flex; flex-direction: column; gap: 10px; }
    .connection-badge {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 10px; transition: all 0.15s;
    }
    .connection-badge:hover { border-color: #86efac; }
    .connection-avatar {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover;
    }
    .connection-avatar-icon {
      font-size: 32px; width: 32px; height: 32px; color: #16a34a;
    }
    .connection-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .connection-provider {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      color: #15803d; letter-spacing: 0.5px;
    }
    .connection-username {
      font-size: 14px; font-weight: 500; color: #166534;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .connection-remove {
      opacity: 0.4; transition: opacity 0.15s;
    }
    .connection-remove:hover { opacity: 1; }
    .connection-remove mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .connection-form { display: flex; flex-direction: column; gap: 0; }
    mat-form-field { width: 100%; }

    .connect-btn {
      align-self: flex-start; margin-top: 4px;
      display: flex; align-items: center; gap: 4px;
    }

    .loading-state {
      display: flex; align-items: center; gap: 16px; padding: 24px;
      color: var(--text-secondary); font-size: 14px;
    }

    .search-field { margin-bottom: 0; }

    .repo-list-container {
      max-height: 400px; overflow-y: auto;
      border: 1px solid var(--border); border-radius: 8px;
    }

    .available-repo-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; cursor: pointer; transition: all 0.15s ease;
      border-bottom: 1px solid var(--border);
    }
    .available-repo-item:last-child { border-bottom: none; }
    .available-repo-item:hover { background: rgba(var(--primary-rgb, 99, 102, 241), 0.04); }
    .available-repo-item.selected {
      background: rgba(var(--primary-rgb, 99, 102, 241), 0.08);
      border-left: 3px solid var(--primary);
    }

    .available-repo-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .available-repo-name {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .available-repo-meta { display: flex; gap: 12px; flex-wrap: wrap; }
    .meta-chip {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; color: var(--text-secondary);
    }

    .select-icon { color: var(--primary); opacity: 0; transition: opacity 0.15s; }
    .available-repo-item:hover .select-icon { opacity: 1; }
    .configured-icon { color: #16a34a; font-size: 20px; width: 20px; height: 20px; }

    .selected-repo-summary {
      background: rgba(var(--primary-rgb, 99, 102, 241), 0.04);
      border: 1px solid var(--border); border-radius: 8px; padding: 16px;
    }
    .summary-row {
      display: flex; gap: 8px; align-items: center; padding: 4px 0; font-size: 13px;
    }
    .summary-label { color: var(--text-secondary); min-width: 100px; }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 12px; }

    .empty-state { text-align: center; padding: 48px 24px; color: var(--text-secondary); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
    .empty-state p { margin: 12px 0 4px; font-size: 15px; }
    .empty-hint { font-size: 12px; color: var(--text-secondary); opacity: 0.7; }

    .empty-state-sm { text-align: center; padding: 24px; color: var(--text-secondary); }
    .empty-state-sm mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.3; }
    .empty-state-sm p { margin: 8px 0 0; font-size: 13px; }

    .repo-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
      margin-bottom: 12px; transition: all 0.2s;
    }
    .repo-item:hover { border-color: var(--primary-light); }
    .repo-item.editing-item { border-color: var(--primary); background: rgba(var(--primary-rgb, 99, 102, 241), 0.04); }
    .repo-info { display: flex; flex-direction: column; gap: 4px; }
    .repo-provider { display: flex; align-items: center; gap: 8px; }
    .repo-provider mat-icon { color: var(--primary); font-size: 20px; width: 20px; height: 20px; }
    .repo-url { font-size: 13px; color: var(--text-secondary); }
    .repo-meta { display: flex; gap: 12px; margin-top: 4px; }
    .badge {
      padding: 2px 8px; background: #eff6ff; color: #2563eb;
      border-radius: 4px; font-size: 11px; font-weight: 600;
    }
    .meta-text { font-size: 12px; color: var(--text-secondary); }
    .repo-actions { display: flex; gap: 4px; }

    .edit-form-card {
      margin-top: 16px; padding: 20px; border: 1px solid var(--primary);
      border-radius: var(--radius-sm); background: rgba(var(--primary-rgb, 99, 102, 241), 0.02);
    }
    .edit-form-card h4 { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: var(--primary); }

    @media (max-width: 900px) {
      .config-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class RepoConfigComponent implements OnInit {
  configs: RepoConfig[] = [];
  editing = false;
  editingId: number | null = null;

  // Connections
  connections: GitConnection[] = [];
  connecting = false;
  selectedProvider = '';
  apiToken = '';

  readonly allProviders = [
    { value: 'GITHUB', label: 'GitHub', icon: 'code' },
    { value: 'GITLAB', label: 'GitLab', icon: 'merge_type' },
    { value: 'BITBUCKET', label: 'Bitbucket', icon: 'source' }
  ];

  // Available repos (aggregated from all connections)
  availableRepos: GitRepo[] = [];
  loadingRepos = false;
  repoSearchTerm = '';
  selectedRepo: GitRepo | null = null;

  // Save
  repoDisplayName = '';
  reviewerUsername = '';
  savingRepo = false;

  // Edit form
  editForm: RepoConfigRequest = {
    name: '', provider: 'GITHUB', repoOwner: '', repoName: '',
    apiToken: '', defaultBranch: 'main', reviewerUsername: ''
  };

  constructor(private repoConfigService: RepoConfigService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadConfigs();
    this.loadConnections();
  }

  get availableProviders() {
    const connectedProviders = this.connections.map(c => c.provider);
    return this.allProviders.filter(p => !connectedProviders.includes(p.value));
  }

  get filteredRepos(): GitRepo[] {
    if (!this.repoSearchTerm.trim()) return this.availableRepos;
    const term = this.repoSearchTerm.toLowerCase();
    return this.availableRepos.filter(r =>
      r.fullName.toLowerCase().includes(term) ||
      (r.language && r.language.toLowerCase().includes(term))
    );
  }

  loadConfigs(): void {
    this.repoConfigService.findAll().subscribe(configs => this.configs = configs);
  }

  loadConnections(): void {
    this.repoConfigService.getConnections().subscribe({
      next: (connections) => {
        this.connections = connections;
        if (connections.length > 0) {
          this.loadAllRepos();
        }
        // Auto-select first available provider
        if (this.availableProviders.length > 0 && !this.selectedProvider) {
          this.selectedProvider = this.availableProviders[0].value;
        }
      },
      error: () => {
        // Silently handle - connections may not be set up yet
      }
    });
  }

  loadAllRepos(): void {
    this.availableRepos = [];
    this.loadingRepos = true;
    let pending = this.connections.length;
    if (pending === 0) {
      this.loadingRepos = false;
      return;
    }

    for (const conn of this.connections) {
      this.repoConfigService.listReposByConnection(conn.id).subscribe({
        next: (repos) => {
          this.availableRepos = [...this.availableRepos, ...repos];
          pending--;
          if (pending === 0) this.loadingRepos = false;
        },
        error: () => {
          pending--;
          if (pending === 0) this.loadingRepos = false;
        }
      });
    }
  }

  connectProvider(): void {
    if (!this.selectedProvider || !this.apiToken) return;
    this.connecting = true;

    this.repoConfigService.connect({ provider: this.selectedProvider, apiToken: this.apiToken }).subscribe({
      next: (response) => {
        this.connecting = false;
        this.apiToken = '';

        const newConn: GitConnection = {
          id: response.id,
          provider: response.provider || this.selectedProvider,
          username: response.username,
          avatarUrl: response.avatarUrl
        };
        this.connections = [...this.connections, newConn];

        this.snackBar.open(
          `Conectado ao ${newConn.provider} como @${newConn.username}`,
          'OK', { duration: 3000 }
        );

        // Auto-select next available provider
        if (this.availableProviders.length > 0) {
          this.selectedProvider = this.availableProviders[0].value;
        } else {
          this.selectedProvider = '';
        }

        // Load repos from new connection
        this.loadingRepos = true;
        this.repoConfigService.listReposByConnection(newConn.id).subscribe({
          next: (repos) => {
            this.availableRepos = [...this.availableRepos, ...repos];
            this.loadingRepos = false;
          },
          error: () => { this.loadingRepos = false; }
        });
      },
      error: (err) => {
        this.connecting = false;
        this.snackBar.open('Erro ao conectar: verifique o token e tente novamente', 'OK', { duration: 4000 });
      }
    });
  }

  disconnect(conn: GitConnection): void {
    const ref = this.snackBar.open(`Desconectar ${conn.provider} (@${conn.username})?`, 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
    this.repoConfigService.deleteConnection(conn.id).subscribe({
      next: () => {
        this.connections = this.connections.filter(c => c.id !== conn.id);
        this.snackBar.open(`${conn.provider} desconectado`, 'OK', { duration: 2000 });
        // Reload all repos (removed repos from disconnected provider)
        this.loadAllRepos();
        // Update selected provider
        if (this.availableProviders.length > 0 && !this.selectedProvider) {
          this.selectedProvider = this.availableProviders[0].value;
        }
      },
      error: () => {
        this.snackBar.open('Erro ao desconectar', 'OK', { duration: 3000 });
      }
    });
    });
  }

  isAlreadyConfigured(repo: GitRepo): boolean {
    return this.configs.some(c =>
      c.repoOwner === repo.owner && c.repoName === repo.name
    );
  }

  selectRepo(repo: GitRepo): void {
    if (this.isAlreadyConfigured(repo)) {
      this.snackBar.open('Este repositorio ja esta configurado', 'OK', { duration: 2000 });
      return;
    }
    this.selectedRepo = repo;
    this.repoDisplayName = repo.name;
    this.reviewerUsername = '';
  }

  cancelSelection(): void {
    this.selectedRepo = null;
    this.repoDisplayName = '';
    this.reviewerUsername = '';
  }

  saveSelectedRepo(): void {
    if (!this.selectedRepo) return;
    this.savingRepo = true;

    // Find the connection for this repo's provider
    const ownerParts = this.selectedRepo.fullName.split('/');
    const repoProvider = this.connections.find(c =>
      this.availableRepos.some(r => r.fullName === this.selectedRepo!.fullName)
    );

    const data: RepoConfigRequest = {
      name: this.repoDisplayName || this.selectedRepo.name,
      provider: repoProvider?.provider || this.connections[0]?.provider || 'GITHUB',
      repoOwner: this.selectedRepo.owner,
      repoName: this.selectedRepo.name,
      apiToken: '',
      defaultBranch: this.selectedRepo.defaultBranch,
      reviewerUsername: this.reviewerUsername || undefined
    };

    this.repoConfigService.create(data).subscribe({
      next: () => {
        this.snackBar.open('Repositorio adicionado com sucesso!', 'OK', { duration: 2000 });
        this.loadConfigs();
        this.selectedRepo = null;
        this.repoDisplayName = '';
        this.reviewerUsername = '';
        this.savingRepo = false;
      },
      error: () => {
        this.snackBar.open('Erro ao salvar repositorio', 'OK', { duration: 3000 });
        this.savingRepo = false;
      }
    });
  }

  edit(config: RepoConfig): void {
    this.editing = true;
    this.editingId = config.id;
    this.editForm = {
      name: config.name,
      provider: config.provider,
      repoOwner: config.repoOwner,
      repoName: config.repoName,
      apiToken: '',
      defaultBranch: config.defaultBranch,
      reviewerUsername: config.reviewerUsername || ''
    };
  }

  saveEdit(): void {
    if (!this.editingId) return;
    this.repoConfigService.update(this.editingId, this.editForm).subscribe({
      next: () => {
        this.snackBar.open('Repositorio atualizado', 'OK', { duration: 2000 });
        this.loadConfigs();
        this.cancelEdit();
      },
      error: () => {
        this.snackBar.open('Erro ao atualizar repositorio', 'OK', { duration: 3000 });
      }
    });
  }

  remove(config: RepoConfig): void {
    const ref = this.snackBar.open('Excluir repositorio ' + config.name + '?', 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.repoConfigService.delete(config.id).subscribe(() => {
        this.snackBar.open('Repositorio excluido', 'OK', { duration: 2000 });
        this.loadConfigs();
      });
    });
  }

  cancelEdit(): void {
    this.editing = false;
    this.editingId = null;
  }
}
