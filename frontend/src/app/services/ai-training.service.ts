import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AiTrainingService {
  private readonly API = 'http://localhost:8080/api/ai/training';

  constructor(private http: HttpClient) {}

  addSamples(samples: any[]): Observable<any> {
    return this.http.post(`${this.API}/add`, { samples });
  }

  getDatasetStats(): Observable<any> {
    return this.http.get(`${this.API}/dataset`);
  }

  generateSamples(data: { categoria: string; prioridade: string; quantidade: number; diretrizes?: string; contexto?: string }): Observable<any> {
    return this.http.post(`${this.API}/generate`, data);
  }

  saveGenerated(samples: any[]): Observable<any> {
    return this.http.post(`${this.API}/save-generated`, { samples });
  }

  getGuidelines(): Observable<any> {
    return this.http.get(`${this.API}/guidelines`);
  }

  saveGuidelines(guidelines: string): Observable<any> {
    return this.http.put(`${this.API}/guidelines`, { guidelines });
  }

  retrain(): Observable<any> {
    return this.http.post(`${this.API}/retrain`, {});
  }
}
