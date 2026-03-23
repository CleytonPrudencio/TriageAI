import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sistema {
  id: number;
  nome: string;
  descricao: string;
  repoConfigId: number | null;
  repoName: string;
  repoOwner: string;
  repoFullName: string;
  provider: string;
  autoFixEnabled: boolean;
  branchMapping: {
    hotfix: string;
    bugfix: string;
    fix: string;
    feat: string;
    refactor: string;
    docs: string;
    chore: string;
  };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SistemaService {
  private url = 'http://localhost:8080/api/sistemas';

  constructor(private http: HttpClient) {}

  findAll(): Observable<Sistema[]> { return this.http.get<Sistema[]>(this.url); }
  findById(id: number): Observable<Sistema> { return this.http.get<Sistema>(`${this.url}/${id}`); }
  create(data: any): Observable<Sistema> { return this.http.post<Sistema>(this.url, data); }
  update(id: number, data: any): Observable<Sistema> { return this.http.put<Sistema>(`${this.url}/${id}`, data); }
  delete(id: number): Observable<any> { return this.http.delete(`${this.url}/${id}`); }
}
