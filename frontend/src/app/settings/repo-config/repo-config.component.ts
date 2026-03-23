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
import { RepoConfig, RepoConfigRequest, GitRepo } from '../../models/repo-config.model';
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
      <!-- Left Side: Connection + Repo List -->
      <div class="left-panel">
        <!-- Connection Form -->
        <div class="panel-card">
          <div class="panel-header">
            <mat-icon>cloud</mat-icon>
            <h3>Conectar Provedor</h3>
          </div>

          <div class="connection-form">
            <mat-form-field appearance="outline">
              <mat-label>Provedor</mat-label>
              <mat-select [(ngModel)]="selectedProvider" name="provider">
                <mat-option value="GITHUB">
                  <mat-icon style="font-size: 18px; margin-right: 8px;">code</mat-icon> GitHub
                </mat-option>
                <mat-option value="GITLAB">
                  <mat-icon style="font-size: 18px; margin-right: 8px;">merge_type</mat-icon> GitLab
                </mat-option>
                <mat-option value="BITBUCKET">
                  <mat-icon style="font-size: 18px; margin-right: 8px;">source</mat-icon> Bitbucket
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

            <button mat-raised-button color="primary" (click)="connect()"
                    [disabled]="!selectedProvider || !apiToken || loadingRepos"
                    class="connect-btn">
              <mat-spinner *ngIf="loadingRepos" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
              <mat-icon *ngIf="!loadingRepos">link</mat-icon>
              {{ loadingRepos ? 'Conectando...' : 'Conectar' }}
            </button>
          </div>

          <!-- Connection Status -->
          <div *ngIf="connected" class="connection-status">
            <mat-icon style="color: #16a34a; font-size: 18px; width: 18px; height: 18px;">check_circle</mat-icon>
            <span>Conectado ao {{ selectedProvider }} &mdash; {{ availableRepos.length }} repositorios encontrados</span>
          </div>
        </div>

        <!-- Available Repos List -->
        <div class="panel-card" *ngIf="connected">
          <div class="panel-header">
            <mat-icon>list</mat-icon>
            <h3>Selecionar Repositorio</h3>
          </div>

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

    .connection-form { display: flex; flex-direction: column; gap: 0; }
    mat-form-field { width: 100%; }

    .connect-btn {
      align-self: flex-start; margin-top: 4px;
      display: flex; align-items: center; gap: 4px;
    }

    .connection-status {
      display: flex; align-items: center; gap: 8px; margin-top: 16px;
      padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 8px; font-size: 13px; color: #15803d;
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

  // Connection
  selectedProvider = 'GITHUB';
  apiToken = '';
  connected = false;
  loadingRepos = false;

  // Available repos
  availableRepos: GitRepo[] = [];
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

  ngOnInit(): void { this.loadConfigs(); }

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

  connect(): void {
    if (!this.selectedProvider || !this.apiToken) return;
    this.loadingRepos = true;
    this.connected = false;
    this.availableRepos = [];
    this.selectedRepo = null;

    this.repoConfigService.listRepos(this.selectedProvider, this.apiToken).subscribe({
      next: (repos) => {
        this.availableRepos = repos;
        this.connected = true;
        this.loadingRepos = false;
      },
      error: (err) => {
        this.loadingRepos = false;
        this.snackBar.open('Erro ao conectar: verifique o token e tente novamente', 'OK', { duration: 4000 });
      }
    });
  }

  isAlreadyConfigured(repo: GitRepo): boolean {
    return this.configs.some(c =>
      c.repoOwner === repo.owner && c.repoName === repo.name && c.provider === this.selectedProvider
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

    const data: RepoConfigRequest = {
      name: this.repoDisplayName || this.selectedRepo.name,
      provider: this.selectedProvider,
      repoOwner: this.selectedRepo.owner,
      repoName: this.selectedRepo.name,
      apiToken: this.apiToken,
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
    if (confirm('Excluir repositorio ' + config.name + '?')) {
      this.repoConfigService.delete(config.id).subscribe(() => {
        this.snackBar.open('Repositorio excluido', 'OK', { duration: 2000 });
        this.loadConfigs();
      });
    }
  }

  cancelEdit(): void {
    this.editing = false;
    this.editingId = null;
  }
}
