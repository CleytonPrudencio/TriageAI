import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RepoConfig, RepoConfigRequest, AutoFixResponse, GitRepo, GitConnection } from '../models/repo-config.model';

@Injectable({ providedIn: 'root' })
export class RepoConfigService {
  private readonly API = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  findAll(): Observable<RepoConfig[]> {
    return this.http.get<RepoConfig[]>(`${this.API}/repo-configs`);
  }

  create(data: RepoConfigRequest): Observable<RepoConfig> {
    return this.http.post<RepoConfig>(`${this.API}/repo-configs`, data);
  }

  update(id: number, data: RepoConfigRequest): Observable<RepoConfig> {
    return this.http.put<RepoConfig>(`${this.API}/repo-configs/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/repo-configs/${id}`);
  }

  autoFix(ticketId: number, repoConfigId: number): Observable<AutoFixResponse> {
    return this.http.post<AutoFixResponse>(
      `${this.API}/git/auto-fix/${ticketId}?repoConfigId=${repoConfigId}`, {}
    );
  }

  listRepos(provider: string, token: string): Observable<GitRepo[]> {
    return this.http.get<GitRepo[]>(
      `${this.API}/git/repos?provider=${provider}&token=${encodeURIComponent(token)}`
    );
  }

  // Git connections
  connect(data: {provider: string, apiToken: string}): Observable<any> {
    return this.http.post(`${this.API}/git/connect`, data);
  }

  getConnections(): Observable<GitConnection[]> {
    return this.http.get<GitConnection[]>(`${this.API}/git/connections`);
  }

  deleteConnection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/git/connections/${id}`);
  }

  listReposByConnection(connectionId: number): Observable<GitRepo[]> {
    return this.http.get<GitRepo[]>(`${this.API}/git/repos/${connectionId}`);
  }
}
