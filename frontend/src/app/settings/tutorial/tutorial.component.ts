import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

interface TutorialStep {
  number: number;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
  expanded: boolean;
  content: StepContent[];
}

interface StepContent {
  type: 'text' | 'list' | 'code' | 'tip' | 'warning' | 'substeps';
  value?: string;
  items?: string[];
  label?: string;
  substeps?: { title: string; items: string[] }[];
}

@Component({
  selector: 'app-tutorial',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatExpansionModule, MatTooltipModule, RouterLink],
  template: `
    <div class="tutorial-container">
      <div class="tutorial-header">
        <div class="header-content">
          <mat-icon class="header-icon">school</mat-icon>
          <div>
            <h1>Bem-vindo ao TriageAI</h1>
            <p>Siga este guia passo a passo para configurar e comecar a usar o sistema de triagem inteligente.</p>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="getProgress()"></div>
        </div>
        <span class="progress-text">{{ getCompletedCount() }} de {{ steps.length }} etapas concluidas</span>
      </div>

      <div class="timeline">
        <div class="timeline-step" *ngFor="let step of steps; let i = index; let last = last">
          <div class="timeline-marker-col">
            <div class="timeline-circle"
                 [class.completed]="step.completed"
                 [class.active]="activeStep === i"
                 (click)="toggleStep(i)">
              <mat-icon *ngIf="step.completed">check</mat-icon>
              <span *ngIf="!step.completed">{{ step.number }}</span>
            </div>
            <div class="timeline-line" *ngIf="!last"></div>
          </div>

          <div class="timeline-card" [class.active]="activeStep === i" [class.completed]="step.completed">
            <div class="card-header" (click)="toggleStep(i)">
              <div class="card-title-row">
                <mat-icon class="step-icon">{{ step.icon }}</mat-icon>
                <div class="card-title-text">
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.description }}</p>
                </div>
              </div>
              <div class="card-actions">
                <button mat-icon-button (click)="toggleCompleted(i, $event)" [matTooltip]="step.completed ? 'Marcar como pendente' : 'Marcar como concluido'">
                  <mat-icon>{{ step.completed ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                </button>
                <mat-icon class="expand-icon" [class.rotated]="step.expanded">expand_more</mat-icon>
              </div>
            </div>

            <div class="card-body" *ngIf="step.expanded" [@expandCollapse]>
              <ng-container *ngFor="let content of step.content">
                <p *ngIf="content.type === 'text'" class="content-text">{{ content.value }}</p>

                <ul *ngIf="content.type === 'list'" class="content-list">
                  <li *ngFor="let item of content.items">{{ item }}</li>
                </ul>

                <div *ngIf="content.type === 'code'" class="code-block">
                  <div class="code-label" *ngIf="content.label">{{ content.label }}</div>
                  <pre><code>{{ content.value }}</code></pre>
                </div>

                <div *ngIf="content.type === 'tip'" class="tip-box">
                  <mat-icon>lightbulb</mat-icon>
                  <span>{{ content.value }}</span>
                </div>

                <div *ngIf="content.type === 'warning'" class="warning-box">
                  <mat-icon>warning</mat-icon>
                  <span>{{ content.value }}</span>
                </div>

                <div *ngIf="content.type === 'substeps'" class="substeps">
                  <div class="substep" *ngFor="let sub of content.substeps">
                    <h4>{{ sub.title }}</h4>
                    <ul>
                      <li *ngFor="let item of sub.items">{{ item }}</li>
                    </ul>
                  </div>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <div class="tutorial-footer">
        <div class="footer-card">
          <mat-icon>help_outline</mat-icon>
          <div>
            <h4>Precisa de ajuda?</h4>
            <p>Se tiver duvidas, entre em contato com o suporte ou consulte a documentacao da API.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tutorial-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 16px 48px;
    }

    /* Header */
    .tutorial-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 40px;
      color: white;
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 24px;
    }

    .header-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.9;
    }

    .tutorial-header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 700;
    }

    .tutorial-header > .header-content > div > p {
      margin: 0;
      font-size: 15px;
      opacity: 0.85;
      line-height: 1.5;
    }

    .progress-bar {
      height: 8px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: #34d399;
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .progress-text {
      font-size: 13px;
      opacity: 0.75;
    }

    /* Timeline */
    .timeline {
      position: relative;
    }

    .timeline-step {
      display: flex;
      gap: 24px;
      position: relative;
    }

    .timeline-marker-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      width: 48px;
    }

    .timeline-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: white;
      border: 3px solid #c7d2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      color: #6366f1;
      cursor: pointer;
      transition: all 0.3s ease;
      flex-shrink: 0;
      z-index: 2;
    }

    .timeline-circle.active {
      border-color: #6366f1;
      background: #6366f1;
      color: white;
      box-shadow: 0 0 0 6px rgba(99,102,241,0.15);
    }

    .timeline-circle.completed {
      border-color: #10b981;
      background: #10b981;
      color: white;
    }

    .timeline-circle.completed mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .timeline-line {
      width: 3px;
      flex: 1;
      background: #e0e7ff;
      min-height: 20px;
    }

    /* Card */
    .timeline-card {
      flex: 1;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      margin-bottom: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .timeline-card.active {
      border-color: #6366f1;
      box-shadow: 0 4px 16px rgba(99,102,241,0.12);
    }

    .timeline-card.completed {
      border-color: #a7f3d0;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      cursor: pointer;
      user-select: none;
    }

    .card-header:hover {
      background: #f9fafb;
    }

    .card-title-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .step-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #6366f1;
      flex-shrink: 0;
    }

    .card-title-text h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }

    .card-title-text p {
      margin: 0;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.4;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .card-actions button mat-icon {
      color: #d1d5db;
      transition: color 0.2s;
    }

    .timeline-card.completed .card-actions button mat-icon {
      color: #10b981;
    }

    .expand-icon {
      color: #9ca3af;
      transition: transform 0.3s ease;
    }

    .expand-icon.rotated {
      transform: rotate(180deg);
    }

    /* Card Body */
    .card-body {
      padding: 0 24px 24px;
      border-top: 1px solid #f3f4f6;
    }

    .content-text {
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      margin: 16px 0 0;
    }

    .content-list {
      margin: 12px 0 0;
      padding-left: 20px;
    }

    .content-list li {
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      margin-bottom: 6px;
    }

    /* Code Block */
    .code-block {
      margin: 16px 0 0;
      border-radius: 8px;
      overflow: hidden;
      background: #1e293b;
    }

    .code-label {
      padding: 8px 16px;
      background: #334155;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .code-block pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
    }

    .code-block code {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.6;
    }

    /* Tip & Warning Boxes */
    .tip-box, .warning-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 8px;
      margin: 16px 0 0;
      font-size: 13px;
      line-height: 1.6;
    }

    .tip-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    .tip-box mat-icon {
      color: #3b82f6;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .warning-box {
      background: #fefce8;
      border: 1px solid #fde68a;
      color: #92400e;
    }

    .warning-box mat-icon {
      color: #f59e0b;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Substeps */
    .substeps {
      margin: 16px 0 0;
    }

    .substep {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 10px;
    }

    .substep h4 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: #4338ca;
    }

    .substep ul {
      margin: 0;
      padding-left: 18px;
    }

    .substep li {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 4px;
    }

    /* Footer */
    .tutorial-footer {
      margin-top: 32px;
    }

    .footer-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 24px;
    }

    .footer-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #0284c7;
      flex-shrink: 0;
    }

    .footer-card h4 {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 600;
      color: #0c4a6e;
    }

    .footer-card p {
      margin: 0;
      font-size: 13px;
      color: #0369a1;
      line-height: 1.5;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .tutorial-container { padding: 0 8px 32px; }
      .tutorial-header { padding: 24px 20px; }
      .tutorial-header h1 { font-size: 22px; }
      .header-icon { font-size: 36px; width: 36px; height: 36px; }
      .timeline-step { gap: 12px; }
      .timeline-marker-col { width: 36px; }
      .timeline-circle { width: 34px; height: 34px; font-size: 14px; }
      .card-header { padding: 16px; }
      .card-body { padding: 0 16px 16px; }
      .card-title-text h3 { font-size: 14px; }
      .card-title-text p { font-size: 12px; }
    }
  `]
})
export class TutorialComponent {
  activeStep = 0;

