import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket, TicketRequest, FeedbackRequest, PageResponse } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly API = 'http://localhost:8080/api/tickets';

  constructor(private http: HttpClient) {}

  findAll(page = 0, size = 20, filters?: { status?: string; prioridade?: string; categoria?: string }): Observable<PageResponse<Ticket>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.prioridade) params = params.set('prioridade', filters.prioridade);
    if (filters?.categoria) params = params.set('categoria', filters.categoria);
    return this.http.get<PageResponse<Ticket>>(this.API, { params });
  }

  findById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.API}/${id}`);
  }

  create(data: TicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(this.API, data);
  }

  update(id: number, data: TicketRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.API}/${id}`, data);
  }

  updateStatus(id: number, status: string): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.API}/${id}/status`, null, {
      params: new HttpParams().set('status', status)
    });
  }

  feedback(id: number, data: FeedbackRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.API}/${id}/feedback`, data);
  }

  reclassify(id: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.API}/${id}/reclassify`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  enrichTicket(data: any): Observable<any> {
    return this.http.post<any>(`${this.API}/enrich`, data);
  }

  refineTicket(data: any): Observable<any> {
    return this.http.post<any>(`${this.API}/refine`, data);
  }
}
