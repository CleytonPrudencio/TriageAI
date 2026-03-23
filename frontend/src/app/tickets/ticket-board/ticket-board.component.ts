import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkDragDrop, CdkDrag, CdkDropList, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Ticket } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';

interface BoardColumn {
  status: string;
  label: string;
  colorClass: string;
  tickets: Ticket[];
}

@Component({
  selector: 'app-ticket-board',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Quadro de Chamados</h1>
        <p class="page-subtitle">Arraste os chamados entre colunas para atualizar o status</p>
      </div>
      <div class="header-actions">
        <button class="view-toggle" (click)="goToList()">
          <mat-icon>view_list</mat-icon> Lista
        </button>
        <button class="btn-new" (click)="router.navigate(['/tickets/new'])">
          <mat-icon>add</mat-icon> Novo Chamado
        </button>
      </div>
    </div>

    <div class="board">
      <div class="column" *ngFor="let col of columns">
        <div class="column-header" [ngClass]="col.colorClass">
          <span class="column-title">{{ col.label }}</span>
          <span class="column-count">{{ col.tickets.length }}</span>
        </div>
        <div
          class="column-body"
          cdkDropList
          [id]="col.status"
          [cdkDropListData]="col.tickets"
          [cdkDropListConnectedTo]="columnIds"
          (cdkDropListDropped)="drop($event)"
        >
          <div
            class="card"
            *ngFor="let t of col.tickets"
            cdkDrag
            (click)="goToTicket(t.id)"
          >
            <div class="card-top">
              <span class="card-id">#{{ t.id }}</span>
              <span class="badge" [ngClass]="'pri-' + t.prioridade?.toLowerCase()">{{ t.prioridade }}</span>
            </div>
            <p class="card-title">{{ t.titulo | slice:0:50 }}{{ (t.titulo?.length || 0) > 50 ? '...' : '' }}</p>
            <div class="card-bottom">
              <span class="badge" [ngClass]="'cat-' + t.categoria?.toLowerCase()">{{ t.categoria }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
    }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; color: var(--text); }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .header-actions { display: flex; gap: 8px; align-items: center; }

    .view-toggle {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-card); color: var(--text); font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
    }
    .view-toggle:hover { border-color: var(--primary); color: var(--primary); }
    .view-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .btn-new {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 20px; border-radius: 10px; border: none;
      background: #6366f1; color: white; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; height: 40px;
    }
    .btn-new:hover { background: #4f46e5; }
    .btn-new mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .board {
      display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px;
      min-height: calc(100vh - 180px);
    }

    .column {
      min-width: 260px; width: 260px; flex-shrink: 0;
      background: #f1f5f9; border-radius: 12px;
      display: flex; flex-direction: column; max-height: calc(100vh - 180px);
    }

    .column-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-radius: 12px 12px 0 0;
      font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .column-count {
      background: rgba(255,255,255,0.35); padding: 2px 8px; border-radius: 10px;
      font-size: 12px; font-weight: 600;
    }

    .col-aberto { background: #dbeafe; color: #1d4ed8; }
    .col-em_andamento { background: #fef3c7; color: #b45309; }
    .col-code_review { background: #ede9fe; color: #7c3aed; }
    .col-resolvido { background: #d1fae5; color: #059669; }
    .col-fechado { background: #f1f5f9; color: #475569; }

    .column-body {
      flex: 1; padding: 8px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 8px;
      min-height: 60px;
    }

    .card {
      background: white; border-radius: 10px; padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      cursor: pointer; transition: all 0.2s;
    }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); transform: translateY(-2px); }

    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .card-id { color: #94a3b8; font-size: 12px; font-weight: 600; }
    .card-title { font-size: 14px; font-weight: 600; margin: 0 0 10px; color: #1e293b; line-height: 1.4; }
    .card-bottom { display: flex; gap: 6px; flex-wrap: wrap; }

    .badge {
      padding: 3px 8px; border-radius: 6px; font-size: 10px;
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

    .st-code_review { background: #ede9fe; color: #7c3aed; }

    /* CDK Drag styles */
    .cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      border-radius: 10px; background: white; padding: 14px;
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; gap: 16px; }
      .column { min-width: 240px; width: 240px; }
    }
  `]
})
export class TicketBoardComponent implements OnInit {
  columns: BoardColumn[] = [
    { status: 'ABERTO', label: 'Aberto', colorClass: 'col-aberto', tickets: [] },
    { status: 'EM_ANDAMENTO', label: 'Em Andamento', colorClass: 'col-em_andamento', tickets: [] },
    { status: 'CODE_REVIEW', label: 'Code Review', colorClass: 'col-code_review', tickets: [] },
    { status: 'RESOLVIDO', label: 'Resolvido', colorClass: 'col-resolvido', tickets: [] },
    { status: 'FECHADO', label: 'Fechado', colorClass: 'col-fechado', tickets: [] },
  ];

  columnIds: string[] = this.columns.map(c => c.status);

  constructor(
    public router: Router,
    private ticketService: TicketService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.ticketService.findAll(0, 100).subscribe(res => {
      for (const col of this.columns) {
        col.tickets = [];
      }
      for (const ticket of res.content) {
        const col = this.columns.find(c => c.status === ticket.status);
        if (col) {
          col.tickets.push(ticket);
        } else {
          this.columns[0].tickets.push(ticket);
        }
      }
    });
  }

  drop(event: CdkDragDrop<Ticket[]>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const ticket = event.previousContainer.data[event.previousIndex];
    const newStatus = event.container.id;

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.ticketService.updateStatus(ticket.id, newStatus).subscribe({
      next: () => {
        this.snackBar.open(`Chamado #${ticket.id} movido para ${newStatus.replace('_', ' ')}`, 'OK', { duration: 3000 });
      },
      error: () => {
        transferArrayItem(
          event.container.data,
          event.previousContainer.data,
          event.currentIndex,
          event.previousIndex
        );
        this.snackBar.open('Erro ao atualizar status', 'OK', { duration: 3000 });
      }
    });
  }

  goToTicket(id: number): void {
    this.router.navigate(['/tickets', id]);
  }

  goToList(): void {
    this.router.navigate(['/tickets']);
  }
}