  steps: TutorialStep[] = [
    {
      number: 1,
      icon: 'person_add',
      title: 'Criar conta',
      description: 'Cadastre sua empresa ou conta pessoal no TriageAI',
      completed: false,
      expanded: true,
      content: [
        { type: 'text', value: 'O primeiro passo e criar sua conta no TriageAI. Voce pode cadastrar como empresa (CNPJ) ou pessoa fisica (CPF).' },
        { type: 'list', items: [
          'Acesse a pagina de registro clicando em "Criar conta"',
          'Preencha CNPJ ou CPF, nome completo e email',
          'Defina uma senha segura',
          'Escolha seu plano: Free (ate 50 chamados/mes) ou Premium (ilimitado)'
        ]},
        { type: 'tip', value: 'O plano Free e otimo para testar. Voce pode fazer upgrade a qualquer momento sem perder dados.' }
      ]
    },
    {
      number: 2,
      icon: 'vpn_key',
      title: 'Configurar token do Git',
      description: 'Conecte seu provedor Git (GitHub, GitLab ou Bitbucket)',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'Para que o TriageAI possa criar branches, commits e pull requests automaticamente, voce precisa configurar um token de acesso do seu provedor Git.' },
        { type: 'list', items: [
          'Va em Repositorios no menu lateral',
          'Selecione o provedor: GitHub, GitLab ou Bitbucket',
          'Gere um token seguindo as instrucoes abaixo',
          'Cole o token no campo e clique "Conectar"',
          'Seus repositorios aparecerao automaticamente na lista'
        ]},
        { type: 'substeps', substeps: [
          {
            title: 'GitHub - Gerar Token',
            items: [
              'Acesse github.com → Settings (menu do perfil)',
              'Va em Developer settings → Personal access tokens → Fine-grained tokens',
              'Clique "Generate new token"',
              'Selecione os repositorios desejados',
              'Permissions: Contents (Read/Write) + Pull requests (Read/Write)',
              'Clique "Generate token" e copie o valor'
            ]
          },
          {
            title: 'GitLab - Gerar Token',
            items: [
              'Acesse gitlab.com → Preferences (menu do perfil)',
              'Va em Access Tokens → Add new token',
              'Defina um nome e data de expiracao',
              'Scopes: api, read_repository, write_repository',
              'Clique "Create personal access token" e copie o valor'
            ]
          },
          {
            title: 'Bitbucket - Gerar App Password',
            items: [
              'Acesse bitbucket.org → Personal settings',
              'Va em App passwords → Create app password',
              'Defina um label para identificacao',
              'Permissions: Repositories (Read/Write), Pull requests (Read/Write)',
              'Clique "Create" e copie a senha gerada'
            ]
          }
        ]},
        { type: 'warning', value: 'Guarde o token em local seguro. Ele so e exibido uma vez no provedor. Se perder, sera necessario gerar um novo.' }
      ]
    },
    {
      number: 3,
      icon: 'folder_special',
      title: 'Configurar repositorios',
      description: 'Selecione e configure os repos que deseja utilizar',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'Apos conectar o token, seus repositorios serao listados automaticamente. Agora selecione quais deseja usar com o TriageAI.' },
        { type: 'list', items: [
          'Na lista de repositorios, clique no botao "Adicionar" no repo desejado',
          'Defina um nome amigavel para o repositorio (ex: "Backend API")',
          'Selecione o reviewer padrao para pull requests',
          'Clique "Salvar" para confirmar',
          'Repita para cada repositorio que quiser integrar'
        ]},
        { type: 'tip', value: 'Voce pode adicionar e remover repositorios a qualquer momento. A configuracao e independente por repo.' }
      ]
    },
    {
      number: 4,
      icon: 'dns',
      title: 'Criar sistemas/ambientes',
      description: 'Organize seus projetos em sistemas com configuracao de branches e auto-fix',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'Sistemas representam seus projetos ou ambientes. Cada sistema esta vinculado a um repositorio e define como branches, reviewers e auto-fix se comportam.' },
        { type: 'list', items: [
          'Va em Sistemas no menu lateral',
          'Clique "Novo Sistema"',
          'Defina o nome (ex: "ERP Principal", "App Mobile")',
          'Vincule ao repositorio configurado na etapa anterior',
          'Configure as branches por tipo de chamado:',
        ]},
        { type: 'substeps', substeps: [
          {
            title: 'Configuracao de Branches',
            items: [
              'Hotfix → branch base: main (correcoes urgentes)',
              'Feature → branch base: develop (novas funcionalidades)',
              'Bug → branch base: develop (correcoes de bugs)',
              'Voce pode personalizar as branches conforme seu fluxo Git'
            ]
          },
          {
            title: 'Auto-Fix (opcional)',
            items: [
              'Ative o auto-fix para que a IA gere correcoes automaticamente',
              'Quando ativo, ao criar um chamado a IA tenta gerar o codigo de correcao',
              'Um PR e criado automaticamente no repositorio',
              'O reviewer configurado recebe a notificacao para revisar'
            ]
          },
          {
            title: 'Reviewers por Tipo',
            items: [
              'Defina reviewers diferentes por tipo de branch',
              'Ex: hotfix pode ter reviewer senior, feature pode ter reviewer do time',
              'O reviewer e atribuido automaticamente ao PR'
            ]
          }
        ]},
        { type: 'warning', value: 'O auto-fix requer a API key do Claude configurada (etapa 5). Sem ela, o auto-fix nao funcionara.' }
      ]
    },
    {
      number: 5,
      icon: 'smart_toy',
      title: 'Configurar Claude AI (opcional)',
      description: 'Habilite recursos avancados de IA com a API do Claude',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'O TriageAI usa o Claude da Anthropic para recursos avancados como analise inteligente de codigo, geracao de dados de treino e deteccao automatica do tipo de branch.' },
        { type: 'list', items: [
          'Va em Configuracoes no menu lateral',
          'Na secao "Claude API", cole sua API key',
          'Clique "Salvar" para ativar'
        ]},
        { type: 'substeps', substeps: [
          {
            title: 'Como obter a API key',
            items: [
              'Acesse console.anthropic.com',
              'Faca login ou crie uma conta',
              'Va em API Keys no menu lateral',
              'Clique "Create Key"',
              'Copie a chave gerada (comeca com sk-ant-...)'
            ]
          },
          {
            title: 'Recursos habilitados',
            items: [
              'Analise inteligente de codigo nos PRs',
              'Geracao automatica de dados de treino',
              'Deteccao de tipo de branch pelo conteudo do chamado',
              'Auto-fix com geracao de codigo corretivo',
              'Sugestoes de classificacao mais precisas'
            ]
          }
        ]},
        { type: 'tip', value: 'A API do Claude tem um plano gratuito com limite de requisicoes. Para uso em producao, considere o plano pago.' }
      ]
    },
    {
      number: 6,
      icon: 'model_training',
      title: 'Treinar a IA',
      description: 'Ensine o modelo a classificar chamados do seu jeito',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'O TriageAI usa um modelo de IA treinavel que aprende a classificar chamados conforme suas categorias. Quanto mais dados de treino, melhor a classificacao.' },
        { type: 'list', items: [
          'Va em Treino IA no menu lateral'
        ]},
        { type: 'substeps', substeps: [
          {
            title: 'Tab "Diretrizes"',
            items: [
              'Defina as regras de como a IA deve classificar',
              'Ex: "Chamados sobre lentidao devem ser classificados como Performance"',
              'Ex: "Erros 500 sao Bug, erros de layout sao UI/UX"',
              'As diretrizes guiam a geracao automatica de dados'
            ]
          },
          {
            title: 'Tab "Adicionar Dados"',
            items: [
              'Adicione amostras manualmente: titulo + descricao + categoria',
              'Quanto mais variadas as amostras, melhor o modelo',
              'Recomendacao: minimo 10 amostras por categoria'
            ]
          },
          {
            title: 'Tab "Gerar com Claude"',
            items: [
              'Gere amostras automaticamente usando o Claude',
              'O Claude cria exemplos realistas baseados nas suas diretrizes',
              'Revise e ajuste as amostras geradas antes de treinar'
            ]
          },
          {
            title: 'Tab "Treinar"',
            items: [
              'Clique "Re-treinar Modelo" para iniciar o treinamento',
              'O processo leva alguns segundos',
              'Apos treinar, novos chamados serao classificados automaticamente'
            ]
          }
        ]},
        { type: 'tip', value: 'Voce pode retreinar o modelo a qualquer momento. Adicione mais dados e retreine para melhorar a precisao continuamente.' }
      ]
    },
    {
      number: 7,
      icon: 'add_task',
      title: 'Criar seu primeiro chamado',
      description: 'Teste o sistema criando um chamado e veja a IA em acao',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'Agora que tudo esta configurado, crie seu primeiro chamado para ver a classificacao automatica e o auto-fix funcionando.' },
        { type: 'list', items: [
          'Clique em "Novo Chamado" no menu lateral',
          'Selecione o Sistema (configurado na etapa 4)',
          'Preencha o titulo descrevendo o problema',
          'Adicione a descricao com detalhes tecnicos',
          'Clique "Criar Chamado"'
        ]},
        { type: 'substeps', substeps: [
          {
            title: 'O que acontece automaticamente',
            items: [
              'A IA classifica o chamado (bug, feature, hotfix, etc.)',
              'O tipo de branch e detectado automaticamente',
              'Se auto-fix estiver ativo: a IA analisa o codigo e gera uma correcao',
              'Uma branch e criada no repositorio',
              'Um commit com a correcao e adicionado',
              'Um Pull Request e aberto com o reviewer configurado'
            ]
          }
        ]},
        { type: 'tip', value: 'Se a classificacao estiver incorreta, voce pode corrigir manualmente. Isso serve como feedback para melhorar o modelo.' }
      ]
    },
    {
      number: 8,
      icon: 'analytics',
      title: 'Acompanhar e revisar',
      description: 'Use o dashboard e o Kanban para gerenciar seus chamados',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'O TriageAI oferece ferramentas visuais para acompanhar o progresso dos chamados e revisar as acoes da IA.' },
        { type: 'substeps', substeps: [
          {
            title: 'Dashboard',
            items: [
              'Veja metricas gerais: total de chamados, taxa de acerto, tempo medio',
              'Graficos de distribuicao por categoria',
              'Acompanhe a evolucao ao longo do tempo'
            ]
          },
          {
            title: 'Kanban Board',
            items: [
              'Visualize chamados em colunas: Aberto, Em Andamento, Resolvido',
              'Arraste e solte para mover entre colunas',
              'Filtre por sistema, prioridade ou tipo'
            ]
          },
          {
            title: 'Revisao de PRs',
            items: [
              'Acesse o PR diretamente pelo chamado',
              'Revise o codigo gerado pela IA',
              'Solicite alteracoes ou aprove',
              'O status do chamado atualiza automaticamente'
            ]
          },
          {
            title: 'Feedback para a IA',
            items: [
              'Corrija classificacoes incorretas clicando na categoria',
              'Cada correcao melhora o modelo no proximo treino',
              'Adicione notas para enriquecer os dados de treino'
            ]
          }
        ]}
      ]
    },
    {
      number: 9,
      icon: 'webhook',
      title: 'Integrar com Jira/Zendesk (API)',
      description: 'Conecte ferramentas externas via webhooks e API REST',
      completed: false,
      expanded: false,
      content: [
        { type: 'text', value: 'O TriageAI pode receber chamados automaticamente do Jira, Zendesk ou qualquer sistema via API.' },
        { type: 'list', items: [
          'Va em Configuracoes → API Keys',
          'Clique "Gerar API Key" para criar uma chave de acesso',
          'Configure o webhook na ferramenta de origem apontando para os endpoints abaixo'
        ]},
        { type: 'substeps', substeps: [
          {
            title: 'Webhook Jira',
            items: [
              'URL: POST http://SEU_SERVIDOR/api/v1/webhooks/jira',
              'Header: X-API-Key: SUA_CHAVE',
              'Trigger: Issue Created'
            ]
          },
          {
            title: 'Webhook Zendesk',
            items: [
              'URL: POST http://SEU_SERVIDOR/api/v1/webhooks/zendesk',
              'Header: X-API-Key: SUA_CHAVE',
              'Trigger: Ticket Created'
            ]
          },
          {
            title: 'Webhook Generico',
            items: [
              'URL: POST http://SEU_SERVIDOR/api/v1/webhooks/generic',
              'Header: X-API-Key: SUA_CHAVE',
              'Aceita qualquer payload com titulo e descricao'
            ]
          }
        ]},
        { type: 'code', label: 'API REST - Classificar chamado diretamente', value: `POST /api/v1/classify
Content-Type: application/json
X-API-Key: SUA_CHAVE

{
  "title": "Erro ao salvar formulario",
  "description": "Ao clicar em salvar, retorna erro 500...",
  "system_id": 1
}` },
        { type: 'code', label: 'Resposta', value: `{
  "id": 42,
  "title": "Erro ao salvar formulario",
  "predicted_category": "bug",
  "confidence": 0.94,
  "branch_type": "hotfix",
  "auto_fix_status": "in_progress"
}` },
        { type: 'tip', value: 'A API Key e vinculada a sua conta. Cada integracao pode usar uma key diferente para melhor controle de acesso.' }
      ]
    }
  ];

  toggleStep(index: number): void {
    if (this.activeStep === index) {
      this.steps[index].expanded = !this.steps[index].expanded;
    } else {
      this.steps.forEach((s, i) => s.expanded = i === index);
      this.activeStep = index;
    }
  }

  toggleCompleted(index: number, event: Event): void {
    event.stopPropagation();
    this.steps[index].completed = !this.steps[index].completed;
  }

  getProgress(): number {
    return (this.getCompletedCount() / this.steps.length) * 100;
  }

  getCompletedCount(): number {
    return this.steps.filter(s => s.completed).length;
  }
}
