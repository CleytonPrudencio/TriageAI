import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SistemaService, Sistema } from '../../services/sistema.service';
import { RepoConfigService } from '../../services/repo-config.service';
import { RepoConfig } from '../../models/repo-config.model';

@Component({
  selector: 'app-sistemas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    MatDividerModule, MatSnackBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Sistemas / Ambientes</h1>
        <p class="page-subtitle">Gerencie os sistemas e vincule repositorios para auto-fix e triagem</p>
      </div>
      <button mat-raised-button color="primary" (click)="openForm()" *ngIf="!showForm">
        <mat-icon>add</mat-icon> Novo Sistema
      </button>
    </div>

    <!-- Inline Form -->
    <div class="form-card" *ngIf="showForm">
      <div class="form-card-header">
        <mat-icon>{{ editing ? 'edit' : 'add_circle' }}</mat-icon>
        <h3>{{ editing ? 'Editar Sistema' : 'Novo Sistema' }}</h3>
      </div>

      <div class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Nome *</mat-label>
          <input matInput [(ngModel)]="form.nome" name="nome" placeholder="Ex: Portal do Cliente">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Descricao</mat-label>
          <input matInput [(ngModel)]="form.descricao" name="descricao" placeholder="Breve descricao do sistema">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Repositorio</mat-label>
          <mat-select [(ngModel)]="form.repoConfigId" name="repoConfigId">
            <mat-option [value]="null">Nenhum</mat-option>
            <mat-option *ngFor="let rc of repoConfigs" [value]="rc.id">
              {{ rc.name }} ({{ rc.repoOwner }}/{{ rc.repoName }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="toggle-row">
          <mat-slide-toggle [(ngModel)]="form.autoFixEnabled" name="autoFixEnabled" color="primary">
            Auto-fix automatico
          </mat-slide-toggle>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Reviewer padrao (username GitHub)</mat-label>
          <input matInput [(ngModel)]="form.defaultReviewer" name="defaultReviewer" placeholder="ex: johndoe">
        </mat-form-field>

        <div class="branch-mapping">
          <h4><mat-icon>account_tree</mat-icon> Mapeamento de Branches (de onde cada tipo sai)</h4>
          <div class="branch-grid">
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>hotfix (producao)</mat-label>
              <input matInput [(ngModel)]="form.branchHotfix" name="branchHotfix" placeholder="main">
            </mat-form-field>
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>bugfix</mat-label>
              <input matInput [(ngModel)]="form.branchBugfix" name="branchBugfix" placeholder="develop">
            </mat-form-field>
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>fix</mat-label>
              <input matInput [(ngModel)]="form.branchFix" name="branchFix" placeholder="develop">
            </mat-form-field>
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>feat</mat-label>
              <input matInput [(ngModel)]="form.branchFeat" name="branchFeat" placeholder="develop">
            </mat-form-field>
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>refactor</mat-label>
              <input matInput [(ngModel)]="form.branchRefactor" name="branchRefactor" placeholder="develop">
            </mat-form-field>
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>docs</mat-label>
              <input matInput [(ngModel)]="form.branchDocs" name="branchDocs" placeholder="develop">
            </mat-form-field>
            <mat-form-field appearance="outline" class="branch-field">
              <mat-label>chore</mat-label>
              <input matInput [(ngModel)]="form.branchChore" name="branchChore" placeholder="develop">
            </mat-form-field>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button mat-button (click)="cancelForm()">Cancelar</button>
        <button mat-raised-button color="primary" (click)="save()" [disabled]="!form.nome">
          <mat-icon>save</mat-icon> {{ editing ? 'Atualizar' : 'Salvar' }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" *ngIf="sistemas.length === 0 && !showForm">
      <mat-icon>dns</mat-icon>
      <p>Nenhum sistema cadastrado</p>
      <span class="empty-hint">Crie um sistema para vincular repositorios e configurar auto-fix</span>
    </div>

    <!-- Sistemas Grid -->
    <div class="sistemas-grid" *ngIf="sistemas.length > 0">
      <div *ngFor="let s of sistemas" class="sistema-card" [class.editing-card]="editing && editingId === s.id">
        <div class="sistema-card-header">
          <div class="sistema-name-row">
            <mat-icon class="sistema-icon">dns</mat-icon>
            <div>
              <strong class="sistema-name">{{ s.nome }}</strong>
              <p class="sistema-desc" *ngIf="s.descricao">{{ s.descricao }}</p>
            </div>
          </div>
          <div class="sistema-actions">
            <button mat-icon-button (click)="edit(s)" matTooltip="Editar">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="remove(s)" matTooltip="Excluir">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <div class="sistema-badges">
          <span class="badge repo-badge" *ngIf="s.repoFullName">
            <mat-icon class="badge-icon">{{ getProviderIcon(s.provider) }}</mat-icon>
            {{ s.repoFullName }}
          </span>
          <span class="badge repo-badge no-repo" *ngIf="!s.repoFullName">
            <mat-icon class="badge-icon">link_off</mat-icon>
            Sem repositorio
          </span>

          <span class="badge branch-badge" *ngIf="s.branchMapping">
            <mat-icon class="badge-icon">smart_toy</mat-icon>
            Branch: Auto (IA)
          </span>
          <span class="badge branch-badge" *ngIf="s.branchMapping" matTooltip="hotfix={{s.branchMapping.hotfix}} | bugfix={{s.branchMapping.bugfix}} | feat={{s.branchMapping.feat}}">
            <mat-icon class="badge-icon">account_tree</mat-icon>
            hotfix→{{s.branchMapping.hotfix}} | feat→{{s.branchMapping.feat}}
          </span>

          <span class="badge autofix-badge" [class.autofix-on]="s.autoFixEnabled" [class.autofix-off]="!s.autoFixEnabled">
            <mat-icon class="badge-icon">{{ s.autoFixEnabled ? 'check_circle' : 'cancel' }}</mat-icon>
            Auto-fix {{ s.autoFixEnabled ? 'Ativado' : 'Desativado' }}
          </span>

          <span class="badge reviewer-badge" *ngIf="s.defaultReviewer">
            <mat-icon class="badge-icon">person</mat-icon>
            Reviewer: {{ s.defaultReviewer }}
          </span>

          <span class="badge branch-type-badge">
            <mat-icon class="badge-icon">smart_toy</mat-icon>
            Branch: Auto (IA)
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .form-card {
      background: var(--bg-card); border: 1px solid var(--primary);
      border-radius: var(--radius); padding: 24px; margin-top: 24px;
    }
    .form-card-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
    }
    .form-card-header mat-icon { color: var(--primary); font-size: 22px; width: 22px; height: 22px; }
    .form-card-header h3 { margin: 0; font-size: 16px; font-weight: 600; }

    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px;
    }
    .form-grid mat-form-field { width: 100%; }
    .toggle-row {
      display: flex; align-items: center; padding: 8px 0 16px;
    }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }

    .empty-state {
      text-align: center; padding: 64px 24px; color: var(--text-secondary); margin-top: 24px;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
    .empty-state p { margin: 12px 0 4px; font-size: 15px; }
    .empty-hint { font-size: 12px; color: var(--text-secondary); opacity: 0.7; }

    .sistemas-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 16px; margin-top: 24px;
    }

    .sistema-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px; transition: all 0.2s;
    }
    .sistema-card:hover { border-color: var(--primary-light); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .sistema-card.editing-card { border-color: var(--primary); }

    .sistema-card-header {
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    .sistema-name-row { display: flex; gap: 12px; align-items: flex-start; flex: 1; min-width: 0; }
    .sistema-icon { color: var(--primary); font-size: 24px; width: 24px; height: 24px; margin-top: 2px; }
    .sistema-name { font-size: 16px; display: block; }
    .sistema-desc { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
    .sistema-actions { display: flex; gap: 2px; flex-shrink: 0; }

    .sistema-badges {
      display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;
    }

    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
    }
    .badge-icon { font-size: 14px; width: 14px; height: 14px; }

    .repo-badge { background: #eff6ff; color: #2563eb; }
    .repo-badge.no-repo { background: #f1f5f9; color: #94a3b8; }

    .branch-badge { background: #f0fdfa; color: #0d9488; }

    .autofix-on { background: #dcfce7; color: #16a34a; }
    .autofix-off { background: #f1f5f9; color: #94a3b8; }

    .reviewer-badge { background: #fef3c7; color: #92400e; }

    .branch-type-badge {
      background: #ede9fe; color: #7c3aed;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    .branch-mapping { margin-top: 16px; }
    .branch-mapping h4 { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #334155; margin-bottom: 12px; }
    .branch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .branch-field { font-size: 13px; }

    @media (max-width: 900px) {
      .branch-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .sistemas-grid { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .branch-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SistemasComponent implements OnInit {
  sistemas: Sistema[] = [];
  repoConfigs: RepoConfig[] = [];
  showForm = false;
  editing = false;
  editingId: number | null = null;

  form: any = {
    nome: '',
    descricao: '',
    repoConfigId: null,
    autoFixEnabled: false,
    defaultReviewer: '',
    branchHotfix: 'main',
    branchBugfix: 'develop',
    branchFix: 'develop',
    branchFeat: 'develop',
    branchRefactor: 'develop',
    branchDocs: 'develop',
    branchChore: 'develop'
  };

  constructor(
    private sistemaService: SistemaService,
    private repoConfigService: RepoConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
    this.repoConfigService.findAll().subscribe(configs => this.repoConfigs = configs);
  }

  load(): void {
    this.sistemaService.findAll().subscribe(sistemas => this.sistemas = sistemas);
  }

  getProviderIcon(provider: string): string {
    if (!provider) return 'source';
    switch (provider.toUpperCase()) {
      case 'GITHUB': return 'code';
      case 'GITLAB': return 'merge_type';
      case 'BITBUCKET': return 'source';
      default: return 'source';
    }
  }

  openForm(): void {
    this.showForm = true;
    this.editing = false;
    this.editingId = null;
    this.form = {
      nome: '', descricao: '', repoConfigId: null, autoFixEnabled: false, defaultReviewer: '',
      branchHotfix: 'main', branchBugfix: 'develop', branchFix: 'develop',
      branchFeat: 'develop', branchRefactor: 'develop', branchDocs: 'develop', branchChore: 'develop'
    };
  }

  edit(sistema: any): void {
    this.showForm = true;
    this.editing = true;
    this.editingId = sistema.id;
    const bm = sistema.branchMapping || {};
    this.form = {
      nome: sistema.nome,
      descricao: sistema.descricao || '',
      repoConfigId: sistema.repoConfigId,
      autoFixEnabled: sistema.autoFixEnabled || false,
      defaultReviewer: sistema.defaultReviewer || '',
      branchHotfix: bm.hotfix || 'main',
      branchBugfix: bm.bugfix || 'develop',
      branchFix: bm.fix || 'develop',
      branchFeat: bm.feat || 'develop',
      branchRefactor: bm.refactor || 'develop',
      branchDocs: bm.docs || 'develop',
      branchChore: bm.chore || 'develop'
    };
  }

  cancelForm(): void {
    this.showForm = false;
    this.editing = false;
    this.editingId = null;
  }

  save(): void {
    if (!this.form.nome) return;

    if (this.editing && this.editingId) {
      this.sistemaService.update(this.editingId, this.form).subscribe({
        next: () => {
          this.snackBar.open('Sistema atualizado com sucesso!', 'OK', { duration: 2000 });
          this.load();
          this.cancelForm();
        },
        error: () => {
          this.snackBar.open('Erro ao atualizar sistema', 'OK', { duration: 3000 });
        }
      });
    } else {
      this.sistemaService.create(this.form).subscribe({
        next: () => {
          this.snackBar.open('Sistema criado com sucesso!', 'OK', { duration: 2000 });
          this.load();
          this.cancelForm();
        },
        error: () => {
          this.snackBar.open('Erro ao criar sistema', 'OK', { duration: 3000 });
        }
      });
    }
  }

  remove(sistema: Sistema): void {
    if (confirm('Excluir sistema ' + sistema.nome + '?')) {
      this.sistemaService.delete(sistema.id).subscribe({
        next: () => {
          this.snackBar.open('Sistema excluido', 'OK', { duration: 2000 });
          this.load();
        },
        error: () => {
          this.snackBar.open('Erro ao excluir sistema', 'OK', { duration: 3000 });
        }
      });
    }
  }
}
