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
import { RepoConfig, RepoConfigRequest } from '../../models/repo-config.model';
import { RepoConfigService } from '../../services/repo-config.service';

@Component({
  selector: 'app-repo-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Repositorios</h1>
        <p class="page-subtitle">Configure repositorios para integracao com auto-fix</p>
      </div>
    </div>

    <div class="config-layout">
      <!-- Form -->
      <div class="form-card">
        <h3>{{ editing ? 'Editar' : 'Novo' }} Repositorio</h3>
        <form (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>Nome</mat-label>
            <input matInput [(ngModel)]="form.name" name="name" required placeholder="Ex: Backend Principal">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Provedor</mat-label>
            <mat-select [(ngModel)]="form.provider" name="provider" required>
              <mat-option value="GITHUB">GitHub</mat-option>
              <mat-option value="GITLAB">GitLab</mat-option>
              <mat-option value="BITBUCKET">Bitbucket</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Owner / Org</mat-label>
              <input matInput [(ngModel)]="form.repoOwner" name="repoOwner" required placeholder="ex: minha-empresa">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nome do Repo</mat-label>
              <input matInput [(ngModel)]="form.repoName" name="repoName" required placeholder="ex: backend-api">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Token de Acesso (PAT)</mat-label>
            <input matInput type="password" [(ngModel)]="form.apiToken" name="apiToken" required
                   placeholder="ghp_xxxx ou glpat-xxxx">
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Branch padrao</mat-label>
              <input matInput [(ngModel)]="form.defaultBranch" name="defaultBranch" placeholder="main">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Reviewer (username)</mat-label>
              <input matInput [(ngModel)]="form.reviewerUsername" name="reviewerUsername"
                     placeholder="username do revisor">
            </mat-form-field>
          </div>

          <div class="form-actions">
            <button mat-button type="button" *ngIf="editing" (click)="cancelEdit()">Cancelar</button>
            <button mat-raised-button color="primary" type="submit">
              <mat-icon>{{ editing ? 'save' : 'add' }}</mat-icon>
              {{ editing ? 'Salvar' : 'Adicionar' }}
            </button>
          </div>
        </form>
      </div>

      <!-- List -->
      <div class="list-card">
        <h3>Repositorios Configurados</h3>
        <div *ngIf="configs.length === 0" class="empty-state">
          <mat-icon>folder_off</mat-icon>
          <p>Nenhum repositorio configurado</p>
        </div>
        <div *ngFor="let c of configs" class="repo-item">
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
            <button mat-icon-button (click)="edit(c)" matTooltip="Editar"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" (click)="remove(c)" matTooltip="Excluir"><mat-icon>delete</mat-icon></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .config-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }

    .form-card, .list-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px;
    }

    .form-card h3, .list-card h3 { margin: 0 0 20px; font-size: 16px; font-weight: 600; }
    mat-form-field { width: 100%; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }

    .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }

    .repo-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
      margin-bottom: 12px; transition: all 0.2s;
    }
    .repo-item:hover { border-color: var(--primary-light); }
    .repo-info { display: flex; flex-direction: column; gap: 4px; }
    .repo-provider { display: flex; align-items: center; gap: 8px; }
    .repo-provider mat-icon { color: var(--primary); font-size: 20px; width: 20px; height: 20px; }
    .repo-url { font-size: 13px; color: var(--text-secondary); }
    .repo-meta { display: flex; gap: 12px; margin-top: 4px; }
    .badge { padding: 2px 8px; background: #eff6ff; color: #2563eb; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .meta-text { font-size: 12px; color: var(--text-secondary); }
    .repo-actions { display: flex; gap: 4px; }

    @media (max-width: 768px) {
      .config-layout { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
    }
  `]
})
export class RepoConfigComponent implements OnInit {
  configs: RepoConfig[] = [];
  editing = false;
  editingId: number | null = null;

  form: RepoConfigRequest = {
    name: '', provider: 'GITHUB', repoOwner: '', repoName: '',
    apiToken: '', defaultBranch: 'main', reviewerUsername: ''
  };

  constructor(private repoConfigService: RepoConfigService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadConfigs(); }

  loadConfigs(): void {
    this.repoConfigService.findAll().subscribe(configs => this.configs = configs);
  }

  onSubmit(): void {
    if (this.editing && this.editingId) {
      this.repoConfigService.update(this.editingId, this.form).subscribe(() => {
        this.snackBar.open('Repositorio atualizado', 'OK', { duration: 2000 });
        this.loadConfigs();
        this.cancelEdit();
      });
    } else {
      this.repoConfigService.create(this.form).subscribe(() => {
        this.snackBar.open('Repositorio adicionado', 'OK', { duration: 2000 });
        this.loadConfigs();
        this.resetForm();
      });
    }
  }

  edit(config: RepoConfig): void {
    this.editing = true;
    this.editingId = config.id;
    this.form = { ...config, apiToken: '' };
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
    this.resetForm();
  }

  private resetForm(): void {
    this.form = { name: '', provider: 'GITHUB', repoOwner: '', repoName: '',
      apiToken: '', defaultBranch: 'main', reviewerUsername: '' };
  }
}
