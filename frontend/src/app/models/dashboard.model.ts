export interface DashboardStats {
  totalTickets: number;
  ticketsHoje: number;
  ticketsSemana: number;
  ticketsMes: number;
  byCategoria: Record<string, number>;
  byPrioridade: Record<string, number>;
  byStatus: Record<string, number>;
  mediaAiScore: number;
  iaModelVersion: number;
  iaAccuracy: number;
  iaF1Score: number;
  iaDatasetSize: number;
  iaTrainedAt: string;
  totalPRs: number;
  prsMerged: number;
  prsOpen: number;
  prsClosed: number;
  ticketsRecentes: any[];
}
