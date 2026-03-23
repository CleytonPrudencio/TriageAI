import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { AiTrainingService } from '../../services/ai-training.service';

@Component({
  selector: 'app-ai-training',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
  ],
  template: `
    <div class="training-container">
      <div class="page-header">
        <div>
          <h1>Treino IA</h1>
          <p class="subtitle">Gerencie dados de treinamento e retreine o modelo de classificacao</p>
        </div>
      </div>

      <mat-tab-group animationDuration="200ms" class="training-tabs">

        <!-- Tab 1: Diretrizes -->
        <mat-tab label="Diretrizes">
          <div class="tab-content">
            <mat-card class="section-card">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon">description</mat-icon>
                <mat-card-title>Diretrizes de Classificacao</mat-card-title>
                <mat-card-subtitle>Defina as regras que a IA deve seguir ao classificar chamados</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Diretrizes</mat-label>
                  <textarea matInput
                    [(ngModel)]="guidelines"
                    rows="15"
                    placeholder="Escreva aqui as diretrizes de classificacao para a IA.&#10;&#10;Exemplo:&#10;- Chamados sobre falhas em producao devem ser classificados como CRITICA&#10;- Solicitacoes de acesso devem ser BAIXA prioridade&#10;- Bugs que afetam multiplos usuarios sao ALTA prioridade&#10;- Duvidas gerais devem ser classificadas como categoria SUPORTE"></textarea>
                </mat-form-field>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-flat-button color="primary" (click)="saveGuidelines()" [disabled]="savingGuidelines">
                  <mat-icon>save</mat-icon>
                  {{ savingGuidelines ? 'Salvando...' : 'Salvar Diretrizes' }}
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Tab 2: Adicionar Dados -->
        <mat-tab label="Adicionar Dados">
          <div class="tab-content">
            <div class="two-columns">
              <mat-card class="section-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar class="section-icon">add_circle</mat-icon>
                  <mat-card-title>Adicionar Amostra</mat-card-title>
                  <mat-card-subtitle>Adicione uma amostra de treinamento por vez</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Texto do chamado</mat-label>
                    <input matInput [(ngModel)]="newSample.text" placeholder="Descreva o chamado de exemplo">
                  </mat-form-field>
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Categoria</mat-label>
                      <mat-select [(ngModel)]="newSample.categoria">
                        <mat-option *ngFor="let c of categorias" [value]="c">{{ c }}</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Prioridade</mat-label>
                      <mat-select [(ngModel)]="newSample.prioridade">
                        <mat-option *ngFor="let p of prioridades" [value]="p">{{ p }}</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </mat-card-content>
                <mat-card-actions align="end">
                  <button mat-flat-button color="primary" (click)="addSingleSample()"
                    [disabled]="!newSample.text || !newSample.categoria || !newSample.prioridade">
                    <mat-icon>add</mat-icon>
                    Adicionar
                  </button>
                </mat-card-actions>
              </mat-card>

              <mat-card class="section-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar class="section-icon">playlist_add</mat-icon>
                  <mat-card-title>Adicionar em Lote</mat-card-title>
                  <mat-card-subtitle>Um chamado por linha, formato: texto|CATEGORIA|PRIORIDADE</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Dados em lote</mat-label>
                    <textarea matInput
                      [(ngModel)]="bulkData"
                      rows="10"
                      placeholder="Sistema fora do ar|BUG|CRITICA&#10;Como alterar minha senha|SUPORTE|BAIXA&#10;Erro ao gerar relatorio|BUG|ALTA"></textarea>
                  </mat-form-field>
                </mat-card-content>
                <mat-card-actions align="end">
                  <button mat-flat-button color="primary" (click)="addBulkSamples()" [disabled]="!bulkData">
                    <mat-icon>upload</mat-icon>
                    Adicionar em Lote
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>

            <mat-card class="section-card" *ngIf="datasetStats">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon">bar_chart</mat-icon>
                <mat-card-title>Estatisticas do Dataset</mat-card-title>
                <mat-card-subtitle>Total de amostras: {{ datasetStats.total || 0 }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="stats-grid">
                  <div class="stat-section" *ngIf="datasetStats.porCategoria">
                    <h4>Por Categoria</h4>
                    <div class="bar-chart">
                      <div *ngFor="let item of datasetStats.porCategoria | keyvalue" class="bar-row">
                        <span class="bar-label">{{ item.key }}</span>
                        <div class="bar-track">
                          <div class="bar-fill" [style.width.%]="getBarPercent(item.value, datasetStats.total)"></div>
                        </div>
                        <span class="bar-value">{{ item.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Tab 3: Gerar com Claude -->
        <mat-tab label="Gerar com Claude">
          <div class="tab-content">
            <mat-card class="section-card">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon">auto_awesome</mat-icon>
                <mat-card-title>Gerar Amostras com IA</mat-card-title>
                <mat-card-subtitle>Use o Claude para gerar amostras de treinamento sinteticas</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Categoria</mat-label>
                    <mat-select [(ngModel)]="generateConfig.categoria">
                      <mat-option *ngFor="let c of categorias" [value]="c">{{ c }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Prioridade</mat-label>
                    <mat-select [(ngModel)]="generateConfig.prioridade">
                      <mat-option *ngFor="let p of prioridades" [value]="p">{{ p }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Quantidade</mat-label>
                    <input matInput type="number" [(ngModel)]="generateConfig.quantidade" min="10" max="100">
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Contexto adicional</mat-label>
                  <textarea matInput
                    [(ngModel)]="generateConfig.contexto"
                    rows="3"
                    placeholder="Descreva o contexto do seu negocio para gerar amostras mais relevantes"></textarea>
                </mat-form-field>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-flat-button color="primary" (click)="generateSamples()"
                  [disabled]="generating || !generateConfig.categoria || !generateConfig.prioridade">
                  <mat-spinner *ngIf="generating" diameter="18" class="btn-spinner"></mat-spinner>
                  <mat-icon *ngIf="!generating">auto_awesome</mat-icon>
                  {{ generating ? 'Gerando...' : 'Gerar com IA' }}
                </button>
              </mat-card-actions>
            </mat-card>

            <mat-card class="section-card" *ngIf="generatedSamples.length > 0">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon">checklist</mat-icon>
                <mat-card-title>Amostras Geradas</mat-card-title>
                <mat-card-subtitle>{{ selectedCount }} de {{ generatedSamples.length }} selecionadas</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="generated-table">
                  <div class="table-header">
                    <mat-checkbox [checked]="allSelected" [indeterminate]="someSelected" (change)="toggleSelectAll($event.checked)"></mat-checkbox>
                    <span class="col-text">Texto</span>
                    <span class="col-cat">Categoria</span>
                    <span class="col-pri">Prioridade</span>
                  </div>
                  <div class="table-row" *ngFor="let sample of generatedSamples; let i = index">
                    <mat-checkbox [(ngModel)]="sample.selected"></mat-checkbox>
                    <span class="col-text">{{ sample.text }}</span>
                    <span class="col-cat"><span class="badge cat">{{ sample.categoria }}</span></span>
                    <span class="col-pri"><span class="badge pri" [attr.data-pri]="sample.prioridade">{{ sample.prioridade }}</span></span>
                  </div>
                </div>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-flat-button color="primary" (click)="saveSelectedSamples()" [disabled]="selectedCount === 0 || savingGenerated">
                  <mat-icon>save</mat-icon>
                  Salvar Selecionados ({{ selectedCount }})
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Tab 4: Treinar -->
        <mat-tab label="Treinar">
          <div class="tab-content">
            <mat-card class="section-card">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon">info</mat-icon>
                <mat-card-title>Modelo Atual</mat-card-title>
                <mat-card-subtitle>Informacoes do modelo de classificacao em uso</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="model-info-grid" *ngIf="modelInfo">
                  <div class="info-item">
                    <span class="info-label">Versao</span>
                    <span class="info-value">{{ modelInfo.version || 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Acuracia</span>
                    <span class="info-value highlight">{{ modelInfo.accuracy ? (modelInfo.accuracy * 100).toFixed(1) + '%' : 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">F1-Score</span>
                    <span class="info-value highlight">{{ modelInfo.f1 ? (modelInfo.f1 * 100).toFixed(1) + '%' : 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Dataset</span>
                    <span class="info-value">{{ modelInfo.datasetSize || 0 }} amostras</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Ultimo Treino</span>
                    <span class="info-value">{{ modelInfo.lastTrained || 'Nunca' }}</span>
                  </div>
                </div>
                <div *ngIf="!modelInfo" class="empty-state">
                  <mat-icon>info_outline</mat-icon>
                  <p>Nenhuma informacao de modelo disponivel</p>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card" *ngIf="datasetStats">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon">donut_large</mat-icon>
                <mat-card-title>Distribuicao do Dataset</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stats-grid two-col">
                  <div class="stat-section" *ngIf="datasetStats.porCategoria">
                    <h4>Por Categoria</h4>
                    <div class="bar-chart">
                      <div *ngFor="let item of datasetStats.porCategoria | keyvalue" class="bar-row">
                        <span class="bar-label">{{ item.key }}</span>
                        <div class="bar-track">
                          <div class="bar-fill cat-fill" [style.width.%]="getBarPercent(item.value, datasetStats.total)"></div>
                        </div>
                        <span class="bar-value">{{ item.value }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-section" *ngIf="datasetStats.porPrioridade">
                    <h4>Por Prioridade</h4>
                    <div class="bar-chart">
                      <div *ngFor="let item of datasetStats.porPrioridade | keyvalue" class="bar-row">
                        <span class="bar-label">{{ item.key }}</span>
                        <div class="bar-track">
                          <div class="bar-fill pri-fill" [style.width.%]="getBarPercent(item.value, datasetStats.total)"></div>
                        </div>
                        <span class="bar-value">{{ item.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card train-action-card">
              <mat-card-content>
                <div class="train-action">
                  <div>
                    <h3>Re-treinar Modelo</h3>
                    <p>Inicie um novo ciclo de treinamento com os dados atuais do dataset</p>
                  </div>
                  <button mat-flat-button color="primary" class="train-btn" (click)="retrain()" [disabled]="training">
                    <mat-spinner *ngIf="training" diameter="22" class="btn-spinner"></mat-spinner>
                    <mat-icon *ngIf="!training">model_training</mat-icon>
                    {{ training ? 'Treinando...' : 'Re-treinar Modelo' }}
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card" *ngIf="trainingResult">
              <mat-card-header>
                <mat-icon mat-card-avatar class="section-icon success-icon">check_circle</mat-icon>
                <mat-card-title>Resultado do Treinamento</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="metrics-comparison">
                  <div class="metric-col">
                    <h4>Anterior</h4>
                    <div class="metric-item">
                      <span>Acuracia</span>
                      <span class="metric-val">{{ trainingResult.old?.accuracy ? (trainingResult.old.accuracy * 100).toFixed(1) + '%' : 'N/A' }}</span>
                    </div>
                    <div class="metric-item">
                      <span>F1-Score</span>
                      <span class="metric-val">{{ trainingResult.old?.f1 ? (trainingResult.old.f1 * 100).toFixed(1) + '%' : 'N/A' }}</span>
                    </div>
                  </div>
                  <div class="metric-arrow">
                    <mat-icon>arrow_forward</mat-icon>
                  </div>
                  <div class="metric-col new-metrics">
                    <h4>Novo</h4>
                    <div class="metric-item">
                      <span>Acuracia</span>
                      <span class="metric-val highlight">{{ trainingResult.new?.accuracy ? (trainingResult.new.accuracy * 100).toFixed(1) + '%' : 'N/A' }}</span>
                    </div>
                    <div class="metric-item">
                      <span>F1-Score</span>
                      <span class="metric-val highlight">{{ trainingResult.new?.f1 ? (trainingResult.new.f1 * 100).toFixed(1) + '%' : 'N/A' }}</span>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .training-container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 28px;
    }

    .page-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text, #1e293b);
      margin: 0 0 4px 0;
    }

    .subtitle {
      color: var(--text-secondary, #64748b);
      font-size: 14px;
      margin: 0;
    }

    .training-tabs ::ng-deep .mat-mdc-tab-labels {
      background: var(--bg-card, #fff);
      border-radius: var(--radius, 12px) var(--radius, 12px) 0 0;
      border: 1px solid var(--border, #e2e8f0);
      border-bottom: none;
    }

    .tab-content {
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-card {
      border-radius: var(--radius, 12px);
      border: 1px solid var(--border, #e2e8f0);
      box-shadow: none;
    }

    .section-card mat-card-header {
      padding: 20px 24px 0;
    }

    .section-card mat-card-content {
      padding: 16px 24px;
    }

    .section-card mat-card-actions {
      padding: 0 24px 16px;
    }

    .section-icon {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white !important;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px !important;
      height: 40px !important;
      font-size: 20px;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .form-row mat-form-field {
      flex: 1;
      min-width: 180px;
    }

    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 900px) {
      .two-columns {
        grid-template-columns: 1fr;
      }
    }

    /* Stats / Bar chart */
    .stats-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .stats-grid.two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    @media (max-width: 768px) {
      .stats-grid.two-col {
        grid-template-columns: 1fr;
      }
    }

    .stat-section h4 {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bar-label {
      width: 100px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text, #1e293b);
      text-align: right;
      flex-shrink: 0;
    }

    .bar-track {
      flex: 1;
      height: 24px;
      background: var(--border, #e2e8f0);
      border-radius: 6px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #818cf8);
      border-radius: 6px;
      transition: width 0.5s ease;
      min-width: 2px;
    }

    .bar-fill.pri-fill {
      background: linear-gradient(90deg, #06b6d4, #22d3ee);
    }

    .bar-value {
      width: 40px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #1e293b);
      flex-shrink: 0;
    }

    /* Generated samples table */
    .generated-table {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 12px);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
    }

    .table-header {
      background: #f8fafc;
      font-weight: 600;
      font-size: 13px;
      color: var(--text-secondary, #64748b);
      border-bottom: 1px solid var(--border, #e2e8f0);
    }

    .table-row {
      border-bottom: 1px solid var(--border, #e2e8f0);
      font-size: 13px;
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .table-row:hover {
      background: #f8fafc;
    }

    .col-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-cat, .col-pri {
      width: 110px;
      flex-shrink: 0;
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.cat {
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
    }

    .badge.pri {
      background: rgba(6, 182, 212, 0.12);
      color: #0891b2;
    }

    .badge.pri[data-pri="CRITICA"] {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    .badge.pri[data-pri="ALTA"] {
      background: rgba(249, 115, 22, 0.12);
      color: #ea580c;
    }

    .badge.pri[data-pri="MEDIA"] {
      background: rgba(234, 179, 8, 0.12);
      color: #ca8a04;
    }

    /* Model info */
    .model-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      color: var(--text-secondary, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .info-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #1e293b);
    }

    .info-value.highlight {
      color: #6366f1;
    }

    /* Train action */
    .train-action-card {
      border: 2px solid #6366f1;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(129, 140, 248, 0.04));
    }

    .train-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }

    .train-action h3 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #1e293b);
    }

    .train-action p {
      margin: 0;
      color: var(--text-secondary, #64748b);
      font-size: 14px;
    }

    .train-btn {
      min-width: 200px;
      height: 48px;
      font-size: 15px;
      font-weight: 600;
    }

    /* Metrics comparison */
    .metrics-comparison {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
      padding: 16px 0;
    }

    .metric-col {
      flex: 1;
      max-width: 220px;
    }

    .metric-col h4 {
      margin: 0 0 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
      text-align: center;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--border, #e2e8f0);
      font-size: 14px;
    }

    .metric-val {
      font-weight: 700;
      color: var(--text, #1e293b);
    }

    .metric-val.highlight {
      color: #16a34a;
    }

    .metric-arrow {
      color: var(--text-secondary, #64748b);
    }

    .metric-arrow mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .new-metrics {
      background: rgba(22, 163, 74, 0.04);
      border-radius: var(--radius, 12px);
      padding: 16px;
      border: 1px solid rgba(22, 163, 74, 0.15);
    }

    .new-metrics h4 {
      color: #16a34a;
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: var(--text-secondary, #64748b);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    /* Button spinner */
    .btn-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    ::ng-deep .btn-spinner .mdc-circular-progress__indeterminate-circle-graphic {
      stroke: white !important;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .metrics-comparison {
        flex-direction: column;
      }
      .metric-col {
        max-width: 100%;
        width: 100%;
      }
      .metric-arrow mat-icon {
        transform: rotate(90deg);
      }
    }
  `]
})
export class AiTrainingComponent implements OnInit {
  categorias = ['BUG', 'FEATURE', 'SUPORTE', 'INFRAESTRUTURA', 'SEGURANCA', 'MELHORIA'];
  prioridades = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];

  // Tab 1: Guidelines
  guidelines = '';
  savingGuidelines = false;

  // Tab 2: Add data
  newSample = { text: '', categoria: '', prioridade: '' };
  bulkData = '';
  datasetStats: any = null;

  // Tab 3: Generate
  generateConfig = { categoria: '', prioridade: '', quantidade: 20, contexto: '' };
  generatedSamples: any[] = [];
  generating = false;
  savingGenerated = false;

  // Tab 4: Train
  modelInfo: any = null;
  training = false;
  trainingResult: any = null;

  constructor(
    private trainingService: AiTrainingService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadGuidelines();
    this.loadDatasetStats();
  }

  // --- Helpers ---

  private showMessage(msg: string, isError = false): void {
    this.snackBar.open(msg, 'OK', {
      duration: 3000,
      panelClass: isError ? 'snack-error' : 'snack-success',
    });
  }

  getBarPercent(value: any, total: any): number {
    const v = Number(value) || 0;
    const t = Number(total) || 0;
    if (!t) return 0;
    return Math.round((v / t) * 100);
  }

  get selectedCount(): number {
    return this.generatedSamples.filter(s => s.selected).length;
  }

  get allSelected(): boolean {
    return this.generatedSamples.length > 0 && this.generatedSamples.every(s => s.selected);
  }

  get someSelected(): boolean {
    return this.selectedCount > 0 && !this.allSelected;
  }

  toggleSelectAll(checked: boolean): void {
    this.generatedSamples.forEach(s => s.selected = checked);
  }

  // --- Tab 1: Guidelines ---

  loadGuidelines(): void {
    this.trainingService.getGuidelines().subscribe({
      next: (res) => this.guidelines = res.guidelines || '',
      error: () => {}
    });
  }

  saveGuidelines(): void {
    this.savingGuidelines = true;
    this.trainingService.saveGuidelines(this.guidelines).subscribe({
      next: () => {
        this.savingGuidelines = false;
        this.showMessage('Diretrizes salvas com sucesso!');
      },
      error: () => {
        this.savingGuidelines = false;
        this.showMessage('Erro ao salvar diretrizes', true);
      }
    });
  }

  // --- Tab 2: Add Data ---

  loadDatasetStats(): void {
    this.trainingService.getDatasetStats().subscribe({
      next: (res) => {
        // Map Python field names to frontend expectations
        this.datasetStats = {
          total: res.total,
          porCategoria: res.byCategoria || res.porCategoria || {},
          porPrioridade: res.byPrioridade || res.porPrioridade || {},
          recentSamples: res.recentSamples || [],
        };
      },
      error: () => {}
    });

    // Load model info from dashboard stats (which fetches from AI /metrics)
    this.http.get<any>('http://localhost:8080/api/dashboard/stats').subscribe({
      next: (stats) => {
        if (stats.iaModelVersion) {
          this.modelInfo = {
            version: stats.iaModelVersion,
            accuracy: stats.iaAccuracy,
            f1: stats.iaF1Score,
            datasetSize: stats.iaDatasetSize,
            lastTrained: stats.iaTrainedAt,
          };
        }
      },
      error: () => {}
    });
  }

  addSingleSample(): void {
    const sample = { ...this.newSample };
    this.trainingService.addSamples([sample]).subscribe({
      next: () => {
        this.showMessage('Amostra adicionada com sucesso!');
        this.newSample = { text: '', categoria: '', prioridade: '' };
        this.loadDatasetStats();
      },
      error: () => this.showMessage('Erro ao adicionar amostra', true)
    });
  }

  addBulkSamples(): void {
    const lines = this.bulkData.split('\n').filter(l => l.trim());
    const samples = lines.map(line => {
      const parts = line.split('|');
      return {
        text: parts[0]?.trim() || '',
        categoria: parts[1]?.trim() || '',
        prioridade: parts[2]?.trim() || ''
      };
    }).filter(s => s.text && s.categoria && s.prioridade);

    if (samples.length === 0) {
      this.showMessage('Nenhuma amostra valida encontrada. Use o formato: texto|CATEGORIA|PRIORIDADE', true);
      return;
    }

    this.trainingService.addSamples(samples).subscribe({
      next: () => {
        this.showMessage(`${samples.length} amostras adicionadas com sucesso!`);
        this.bulkData = '';
        this.loadDatasetStats();
      },
      error: () => this.showMessage('Erro ao adicionar amostras em lote', true)
    });
  }

  // --- Tab 3: Generate ---

  generateSamples(): void {
    this.generating = true;
    this.trainingService.generateSamples({
      categoria: this.generateConfig.categoria,
      prioridade: this.generateConfig.prioridade,
      quantidade: this.generateConfig.quantidade,
      contexto: this.generateConfig.contexto || undefined,
    }).subscribe({
      next: (res) => {
        this.generating = false;
        this.generatedSamples = (res.samples || []).map((s: any) => ({ ...s, selected: true }));
        this.showMessage(`${this.generatedSamples.length} amostras geradas!`);
      },
      error: () => {
        this.generating = false;
        this.showMessage('Erro ao gerar amostras', true);
      }
    });
  }

  saveSelectedSamples(): void {
    const selected = this.generatedSamples.filter(s => s.selected).map(({ selected, ...rest }) => rest);
    this.savingGenerated = true;
    this.trainingService.saveGenerated(selected).subscribe({
      next: () => {
        this.savingGenerated = false;
        this.showMessage(`${selected.length} amostras salvas com sucesso!`);
        this.generatedSamples = [];
        this.loadDatasetStats();
      },
      error: () => {
        this.savingGenerated = false;
        this.showMessage('Erro ao salvar amostras', true);
      }
    });
  }

  // --- Tab 4: Train ---

  retrain(): void {
    this.training = true;
    this.trainingResult = null;
    this.trainingService.retrain().subscribe({
      next: (res) => {
        this.training = false;
        this.trainingResult = res;
        // Extract metrics from retrain response
        if (res.metrics) {
          const m = res.metrics;
          this.modelInfo = {
            version: (this.modelInfo?.version || 0) + 1,
            accuracy: m.categoria?.accuracy || 0,
            f1: m.categoria?.f1_weighted || 0,
            datasetSize: m.dataset_size || 0,
            lastTrained: m.trained_at || new Date().toISOString(),
          };
        }
        this.showMessage('Modelo re-treinado com sucesso!');
        this.loadDatasetStats();
      },
      error: () => {
        this.training = false;
        this.showMessage('Erro ao re-treinar o modelo', true);
      }
    });
  }
}
