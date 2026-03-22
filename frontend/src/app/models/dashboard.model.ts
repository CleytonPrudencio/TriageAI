export interface DashboardStats {
  totalTickets: number;
  byCategoria: Record<string, number>;
  byPrioridade: Record<string, number>;
  byStatus: Record<string, number>;
}
