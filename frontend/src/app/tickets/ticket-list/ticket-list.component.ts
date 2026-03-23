import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { Ticket } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatPaginatorModule, MatTooltipModule, MatInputModule],
  template: `
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Chamados</h1>
        <p class="page-subtitle">Gerencie e acompanhe todos os chamados</p>
      </div>
      <div class="header-actions">
        <button mat-stroked-button class="board-btn" (click)="goToBoard()">
          <mat-icon>view_kanban</mat-icon> Quadro
        </button>
        <a mat-raised-button color="primary" routerLink="/tickets/new" class="new-btn">
          <mat-icon>add</mat-icon> Novo Chamado
        </a>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="stats-bar">
      <div class="stat-chip">
        <mat-icon>confirmation_number</mat-icon>
        <span>{{ totalElements }} tickets</span>
      </div>
      <div class="stat-chip alta" *ngIf="countByPriority('ALTA') > 0">
        <mat-icon>priority_high</mat-icon>
        <span>{{ countByPriority('ALTA') }} alta</span>
      </div>
      <div class="stat-chip media" *ngIf="countByPriority('MEDIA') > 0">
        <mat-icon>remove</mat-icon>
        <span>{{ countByPriority('MEDIA') }} media</span>
      </div>
      <div class="stat-chip baixa" *ngIf="countByPriority('BAIXA') > 0">
        <mat-icon>arrow_downward</mat-icon>
        <span>{{ countByPriority('BAIXA') }} baixa</span>
      </div>
    </div>

    <!-- Filters inline -->
    <div class="filters-bar">
      <div class="filter-group">
        <mat-icon class="filter-icon">filter_list</mat-icon>
        <div class="filter-chips">
          <button *ngFor="let s of statusOptions" class="filter-chip"
                  [class.active]="filterStatus === s.value"
                  (click)="filterStatus = s.value; loadTickets()">
            {{ s.label }}
          </button>
        </div>
      </div>
      <div class="filter-divider"></div>
      <div class="filter-selects">
        <mat-form-field appearance="outline" class="filter-field-sm">
          <mat-label>Prioridade</mat-label>
          <mat-select [(ngModel)]="filterPrioridade" (selectionChange)="loadTickets()">
            <mat-option value="">Todas</mat-option>
            <mat-option value="ALTA">Alta</mat-option>
            <mat-option value="MEDIA">Media</mat-option>
            <mat-option value="BAIXA">Baixa</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-field-sm">
          <mat-label>Categoria</mat-label>
          <mat-select [(ngModel)]="filterCategoria" (selectionChange)="loadTickets()">
            <mat-option value="">Todas</mat-option>
            <mat-option value="TECNICO">Tecnico</mat-option>
            <mat-option value="FINANCEIRO">Financeiro</mat-option>
            <mat-option value="COMERCIAL">Comercial</mat-option>
            <mat-option value="ADMINISTRATIVO">Administrativo</mat-option>
            <mat-option value="OUTROS">Outros</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <button mat-icon-button class="clear-filters" *ngIf="filterStatus || filterPrioridade || filterCategoria"
              (click)="clearFilters()" matTooltip="Limpar filtros">
        <mat-icon>filter_alt_off</mat-icon>
      </button>
    </div>

    <!-- Empty state -->
    <div class="empty-state" *ngIf="tickets.length === 0">
      <mat-icon>inbox</mat-icon>
      <h3>Nenhum chamado encontrado</h3>
      <p>Crie um novo chamado ou ajuste os filtros</p>
      <a mat-raised-button color="primary" routerLink="/tickets/new">
        <mat-icon>add</mat-icon> Criar Chamado
      </a>
    </div>

    <!-- Ticket table -->
    <div class="tickets-table" *ngIf="tickets.length > 0">
      <div class="table-header">
        <span class="col-id">#</span>
        <span class="col-title">Titulo</span>
        <span class="col-cat">Categoria</span>
        <span class="col-pri">Prioridade</span>
        <span class="col-status">Status</span>
        <span class="col-score">IA</span>
        <span class="col-date">Data</span>
      </div>
      <a *ngFor="let t of tickets" [routerLink]="['/tickets', t.id]" class="table-row">
        <span class="col-id ticket-id">#{{ t.id }}</span>
        <div class="col-title">
          <span class="ticket-title">{{ t.titulo }}</span>
          <span class="ticket-desc">{{ t.descricao | slice:0:80 }}</span>
        </div>
        <span class="col-cat">
          <span class="badge" [class]="'cat-' + t.categoria.toLowerCase()">{{ t.categoria }}</span>
        </span>
        <span class="col-pri">
          <span class="pri-indicator" [class]="'pri-dot-' + t.prioridade.toLowerCase()"></span>
          {{ t.prioridade }}
        </span>
        <span class="col-status">
          <span class="badge" [class]="'st-' + t.status.toLowerCase()">{{ t.status.replace('_', ' ') }}</span>
        </span>
        <span class="col-score">
          <div class="score-bar-container" matTooltip="Confianca da IA">
            <div class="score-bar" [style.width.%]="(t.aiScore || 0) * 100"
                 [class.score-high]="(t.aiScore || 0) >= 0.7"
                 [class.score-mid]="(t.aiScore || 0) >= 0.4 && (t.aiScore || 0) < 0.7"
                 [class.score-low]="(t.aiScore || 0) < 0.4"></div>
          </div>
          <span class="score-text">{{ (t.aiScore || 0) * 100 | number:'1.0-0' }}%</span>
        </span>
        <span class="col-date">{{ t.createdAt | date:'dd/MM' }}</span>
      </a>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar" *ngIf="tickets.length > 0">
      <span class="pagination-info">
        Mostrando {{ page * 20 + 1 }}-{{ Math.min((page + 1) * 20, totalElements) }} de {{ totalElements }}
      </span>
      <mat-paginator [length]="totalElements" [pageSize]="20" (page)="onPage($event)"
                     [hidePageSize]="true" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
    }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; color: var(--text); }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .board-btn {
      height: 42px; border-radius: 10px !important; font-weight: 500;
      border-color: var(--border) !important;
    }
    .board-btn mat-icon { margin-right: 4px; font-size: 18px; }
    .new-btn {
      height: 42px; border-radius: 10px !important; font-weight: 600;
      background: var(--primary) !important;
    }

    /* Stats bar */
    .stats-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat-chip {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 20px; font-size: 13px; font-weight: 500; color: var(--text-secondary);
    }
    .stat-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .stat-chip.alta { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
    .stat-chip.alta mat-icon { color: #dc2626; }
    .stat-chip.media { background: #fffbeb; color: #d97706; border-color: #fde68a; }
    .stat-chip.media mat-icon { color: #d97706; }
    .stat-chip.baixa { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
    .stat-chip.baixa mat-icon { color: #16a34a; }

    /* Filters */
    .filters-bar {
      display: flex; gap: 16px; margin-bottom: 20px; align-items: center;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; padding: 10px 16px;
    }
    .filter-group { display: flex; align-items: center; gap: 8px; }
    .filter-icon { color: var(--text-secondary); font-size: 20px; width: 20px; height: 20px; }
    .filter-chips { display: flex; gap: 4px; flex-wrap: wrap; }
    .filter-chip {
      padding: 5px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;
      border: 1px solid var(--border); background: transparent;
      color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
      white-space: nowrap;
    }
    .filter-chip:hover { border-color: var(--primary); color: var(--primary); }
    .filter-chip.active {
      background: var(--primary); color: white; border-color: var(--primary);
    }
    .filter-divider { width: 1px; height: 28px; background: var(--border); }
    .filter-selects { display: flex; gap: 8px; }
    .filter-field-sm { width: 140px; }
    .filter-field-sm .mat-mdc-form-field-subscript-wrapper { display: none; }
    .clear-filters { color: var(--text-secondary); margin-left: auto; }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 60px 20px;
      background: var(--bg-card); border: 2px dashed var(--border);
      border-radius: 16px;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-secondary); opacity: 0.5; }
    .empty-state h3 { margin: 16px 0 8px; color: var(--text); font-size: 18px; }
    .empty-state p { color: var(--text-secondary); margin-bottom: 20px; }

    /* Table */
    .tickets-table {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .table-header {
      display: grid;
      grid-template-columns: 50px 1fr 120px 100px 130px 90px 60px;
      padding: 12px 20px; background: #f8fafc;
      border-bottom: 1px solid var(--border);
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-secondary);
    }
    .table-row {
      display: grid;
      grid-template-columns: 50px 1fr 120px 100px 130px 90px 60px;
      padding: 14px 20px; border-bottom: 1px solid #f1f5f9;
      text-decoration: none; color: var(--text);
      transition: background 0.15s; cursor: pointer;
      align-items: center;
    }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: #f8fafc; }

    .ticket-id { font-weight: 600; color: var(--text-secondary); font-size: 13px; }
    .col-title { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding-right: 16px; }
    .ticket-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ticket-desc { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .col-pri { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
    .pri-indicator { width: 8px; height: 8px; border-radius: 50%; }
    .pri-dot-alta { background: #dc2626; }
    .pri-dot-media { background: #d97706; }
    .pri-dot-baixa { background: #16a34a; }

    .col-score { display: flex; align-items: center; gap: 6px; }
    .score-bar-container {
      width: 40px; height: 6px; background: #e2e8f0;
      border-radius: 3px; overflow: hidden;
    }
    .score-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .score-high { background: #16a34a; }
    .score-mid { background: #d97706; }
    .score-low { background: #dc2626; }
    .score-text { font-size: 12px; color: var(--text-secondary); font-weight: 500; }

    .col-date { font-size: 12px; color: var(--text-secondary); }

    .badge {
      padding: 3px 8px; border-radius: 6px; font-size: 10px;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
      white-space: nowrap;
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
    .st-code_review { background: #ede9fe; color: #7c3aed; }
    .st-resolvido { background: #d1fae5; color: #059669; }
    .st-fechado { background: #f1f5f9; color: #475569; }

    /* Pagination */
    .pagination-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; padding: 4px 16px; margin-top: 16px;
    }
    .pagination-info { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

    @media (max-width: 900px) {
      .page-header { flex-direction: column; gap: 16px; }
      .filters-bar { flex-direction: column; align-items: stretch; gap: 10px; }
      .filter-group { flex-wrap: wrap; }
      .filter-divider { display: none; }
      .filter-selects { flex-direction: column; }
      .filter-field-sm { width: 100%; }
      .table-header { display: none; }
      .table-row {
        grid-template-columns: 1fr;
        gap: 8px; padding: 16px;
        border: 1px solid var(--border); border-radius: 12px;
        margin-bottom: 8px;
      }
      .tickets-table { background: none; border: none; }
      .pagination-bar { flex-direction: column; gap: 8px; padding: 12px; }
    }
  `]
})
export class TicketListComponent implements OnInit {
  Math = Math;
  tickets: Ticket[] = [];
  totalElements = 0;
  page = 0;
  filterStatus = '';
  filterPrioridade = '';
  filterCategoria = '';

  statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'ABERTO', label: 'Aberto' },
    { value: 'EM_ANDAMENTO', label: 'Andamento' },
    { value: 'CODE_REVIEW', label: 'Review' },
    { value: 'RESOLVIDO', label: 'Resolvido' },
    { value: 'FECHADO', label: 'Fechado' },
  ];

  constructor(private ticketService: TicketService, private router: Router) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    const filters: any = {};
    if (this.filterStatus) filters.status = this.filterStatus;
    if (this.filterPrioridade) filters.prioridade = this.filterPrioridade;
    if (this.filterCategoria) filters.categoria = this.filterCategoria;

    this.ticketService.findAll(this.page, 20, filters).subscribe(res => {
      this.tickets = res.content;
      this.totalElements = res.totalElements;
    });
  }

  countByPriority(pri: string): number {
    return this.tickets.filter(t => t.prioridade === pri).length;
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterPrioridade = '';
    this.filterCategoria = '';
    this.loadTickets();
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.loadTickets();
  }

  goToBoard(): void {
    this.router.navigate(['/tickets/board']);
  }
}
