import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Ticket } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatPaginatorModule, MatCardModule, MatTooltipModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Chamados</h1>
        <p class="page-subtitle">Gerencie e acompanhe todos os chamados</p>
      </div>
      <div class="header-actions">
        <button mat-stroked-button class="board-btn" (click)="goToBoard()">
          <mat-icon>dashboard</mat-icon> Quadro
        </button>
        <a mat-raised-button color="primary" routerLink="/tickets/new" class="new-btn">
          <mat-icon>add</mat-icon> Novo Chamado
        </a>
      </div>
    </div>

    <div class="filters-bar">
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="filterStatus" (selectionChange)="loadTickets()">
          <mat-option value="">Todos</mat-option>
          <mat-option value="ABERTO">Aberto</mat-option>
          <mat-option value="EM_ANDAMENTO">Em Andamento</mat-option>
          <mat-option value="RESOLVIDO">Resolvido</mat-option>
          <mat-option value="FECHADO">Fechado</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Prioridade</mat-label>
        <mat-select [(ngModel)]="filterPrioridade" (selectionChange)="loadTickets()">
          <mat-option value="">Todas</mat-option>
          <mat-option value="ALTA">Alta</mat-option>
          <mat-option value="MEDIA">Media</mat-option>
          <mat-option value="BAIXA">Baixa</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field">
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

    <!-- Cards layout for tickets -->
    <div class="tickets-grid">
      <a *ngFor="let t of tickets" [routerLink]="['/tickets', t.id]" class="ticket-card">
        <div class="ticket-card-header">
          <span class="ticket-id">#{{ t.id }}</span>
          <span class="badge priority" [class]="'pri-' + t.prioridade?.toLowerCase()">{{ t.prioridade }}</span>
        </div>
        <h3 class="ticket-title">{{ t.titulo }}</h3>
        <p class="ticket-desc">{{ t.descricao | slice:0:100 }}{{ (t.descricao?.length || 0) > 100 ? '...' : '' }}</p>
        <div class="ticket-card-footer">
          <span class="badge category" [class]="'cat-' + t.categoria?.toLowerCase()">{{ t.categoria }}</span>
          <span class="badge status" [class]="'st-' + t.status?.toLowerCase()">{{ t.status?.replace('_', ' ') }}</span>
          <span class="ai-score" matTooltip="Score da IA">
            <mat-icon>smart_toy</mat-icon> {{ t.aiScore | number:'1.0-0' }}%
          </span>
        </div>
      </a>
    </div>

    <mat-paginator [length]="totalElements" [pageSize]="20" (page)="onPage($event)"
                   [hidePageSize]="true" showFirstLastButtons></mat-paginator>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
    }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; color: var(--text); }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .board-btn { height: 44px; border-radius: 10px !important; font-weight: 500; }
    .board-btn mat-icon { margin-right: 4px; }
    .new-btn { height: 44px; border-radius: 10px !important; font-weight: 600; }

    .filters-bar {
      display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .filter-field { width: 180px; }
    .filter-field .mat-mdc-form-field-subscript-wrapper { display: none; }

    .tickets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .ticket-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      text-decoration: none;
      color: var(--text);
      transition: all 0.2s;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }

    .ticket-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--primary-light);
      transform: translateY(-2px);
    }

    .ticket-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .ticket-id { color: var(--text-secondary); font-size: 13px; font-weight: 600; }
    .ticket-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; line-height: 1.4; }
    .ticket-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; line-height: 1.5; flex: 1; }

    .ticket-card-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .badge {
      padding: 4px 10px; border-radius: 6px; font-size: 11px;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
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

    .ai-score {
      margin-left: auto; display: flex; align-items: center; gap: 4px;
      color: var(--text-secondary); font-size: 12px; font-weight: 500;
    }
    .ai-score mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--primary); }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; gap: 16px; }
      .filters-bar { flex-direction: column; }
      .filter-field { width: 100%; }
      .tickets-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  totalElements = 0;
  page = 0;
  filterStatus = '';
  filterPrioridade = '';
  filterCategoria = '';

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

  onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.loadTickets();
  }

  goToBoard(): void {
    this.router.navigate(['/tickets/board']);
  }
}
