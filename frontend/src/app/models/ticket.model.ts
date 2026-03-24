export interface Ticket {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  aiScore: number;
  userName: string;
  assignedToName: string;
  prBranch: string;
  prUrl: string;
  prStatus: string;
  prSummary: string;
  sistemaId: number | null;
  sistemaName: string;
  sistemaAutoFix: boolean;
  repoConfigId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketRequest {
  titulo: string;
  descricao: string;
  sistemaId?: number;
}

export interface FeedbackRequest {
  categoria?: string;
  prioridade?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
