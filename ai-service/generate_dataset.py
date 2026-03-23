#!/usr/bin/env python3
"""Generate 10,000 training samples for TriageAI ticket classification."""

import os
import random

random.seed(42)

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'tickets_dataset.csv')

# Common building blocks
SERVICES = [
    "auth-service", "payment-api", "notification-worker", "user-service",
    "order-service", "inventory-service", "report-service", "gateway-api",
    "catalog-service", "shipping-service", "billing-service", "search-service",
    "email-service", "audit-service", "config-service", "scheduler-service",
    "file-service", "analytics-service", "webhook-service", "cache-service",
    "loyalty-service", "recommendation-service", "pricing-service", "cms-service",
    "checkout-service", "cart-service", "coupon-service", "tax-service",
    "fraud-service", "kyc-service", "sms-service", "push-service",
]

ENVS = ["producao", "staging", "homologacao", "dev", "sandbox"]
HTTP_CODES = [400, 401, 403, 404, 408, 429, 500, 502, 503, 504]
REGIONS = ["us-east-1", "sa-east-1", "eu-west-1", "us-west-2"]
DBS = ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Elasticsearch", "DynamoDB"]
QUEUES = ["RabbitMQ", "Kafka", "SQS", "Redis Pub/Sub"]
TECHS = ["Spring Boot", "Node.js", "Python Flask", "Go", "NestJS", ".NET Core", "FastAPI", "Express"]
K8S_NS = ["default", "production", "staging", "payments", "core", "infra"]
TIMES = ["hoje de manha", "desde ontem", "ha 30 minutos", "nas ultimas 2 horas", "desde as 3h da madrugada", "agora", "faz uns 10 minutos", "ha 1 hora", "desde o deploy de ontem", "depois do ultimo release"]
USERS_COUNT = ["varios usuarios", "3 clientes", "mais de 50 usuarios", "todos os usuarios", "alguns clientes", "o time inteiro", "apenas 2 usuarios", "um cliente VIP", "todos do setor comercial", "aproximadamente 20 pessoas"]
URGENCY = ["urgente", "preciso de ajuda rapido", "isso e critico", "prioridade maxima", "precisa resolver hoje", "nao pode esperar", "ta travando tudo", "impacto alto", "SLA estourando", "cliente reclamando"]

def no_comma(s):
    """Ensure no commas in text field."""
    return s.replace(",", ";")

def pick(*args):
    return random.choice(args) if args else ""

def rpick(lst):
    return random.choice(lst)

# ===================== BATCH 1: API/Backend errors =====================
def gen_batch1():
    lines = []
    templates = [
        lambda: f"API Gateway retornando erro {rpick([502,503,504])} no endpoint /{rpick(['users','orders','products','payments','catalog','search','auth','reports'])}/{rpick(['list','create','update','delete','search','export'])} em {rpick(ENVS)}",
        lambda: f"Timeout de {rpick([5,10,15,30,60])}s ao chamar {rpick(SERVICES)} via REST - {rpick(TIMES)}",
        lambda: f"Rate limiting ativado no {rpick(SERVICES)} - {rpick(USERS_COUNT)} reportando erro 429",
        lambda: f"Endpoint POST /api/v{rpick([1,2,3])}/{rpick(['checkout','register','login','upload','sync','webhook'])} retornando HTTP {rpick(HTTP_CODES)} intermitentemente",
        lambda: f"Servico {rpick(SERVICES)} indisponivel - connection refused na porta {rpick([8080,8443,3000,5000,9090,4000])}",
        lambda: f"Latencia alta no {rpick(SERVICES)} - tempo de resposta medio de {rpick([2,3,5,8,10,15])}s quando deveria ser < 500ms",
        lambda: f"{rpick(SERVICES)} dando erro 500 Internal Server Error ao processar requisicoes de {rpick(['criacao de pedido','atualizacao de cadastro','consulta de saldo','geracao de relatorio','envio de notificacao'])}",
        lambda: f"Nginx retornando 502 Bad Gateway para todas as rotas do {rpick(SERVICES)} - {rpick(URGENCY)}",
        lambda: f"Health check do {rpick(SERVICES)} falhando - endpoint /actuator/health retornando {rpick([500,503,504])}",
        lambda: f"Erro de CORS ao acessar {rpick(SERVICES)} a partir do frontend - preflight request falhando",
        lambda: f"Load balancer nao consegue rotear para instancias do {rpick(SERVICES)} - todas marcadas como unhealthy",
        lambda: f"Swagger/OpenAPI do {rpick(SERVICES)} retornando 404 - documentacao da API inacessivel",
        lambda: f"Erro de serializacao JSON no {rpick(SERVICES)} ao retornar lista de {rpick(['pedidos','usuarios','produtos','transacoes'])} - payload invalido",
        lambda: f"API do {rpick(SERVICES)} aceitando requests mas nao processando - fila de requisicoes crescendo {rpick(TIMES)}",
        lambda: f"Requisicoes ao {rpick(SERVICES)} demorando mais de {rpick([10,20,30,45,60])}s - degradacao de performance severa",
        lambda: f"Erro {rpick([500,502,503])} no {rpick(SERVICES)} apos deploy da versao {rpick(['2.1.0','3.0.5','1.8.2','4.2.1','2.5.0'])} - rollback necessario?",
        lambda: f"Connection pool do {rpick(SERVICES)} ({rpick(TECHS)}) esgotado - novas conexoes sendo recusadas",
        lambda: f"Erro de Content-Type no {rpick(SERVICES)} - esperando application/json mas recebendo text/html",
        lambda: f"Paginacao quebrada no endpoint GET /api/{rpick(['products','orders','users','transactions'])} - retornando dados duplicados",
        lambda: f"Webhook do {rpick(SERVICES)} falhando ao notificar {rpick(SERVICES)} - retry excessivo causando sobrecarga",
        lambda: f"Erro ao fazer upload de arquivo via {rpick(SERVICES)} - limite de {rpick([5,10,25,50])}MB excedido sem mensagem clara",
        lambda: f"gRPC call entre {rpick(SERVICES)} e {rpick(SERVICES)} retornando UNAVAILABLE - deadline exceeded",
        lambda: f"Cache do {rpick(SERVICES)} (Redis) nao invalidando corretamente - dados stale sendo servidos",
        lambda: f"Resposta do {rpick(SERVICES)} vindo com charset errado - caracteres especiais corrompidos no frontend",
        lambda: f"{rpick(SERVICES)} nao respondendo a requests OPTIONS - bloqueando integracao com parceiros",
        lambda: f"Erro de circuit breaker aberto entre {rpick(SERVICES)} e {rpick(SERVICES)} - fallback nao configurado",
        lambda: f"Bulk insert falhando no {rpick(SERVICES)} - erro 413 Payload Too Large ao enviar {rpick([100,500,1000,5000])} registros",
        lambda: f"Endpoint de busca do {rpick(SERVICES)} retornando resultados vazios mesmo com dados no banco",
        lambda: f"Retry infinito no {rpick(SERVICES)} ao chamar servico externo - consumindo recursos excessivamente",
        lambda: f"Performance do {rpick(SERVICES)} caiu {rpick([30,40,50,60,70,80])}% apos atualizacao de dependencia",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "TECNICO" if random.random() < 0.85 else "OUTROS"
        pri = rpick(["ALTA", "MEDIA", "MEDIA", "CRITICA", "BAIXA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 2: Authentication & Security =====================
def gen_batch2():
    lines = []
    templates = [
        lambda: f"Login falhando para {rpick(USERS_COUNT)} - erro 401 Unauthorized no {rpick(['auth-service','gateway-api','user-service'])}",
        lambda: f"Token JWT expirado nao esta sendo renovado automaticamente - usuarios sendo deslogados {rpick(TIMES)}",
        lambda: f"Erro de OAuth2 ao integrar com {rpick(['Google','Microsoft','Apple','Facebook','GitHub','Azure AD'])} - callback retornando erro",
        lambda: f"Permissao negada (403) ao acessar /{rpick(['admin','dashboard','reports','settings','users','billing'])} mesmo com role {rpick(['ADMIN','MANAGER','SUPER_ADMIN','OPERATOR'])}",
        lambda: f"Reset de senha nao esta enviando email - {rpick(USERS_COUNT)} reclamando",
        lambda: f"SSO com {rpick(['SAML','OpenID Connect','LDAP','Active Directory','Okta','Auth0'])} parando de funcionar {rpick(TIMES)}",
        lambda: f"Sessao expirando em {rpick([1,2,5])} minutos quando deveria durar {rpick([30,60,120])} minutos",
        lambda: f"Brute force detectado na pagina de login - {rpick([100,500,1000,5000])} tentativas do IP {rpick(['192.168.1.1','10.0.0.55','172.16.0.100','203.0.113.42'])}",
        lambda: f"Vulnerabilidade de {rpick(['XSS','SQL Injection','CSRF','IDOR','SSRF'])} reportada no {rpick(SERVICES)} - precisa de patch urgente",
        lambda: f"Certificado SSL do {rpick(SERVICES)} expirando em {rpick([1,2,3,5,7])} dias - renovacao necessaria",
        lambda: f"Refresh token nao funcionando no app mobile - usuarios precisam fazer login toda hora",
        lambda: f"API key do {rpick(SERVICES)} comprometida - necessario rotacionar imediatamente",
        lambda: f"2FA (autenticacao em dois fatores) nao enviando codigo por SMS para usuarios com DDD {rpick([11,21,31,41,51,71,85])}",
        lambda: f"RBAC (Role-Based Access Control) configurado incorretamente no {rpick(SERVICES)} - usuarios com acesso indevido a dados {rpick(['financeiros','pessoais','administrativos','confidenciais'])}",
        lambda: f"Token de integracao entre {rpick(SERVICES)} e {rpick(SERVICES)} expirou - comunicacao entre servicos interrompida",
        lambda: f"Headers de seguranca ausentes no {rpick(SERVICES)} - Content-Security-Policy e X-Frame-Options nao configurados",
        lambda: f"Rate limiting de autenticacao muito agressivo - usuarios legitimos sendo bloqueados apos {rpick([3,5])} tentativas",
        lambda: f"Erro ao validar certificado mTLS entre {rpick(SERVICES)} e {rpick(SERVICES)} - handshake falhando",
        lambda: f"Logs de auditoria de login nao estao sendo gravados no {rpick(SERVICES)} {rpick(TIMES)}",
        lambda: f"Endpoint de logout nao esta invalidando o token - sessao continua ativa apos logout",
        lambda: f"Politica de senha nao esta sendo aplicada - usuarios conseguem criar senhas fracas como '123456'",
        lambda: f"CORS mal configurado no {rpick(SERVICES)} permitindo origem * em producao - risco de seguranca",
        lambda: f"Dados sensiveis ({rpick(['CPF','email','telefone','endereco','cartao'])}) sendo logados em texto plano no {rpick(SERVICES)}",
        lambda: f"Falha no {rpick(['auth-service','gateway-api'])} ao validar scope do token OAuth - permissoes nao sendo verificadas",
        lambda: f"Conta de servico do {rpick(SERVICES)} com permissoes excessivas no {rpick(['AWS','GCP','Azure'])} - principio do menor privilegio violado",
        lambda: f"Ataque de credential stuffing detectado - {rpick([50,100,200,500])} contas comprometidas potencialmente",
        lambda: f"Configuracao de WAF (Web Application Firewall) bloqueando requisicoes legitimas ao {rpick(SERVICES)}",
        lambda: f"Integracao LDAP com Active Directory falhando - sincronizacao de usuarios nao acontecendo",
        lambda: f"Erro de PKCE (Proof Key for Code Exchange) no fluxo OAuth do app mobile - login nao completa",
        lambda: f"Secret manager ({rpick(['Vault','AWS Secrets Manager','Azure Key Vault'])}) inacessivel - {rpick(SERVICES)} nao consegue obter credenciais",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "SEGURANCA" if random.random() < 0.6 else "TECNICO"
        pri = rpick(["ALTA", "ALTA", "CRITICA", "MEDIA", "CRITICA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 3: Database & Data =====================
def gen_batch3():
    lines = []
    templates = [
        lambda: f"Connection pool do {rpick(DBS)} esgotado no {rpick(SERVICES)} - max connections ({rpick([20,50,100,200])}) atingido",
        lambda: f"Query lenta no {rpick(DBS)} - SELECT em tabela {rpick(['pedidos','usuarios','transacoes','produtos','logs','eventos'])} demorando {rpick([5,10,30,60,120])}s",
        lambda: f"Dados inconsistentes entre {rpick(SERVICES)} e {rpick(SERVICES)} - {rpick(['saldo','estoque','status do pedido','dados cadastrais'])} divergente",
        lambda: f"Migration do {rpick(DBS)} falhou no {rpick(SERVICES)} - schema {rpick(['V2.1','V3.0','V1.5','V4.2'])} nao aplicado",
        lambda: f"Backup do {rpick(DBS)} ({rpick(SERVICES)}) falhando {rpick(TIMES)} - ultimo backup valido de {rpick([2,3,5,7])} dias atras",
        lambda: f"Deadlock frequente no {rpick(DBS)} ao processar {rpick(['pedidos concorrentes','atualizacoes em lote','transacoes simultaneas'])}",
        lambda: f"Replicacao do {rpick(DBS)} atrasada em {rpick([5,10,30,60])} minutos - leitura retornando dados desatualizados",
        lambda: f"Index corrompido na tabela {rpick(['orders','users','products','transactions','payments'])} do {rpick(DBS)} - queries full scan",
        lambda: f"Disco do servidor {rpick(DBS)} em {rpick([85,90,95,98])}% - precisa de limpeza ou expansao urgente",
        lambda: f"Erro ao restaurar backup do {rpick(DBS)} em {rpick(ENVS)} - incompatibilidade de versao",
        lambda: f"Stored procedure {rpick(['sp_calcular_frete','sp_processar_pagamento','sp_gerar_relatorio','sp_atualizar_estoque'])} retornando resultado incorreto apos atualizacao",
        lambda: f"Tabela {rpick(['audit_log','event_store','user_sessions','temp_data'])} crescendo descontroladamente - {rpick([50,100,200,500])}GB sem politica de retencao",
        lambda: f"Conexao com {rpick(DBS)} caindo intermitentemente no {rpick(SERVICES)} - erro: Connection reset by peer",
        lambda: f"Migracao de dados de {rpick(DBS)} para {rpick(DBS)} com perda de registros - {rpick([100,500,1000,5000])} linhas ausentes",
        lambda: f"Cache do Redis invalidando prematuramente no {rpick(SERVICES)} - TTL configurado incorretamente",
        lambda: f"Elasticsearch no {rpick(SERVICES)} com cluster status RED - {rpick([1,2,3])} shards nao alocados",
        lambda: f"Erro de encoding UTF-8 no {rpick(DBS)} - caracteres acentuados corrompidos em {rpick(['nomes','enderecos','descricoes de produto'])}",
        lambda: f"Sequence/auto-increment do {rpick(DBS)} gerando IDs duplicados no {rpick(SERVICES)} em cenario de alta concorrencia",
        lambda: f"Vacuum do PostgreSQL nao executando no {rpick(SERVICES)} - tabelas inchadas com {rpick([10,20,50])} milhoes de tuplas mortas",
        lambda: f"Read replica do {rpick(DBS)} dessincronizada - lag de {rpick([30,60,120,300])} segundos afetando relatorios",
        lambda: f"Erro ao executar ALTER TABLE em producao no {rpick(DBS)} - lock bloqueando todas as queries por {rpick([5,10,30])} minutos",
        lambda: f"MongoDB no {rpick(SERVICES)} com documentos orfaos apos falha de transacao distribuida",
        lambda: f"Pool de conexoes do {rpick(SERVICES)} ({rpick(TECHS)}) com leak - conexoes nao sendo devolvidas ao pool",
        lambda: f"Trigger do {rpick(DBS)} disparando em loop infinito ao atualizar tabela {rpick(['inventory','prices','user_status'])}",
        lambda: f"Particao da tabela {rpick(['logs','events','metrics','transactions'])} de {rpick(['janeiro','fevereiro','marco','abril'])} nao criada - inserts falhando",
        lambda: f"Erro de foreign key constraint ao deletar registro em {rpick(['users','products','orders'])} - dependencias nao mapeadas",
        lambda: f"Point-in-time recovery do {rpick(DBS)} necessario - dados corrompidos entre {rpick(['14h','15h','16h'])} e {rpick(['17h','18h','19h'])} de hoje",
        lambda: f"Query N+1 detectada no {rpick(SERVICES)} ({rpick(TECHS)}) - {rpick([100,500,1000])} queries para carregar uma pagina",
        lambda: f"Connection timeout ao acessar {rpick(DBS)} via VPN - latencia de {rpick([200,500,800,1200])}ms",
        lambda: f"Procedure de expurgo de dados antigos do {rpick(DBS)} nao rodou no {rpick(SERVICES)} - violacao de LGPD potencial",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "TECNICO"
        pri = rpick(["ALTA", "MEDIA", "CRITICA", "MEDIA", "ALTA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 4: Payment & Financial =====================
def gen_batch4():
    lines = []
    gateways = ["Cielo", "Rede", "PagSeguro", "Mercado Pago", "Stripe", "Stone", "Pagar.me", "Adyen", "PayPal"]
    templates = [
        lambda: f"Pagamento via {rpick(gateways)} retornando erro {rpick(['DECLINED','TIMEOUT','INVALID_CARD','INSUFFICIENT_FUNDS','PROCESSING_ERROR'])} - {rpick(USERS_COUNT)} afetados",
        lambda: f"Boleto gerado pelo {rpick(['billing-service','payment-api'])} com valor incorreto - diferenca de R${rpick([0.01,0.10,1.00,10.00,100.00])}",
        lambda: f"Reembolso no {rpick(gateways)} nao sendo processado - pedido #{rpick([10000,20000,30000,40000,50000])+random.randint(1,9999)} pendente ha {rpick([3,5,7,10,15])} dias",
        lambda: f"Nota fiscal eletronica (NFe) nao sendo emitida para pedidos do estado {rpick(['SP','RJ','MG','RS','PR','BA','SC'])} - erro no SEFAZ",
        lambda: f"Calculo de frete retornando valor {rpick(['zero','negativo','absurdo (R$999)','incorreto'])} para CEP {rpick(['01310-100','20040-020','30130-000','80010-000'])}",
        lambda: f"Cobranca duplicada detectada no {rpick(gateways)} - cliente cobrando {rpick([2,3,4])} vezes pelo mesmo pedido",
        lambda: f"Cupom de desconto {rpick(['PROMO10','BLACK50','NATAL20','BEMVINDO','FRETEGRATIS'])} aplicando {rpick(['desconto errado','desconto em produto excluido','desconto acumulativo indevido'])}",
        lambda: f"Integracao com {rpick(gateways)} fora do ar - todas as transacoes de cartao de credito falhando {rpick(TIMES)}",
        lambda: f"Split de pagamento para marketplace nao distribuindo corretamente entre sellers - {rpick(URGENCY)}",
        lambda: f"Relatorio financeiro do mes de {rpick(['janeiro','fevereiro','marco','abril','maio','junho'])} com divergencia de R${rpick([100,500,1000,5000,10000])}.{rpick([0,50,99]):02d}",
        lambda: f"PIX via {rpick(gateways)} nao confirmando pagamento - webhook de confirmacao nao chegando no {rpick(['payment-api','order-service'])}",
        lambda: f"Calculo de ICMS incorreto para operacao interestadual {rpick(['SP->RJ','MG->SP','RS->SC','PR->BA'])} - aliquota errada",
        lambda: f"Chargedback recebido do {rpick(gateways)} nao atualizando status do pedido no {rpick(['order-service','payment-api'])}",
        lambda: f"Assinatura recorrente do {rpick(gateways)} cobrando valor antigo apos mudanca de plano",
        lambda: f"Erro ao gerar boleto registrado - banco {rpick(['Bradesco','Itau','Santander','Banco do Brasil','Caixa'])} rejeitando registro",
        lambda: f"Conciliacao bancaria com diferenca de {rpick([5,10,20,50,100])} transacoes entre sistema e extrato",
        lambda: f"Taxa de juros por atraso nao sendo calculada corretamente - multa de 2% nao aplicada",
        lambda: f"Cashback do programa de fidelidade nao sendo creditado na carteira digital do cliente",
        lambda: f"Parcelamento em {rpick([3,6,10,12])}x mostrando valor total diferente no checkout vs pagina do produto",
        lambda: f"Gateway de pagamento {rpick(gateways)} com latencia de {rpick([5,10,15,30])}s - timeout na finalizacao do pedido",
        lambda: f"Transferencia bancaria (TED/DOC) pendente de compensacao ha {rpick([2,3,5])} dias uteis - sistema nao atualizando",
        lambda: f"Erro na integracao ERP ({rpick(['SAP','TOTVS','Oracle','Senior'])}) com {rpick(['billing-service','payment-api'])} - notas nao sincronizando",
        lambda: f"Preco do produto atualizando no catalogo mas nao no carrinho - divergencia de R${rpick([5,10,20,50])}.{rpick(range(100)):02d}",
        lambda: f"Relatorio de comissoes dos vendedores com calculo incorreto - base de calculo {rpick(['incluindo frete','excluindo desconto','com imposto duplicado'])}",
        lambda: f"Antecipacao de recebiveis do {rpick(gateways)} com taxa diferente da contratada - diferenca de {rpick([0.5,1.0,1.5,2.0])}%",
        lambda: f"Sistema de cotacao de moeda estrangeira (USD/BRL) desatualizado - usando taxa de {rpick([2,3,5,7])} dias atras",
        lambda: f"Erro no calculo do PIS/COFINS para produtos da categoria {rpick(['alimentos','eletronicos','vestuario','cosmeticos'])}",
        lambda: f"Carteira digital do {rpick(['payment-api','billing-service'])} mostrando saldo negativo indevidamente para {rpick(USERS_COUNT)}",
        lambda: f"Checkout travando na etapa de pagamento quando cliente seleciona {rpick(['PIX','boleto','2 cartoes','vale + cartao'])}",
        lambda: f"Nota de credito nao sendo gerada automaticamente apos aprovacao de devolucao no {rpick(['order-service','billing-service'])}",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "FINANCEIRO"
        pri = rpick(["ALTA", "CRITICA", "ALTA", "MEDIA", "CRITICA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 5: Infrastructure & DevOps =====================
def gen_batch5():
    lines = []
    templates = [
        lambda: f"Container Docker do {rpick(SERVICES)} reiniciando em loop (CrashLoopBackOff) - OOMKilled com limite de {rpick([256,512,1024,2048])}Mi",
        lambda: f"Pod do {rpick(SERVICES)} no Kubernetes namespace {rpick(K8S_NS)} em estado Pending - recursos insuficientes no node",
        lambda: f"Pipeline CI/CD ({rpick(['GitHub Actions','GitLab CI','Jenkins','CircleCI','Azure DevOps'])}) falhando no stage de {rpick(['build','test','deploy','lint','security-scan'])}",
        lambda: f"Alerta de CPU no {rpick(SERVICES)} - uso em {rpick([85,90,95,99])}% por mais de {rpick([5,10,15,30])} minutos",
        lambda: f"Disco do node {rpick(['worker-1','worker-2','worker-3','master-1'])} em {rpick([90,95,98])}% - pods sendo evicted",
        lambda: f"Certificado SSL do dominio {rpick(['api','app','admin','portal','dashboard'])}.empresa.com.br expira em {rpick([1,2,3,5,7])} dias",
        lambda: f"Memoria do {rpick(SERVICES)} ({rpick(TECHS)}) com leak - crescendo {rpick([50,100,200])}MB/hora sem liberacao",
        lambda: f"Ingress controller (Nginx) nao roteando para {rpick(SERVICES)} apos mudanca de configmap",
        lambda: f"Auto-scaling do {rpick(SERVICES)} nao ativando mesmo com {rpick([80,90,95])}% de CPU - HPA mal configurado",
        lambda: f"Terraform apply falhando ao provisionar {rpick(['RDS','EC2','EKS','S3','Lambda','ECS'])} em {rpick(REGIONS)}",
        lambda: f"Log aggregation ({rpick(['ELK Stack','Grafana Loki','Datadog','CloudWatch'])}) parou de ingerir logs do {rpick(SERVICES)} {rpick(TIMES)}",
        lambda: f"Metric server do Kubernetes retornando dados zerados - dashboards do Grafana sem informacao",
        lambda: f"Helm chart do {rpick(SERVICES)} com valores de {rpick(ENVS)} sendo aplicados em producao por erro",
        lambda: f"Network policy bloqueando comunicacao entre {rpick(SERVICES)} e {rpick(SERVICES)} no Kubernetes",
        lambda: f"PersistentVolumeClaim do {rpick(SERVICES)} em estado Pending - storage class {rpick(['gp2','gp3','io1','standard'])} sem espaco",
        lambda: f"DNS interno do cluster nao resolvendo {rpick(SERVICES)}.{rpick(K8S_NS)}.svc.cluster.local",
        lambda: f"Rollout do {rpick(SERVICES)} travado em {rpick([1,2,3])}/{rpick([3,4,5])} replicas prontas - readiness probe falhando",
        lambda: f"Secrets do Kubernetes ({rpick(['db-credentials','api-keys','tls-cert','oauth-secrets'])}) expirados no namespace {rpick(K8S_NS)}",
        lambda: f"Container registry ({rpick(['ECR','GCR','Docker Hub','Harbor'])}) com imagem do {rpick(SERVICES)} corrompida - pull falhando",
        lambda: f"Cron job de {rpick(['cleanup','backup','sync','report','healthcheck'])} nao executando no Kubernetes - schedule incorreto",
        lambda: f"Istio service mesh com sidecar injection falhando no namespace {rpick(K8S_NS)} - pods sem proxy envoy",
        lambda: f"ConfigMap do {rpick(SERVICES)} desatualizado - aplicacao usando configuracao de {rpick([2,5,10])} deploys atras",
        lambda: f"Monitoramento ({rpick(['Prometheus','Datadog','New Relic','Zabbix'])}) gerando {rpick([100,500,1000])} alertas falso-positivos por hora",
        lambda: f"Node do Kubernetes com status NotReady - kubelet nao respondendo no {rpick(['worker-1','worker-2','worker-3'])}",
        lambda: f"ArgoCD nao sincronizando manifests do {rpick(SERVICES)} - diff detectado mas sync nao aplicando",
        lambda: f"VPN entre datacenter e cloud ({rpick(REGIONS)}) caindo intermitentemente - {rpick(SERVICES)} perdendo conexao com banco on-premise",
        lambda: f"Docker image do {rpick(SERVICES)} com vulnerabilidade {rpick(['CVE-2024-1234','CVE-2024-5678','CVE-2023-9012'])} classificada como {rpick(['critica','alta'])}",
        lambda: f"AWS Lambda ({rpick(SERVICES)}) atingindo limite de {rpick([100,500,1000])} execucoes concorrentes - throttling",
        lambda: f"Spot instance do {rpick(SERVICES)} sendo terminada pela AWS - workload interrompido sem failover",
        lambda: f"Service account do {rpick(SERVICES)} no GCP/AWS sem permissao para acessar {rpick(['S3','Cloud Storage','Secret Manager','KMS'])}",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "TECNICO"
        pri = rpick(["ALTA", "CRITICA", "MEDIA", "ALTA", "CRITICA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 6: Queue & Messaging =====================
def gen_batch6():
    lines = []
    templates = [
        lambda: f"Consumer lag no {rpick(QUEUES)} para topico {rpick(['orders','payments','notifications','events','user-updates','inventory-sync'])} - {rpick([1000,5000,10000,50000,100000])} mensagens atrasadas",
        lambda: f"Kafka particao {rpick(range(12))} do topico {rpick(['order-events','payment-events','user-events'])} sem lider - consumers parados",
        lambda: f"Mensagens nao sendo processadas pelo {rpick(SERVICES)} - consumer group {rpick(['order-processor','payment-handler','notification-sender'])} inativo",
        lambda: f"Dead letter queue do {rpick(QUEUES)} com {rpick([100,500,1000,5000])} mensagens - erros de desserializacao",
        lambda: f"Event sourcing no {rpick(SERVICES)} com gap na sequencia de eventos - evento #{rpick([1000,5000,10000])} ausente",
        lambda: f"RabbitMQ com {rpick([10,50,100])} filas nao consumidas - memory alarm ativado no broker",
        lambda: f"Kafka consumer do {rpick(SERVICES)} rebalanceando a cada {rpick([1,2,5])} minutos - processamento instavel",
        lambda: f"Mensagem de {rpick(['pedido criado','pagamento confirmado','estoque atualizado','notificacao enviada'])} duplicada no {rpick(QUEUES)} - idempotencia falhou",
        lambda: f"Topico Kafka {rpick(['order-events','payment-events','user-events'])} com retention period expirado - dados de {rpick([7,14,30])} dias atras perdidos",
        lambda: f"Worker do {rpick(SERVICES)} consumindo mensagens mas nao commitando offset - reprocessamento infinito",
        lambda: f"Serialization error no {rpick(QUEUES)} - schema Avro/Protobuf incompativel entre producer e consumer",
        lambda: f"Fila de {rpick(['emails','sms','push-notifications','webhooks'])} do {rpick(SERVICES)} acumulando {rpick(TIMES)} - consumer travado",
        lambda: f"RabbitMQ cluster com node {rpick(['rabbit-1','rabbit-2','rabbit-3'])} desconectado - split brain potencial",
        lambda: f"Latencia de publicacao no Kafka aumentou para {rpick([100,500,1000,5000])}ms - batching configurado incorretamente",
        lambda: f"Schema Registry ({rpick(['Confluent','Apicurio','AWS Glue'])}) retornando 500 - producers nao conseguem enviar mensagens",
        lambda: f"Mensagens no {rpick(QUEUES)} sendo consumidas fora de ordem - {rpick(SERVICES)} processando eventos incorretamente",
        lambda: f"Exchange do RabbitMQ ({rpick(['direct','fanout','topic','headers'])}) nao roteando para fila {rpick(['order-queue','payment-queue','notification-queue'])}",
        lambda: f"Kafka Connect connector {rpick(['jdbc-sink','elasticsearch-sink','s3-sink','debezium-source'])} falhando - task em estado FAILED",
        lambda: f"Backpressure no {rpick(SERVICES)} - producer mais rapido que consumer em {rpick([10,50,100])}x",
        lambda: f"Mensagens expiradas (TTL) nao sendo movidas para DLQ no {rpick(QUEUES)} - perda silenciosa de dados",
        lambda: f"AMQP connection do {rpick(SERVICES)} com RabbitMQ sendo resetada a cada {rpick([30,60,120])} segundos",
        lambda: f"Kafka Streams do {rpick(SERVICES)} em estado ERROR - rebalance constante impedindo processamento",
        lambda: f"Saga pattern falhando no passo {rpick([2,3,4,5])} de {rpick([5,6,7])} - compensacao nao executando para rollback",
        lambda: f"Celery workers ({rpick(SERVICES)}) nao pegando tasks da fila - broker {rpick(QUEUES)} inacessivel",
        lambda: f"SNS/SQS integracao com {rpick(SERVICES)} falhando - subscription filter policy incorreta",
        lambda: f"Event bus do {rpick(SERVICES)} nao propagando evento {rpick(['OrderCreated','PaymentProcessed','UserRegistered','InventoryUpdated'])} para subscribers",
        lambda: f"Poison message bloqueando fila {rpick(['order-processing','payment-validation','notification-dispatch'])} no {rpick(QUEUES)}",
        lambda: f"Consumer do {rpick(SERVICES)} com max.poll.interval.ms muito baixo - rebalance antes de terminar processamento",
        lambda: f"Retry policy do {rpick(SERVICES)} com backoff exponencial atingindo limite maximo - mensagens descartadas",
        lambda: f"Outbox pattern no {rpick(SERVICES)} com relay travado - eventos nao sendo publicados no {rpick(QUEUES)} {rpick(TIMES)}",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "TECNICO"
        pri = rpick(["ALTA", "MEDIA", "CRITICA", "ALTA", "MEDIA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 7: Frontend & UX =====================
def gen_batch7():
    lines = []
    browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"]
    pages = ["home", "checkout", "carrinho", "perfil", "dashboard", "catalogo", "detalhes do produto", "configuracoes", "relatorios", "busca"]
    templates = [
        lambda: f"Pagina de {rpick(pages)} nao carregando - tela branca no {rpick(browsers)} versao {rpick([100,110,115,120,125])}",
        lambda: f"Layout quebrado na versao mobile da pagina de {rpick(pages)} - elementos sobrepostos em tela {rpick([320,375,390,414])}px",
        lambda: f"Formulario de {rpick(['cadastro','login','checkout','contato','suporte'])} nao enviando ao clicar no botao de submit",
        lambda: f"Imagens do {rpick(['catalogo','banner','produto','perfil'])} nao carregando - CDN retornando 403",
        lambda: f"Erro de JavaScript no console: {rpick(['TypeError: Cannot read property of undefined','ReferenceError: x is not defined','SyntaxError: Unexpected token','ChunkLoadError: Loading chunk failed'])}",
        lambda: f"Pagina de {rpick(pages)} demorando {rpick([5,8,10,15,20])}s para carregar - Core Web Vitals critico",
        lambda: f"Dropdown de {rpick(['estado','cidade','categoria','departamento'])} nao mostrando opcoes no {rpick(browsers)}",
        lambda: f"Modal de {rpick(['confirmacao','erro','sucesso','aviso'])} abrindo atras do overlay - impossivel fechar",
        lambda: f"Scroll infinito da pagina de {rpick(['produtos','pedidos','resultados'])} parando de carregar apos {rpick([2,3,5])} paginas",
        lambda: f"Campo de busca nao retornando resultados - autocomplete quebrado apos ultimo deploy",
        lambda: f"Botao de {rpick(['comprar','adicionar ao carrinho','finalizar','salvar','enviar'])} nao responsivo em dispositivos touch",
        lambda: f"Breadcrumb da pagina de {rpick(pages)} mostrando caminho incorreto - navegacao confusa",
        lambda: f"Tabela de {rpick(['pedidos','usuarios','produtos','relatorios'])} nao paginando corretamente - mostrando todos os {rpick([1000,5000,10000])} registros de uma vez",
        lambda: f"Notificacao toast sumindo antes do usuario conseguir ler - duracao de {rpick([1,2])}s muito curta",
        lambda: f"Dark mode da aplicacao quebrando contraste do texto em {rpick(pages)} - texto invisivel",
        lambda: f"Upload de {rpick(['imagem','documento','planilha','PDF'])} na pagina de {rpick(pages)} travando em {rpick([50,70,90,99])}%",
        lambda: f"Menu lateral (sidebar) nao colapsando no {rpick(browsers)} - sobrepondo conteudo principal",
        lambda: f"Graficos do dashboard nao renderizando - erro no {rpick(['Chart.js','D3.js','Recharts','ApexCharts'])} apos atualizacao",
        lambda: f"Internationalizacao (i18n) mostrando chaves ao inves de traducao: {rpick(['common.save','error.required','label.name','button.submit'])}",
        lambda: f"Loading spinner infinito na pagina de {rpick(pages)} - requisicao para {rpick(SERVICES)} nao retornando",
        lambda: f"Validacao de formulario permitindo {rpick(['email invalido','CPF incorreto','data futura','valor negativo'])} sem mostrar erro",
        lambda: f"PWA (Progressive Web App) nao atualizando cache - usuario vendo versao antiga da aplicacao",
        lambda: f"Acessibilidade: leitor de tela nao consegue navegar pela pagina de {rpick(pages)} - ARIA labels ausentes",
        lambda: f"Animacao de transicao de pagina causando flash branco no {rpick(browsers)} em modo escuro",
        lambda: f"Filtros da pagina de {rpick(['catalogo','pedidos','relatorios'])} resetando ao voltar da pagina de detalhes",
        lambda: f"Print da pagina de {rpick(['nota fiscal','relatorio','recibo','boleto'])} cortando conteudo - CSS de impressao quebrado",
        lambda: f"Componente de data picker mostrando formato {rpick(['MM/DD/YYYY','DD-MM-YYYY'])} ao inves de DD/MM/YYYY",
        lambda: f"Sessao do usuario expirando sem redirecionar para login - acoes silenciosamente falhando",
        lambda: f"Video player na pagina de {rpick(['treinamento','produto','ajuda'])} nao carregando no {rpick(browsers)} mobile",
        lambda: f"Copy/paste nao funcionando no campo de {rpick(['CPF','CNPJ','telefone','CEP'])} devido a mascara de input",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "TECNICO"
        pri = rpick(["MEDIA", "BAIXA", "ALTA", "MEDIA", "BAIXA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 8: Commercial & Sales =====================
def gen_batch8():
    lines = []
    templates = [
        lambda: f"Preco do produto {rpick(['SKU-'+str(random.randint(1000,9999)) for _ in [1]])} mostrando valor incorreto no catalogo - R${rpick([10,50,100,500])}.{rpick(range(100)):02d} ao inves do correto",
        lambda: f"Cupom de desconto {rpick(['VERAO2024','PROMO30','FRETE0','NATAL25','BEMVINDO10','BLACK50'])} nao aplicando para {rpick(USERS_COUNT)}",
        lambda: f"Produto {rpick(['esgotado aparecendo como disponivel','disponivel aparecendo como esgotado','com estoque negativo','com quantidade incorreta'])} no {rpick(['site','app','marketplace'])}",
        lambda: f"Carrinho de compras {rpick(['perdendo itens ao atualizar pagina','nao calculando frete','mostrando preco antigo','nao aplicando desconto progressivo'])}",
        lambda: f"Rastreamento de pedido #{rpick([10000,20000,30000,40000,50000])+random.randint(1,9999)} sem atualizacao ha {rpick([3,5,7,10])} dias - cliente {rpick(URGENCY)}",
        lambda: f"Campanha promocional de {rpick(['Black Friday','Natal','Dia das Maes','Aniversario da loja','Cyber Monday'])} com regras de desconto conflitantes",
        lambda: f"Vendedor {rpick(['nao consegue acessar painel de comissoes','sem visibilidade dos pedidos da sua regiao','com meta incorreta no dashboard'])}",
        lambda: f"Integracao com marketplace {rpick(['Mercado Livre','Amazon','Shopee','Magazine Luiza','B2W'])} falhando - produtos nao sincronizando",
        lambda: f"Cliente reclamando que pedido foi {rpick(['cancelado sem motivo','entregue em endereco errado','cobrado mas nao enviado','duplicado no sistema'])}",
        lambda: f"Tabela de precos para {rpick(['atacado','varejo','distribuidor','revendedor'])} nao atualizada apos reajuste de {rpick([5,10,15,20])}%",
        lambda: f"Calculo de frete pelo {rpick(['Correios','Jadlog','Loggi','Total Express','Azul Cargo'])} retornando prazo de {rpick([30,45,60,90])} dias - incorreto",
        lambda: f"Vitrine de {rpick(['lancamentos','mais vendidos','promocoes','recomendados'])} mostrando produtos inativos/descontinuados",
        lambda: f"Sistema de {rpick(['cross-sell','upsell','recomendacao'])} sugerindo produtos incompativeis ou sem estoque",
        lambda: f"Pedido de troca/devolucao do cliente nao aparecendo no painel do SAC - {rpick(URGENCY)}",
        lambda: f"Limite de credito do cliente {rpick(['B2B','corporativo','atacadista'])} nao sendo verificado no momento da compra",
        lambda: f"Promocao do tipo {rpick(['leve 3 pague 2','compre e ganhe','frete gratis acima de R$99','desconto progressivo'])} nao calculando corretamente",
        lambda: f"Catalogo de produtos com {rpick([50,100,200,500])} itens sem imagem - impactando conversao de vendas",
        lambda: f"Meta de vendas do time {rpick(['comercial','inside sales','field sales','televendas'])} configurada incorretamente no CRM",
        lambda: f"Lead capturado via {rpick(['landing page','formulario do site','chatbot','WhatsApp'])} nao chegando no CRM ({rpick(['Salesforce','HubSpot','Pipedrive','RD Station'])})",
        lambda: f"Proposta comercial gerada com {rpick(['preco antigo','condicao de pagamento errada','prazo incorreto','produto descontinuado'])}",
        lambda: f"Alerta de estoque minimo nao disparando para produto {rpick(['SKU-'+str(random.randint(1000,9999)) for _ in [1]])} - ruptura nao detectada",
        lambda: f"Cliente PJ com CNPJ {rpick(['ativo','inapto','suspenso'])} na Receita conseguindo fazer pedido sem validacao",
        lambda: f"Ranking de vendedores no dashboard mostrando dados de {rpick([2,3,6])} meses atras - nao atualizado",
        lambda: f"Regra de negocio de {rpick(['quantidade minima','pedido minimo de R$500','restricao regional','horario de corte'])} nao sendo aplicada no checkout",
        lambda: f"Descricao do produto {rpick(['com informacao tecnica errada','sem especificacoes','com foto de outro modelo','desatualizada'])} no {rpick(['site','app','marketplace'])}",
        lambda: f"Comissao do vendedor calculada sobre valor {rpick(['bruto ao inves de liquido','sem descontar impostos','incluindo frete','com desconto duplicado'])}",
        lambda: f"Programa de fidelidade nao acumulando pontos para compras realizadas via {rpick(['app','marketplace','televendas','loja fisica'])}",
        lambda: f"Orcamento #{rpick([1000,2000,3000,4000,5000])+random.randint(1,999)} expirado aparecendo como vigente - cliente tentando aprovar",
        lambda: f"Produto personalizado ({rpick(['gravacao','bordado','impressao','cor especial'])}) nao mostrando opcoes de customizacao no {rpick(['site','app'])}",
        lambda: f"Relatorio de vendas por {rpick(['canal','regiao','vendedor','categoria','periodo'])} com totais nao batendo com o financeiro",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "COMERCIAL"
        pri = rpick(["ALTA", "MEDIA", "MEDIA", "BAIXA", "ALTA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 9: Administrative =====================
def gen_batch9():
    lines = []
    templates = [
        lambda: f"Nao consigo {rpick(['criar','editar','desativar','resetar senha de','alterar permissoes de'])} usuario no painel administrativo",
        lambda: f"Relatorio de {rpick(['vendas mensal','estoque','financeiro','auditoria','performance','SLA'])} nao gerando - erro ao exportar {rpick(['PDF','Excel','CSV'])}",
        lambda: f"Email de {rpick(['confirmacao de pedido','recuperacao de senha','boas-vindas','nota fiscal','atualizacao de status'])} nao sendo enviado para clientes",
        lambda: f"Log de auditoria sem registros de {rpick(['alteracao de preco','exclusao de usuario','mudanca de permissao','acesso a dados sensiveis'])} desde {rpick(TIMES)}",
        lambda: f"Configuracao de {rpick(['SMTP','webhook','integracao API','notificacao push','taxa de juros'])} precisa ser alterada em {rpick(ENVS)}",
        lambda: f"Cadastro de novo {rpick(['fornecedor','parceiro','filial','departamento','centro de custo'])} travando na etapa de validacao",
        lambda: f"Template de email de {rpick(['marketing','transacional','operacional','suporte'])} com formatacao quebrada no {rpick(['Gmail','Outlook','Yahoo','Apple Mail'])}",
        lambda: f"Dashboard administrativo mostrando metricas de {rpick(['ontem','semana passada','mes anterior'])} ao inves de tempo real",
        lambda: f"Importacao de planilha com {rpick([100,500,1000,5000])} {rpick(['usuarios','produtos','precos','enderecos'])} falhando na linha {rpick([10,50,100,200])}",
        lambda: f"Workflow de aprovacao de {rpick(['pedido','reembolso','desconto especial','cadastro','alteracao de limite'])} nao notificando o aprovador",
        lambda: f"Agendamento de {rpick(['relatorio automatico','backup','limpeza de dados','sincronizacao'])} nao executando no horario configurado",
        lambda: f"Perfil de acesso {rpick(['Gerente','Supervisor','Analista','Operador','Auditor'])} com telas {rpick(['a mais','a menos','incorretas'])} no menu",
        lambda: f"Filtro de {rpick(['data','status','departamento','regiao','categoria'])} no painel administrativo nao funcionando corretamente",
        lambda: f"Historico de alteracoes do {rpick(['cadastro do cliente','produto','preco','configuracao'])} nao sendo registrado",
        lambda: f"Integracao com {rpick(['TOTVS','SAP','Oracle ERP','Senior','Omie'])} para sincronizar {rpick(['clientes','produtos','pedidos','notas fiscais'])} falhando",
        lambda: f"Campo {rpick(['CNPJ','CPF','CEP','telefone','email'])} aceitando formato invalido no formulario de cadastro",
        lambda: f"Notificacao interna para o time de {rpick(['operacoes','financeiro','comercial','TI','RH'])} nao chegando via {rpick(['email','Slack','Teams','sistema'])}",
        lambda: f"Exportacao de dados para LGPD (relatorio de dados pessoais) nao incluindo registros do {rpick(SERVICES)}",
        lambda: f"Permissao de {rpick(['visualizar','editar','excluir','aprovar','exportar'])} no modulo de {rpick(['financeiro','estoque','RH','vendas'])} configurada incorretamente",
        lambda: f"Tela de {rpick(['configuracoes','parametros do sistema','gestao de filas','SLA','horario de atendimento'])} nao salvando alteracoes",
        lambda: f"Bulk update de {rpick([50,100,500,1000])} {rpick(['precos','status','categorias','tags'])} via painel admin demorando mais de {rpick([10,30,60])} minutos",
        lambda: f"Job de {rpick(['expurgo de dados antigos','recalculo de indicadores','atualizacao de cache','reindexacao'])} nao completando - timeout apos {rpick([1,2,4])} horas",
        lambda: f"Cadastro de {rpick(['feriado','horario especial','regra de negocio','politica de desconto'])} nao sendo aplicado em todas as {rpick(['filiais','lojas','canais'])}",
        lambda: f"Sistema de {rpick(['tickets','chamados','ocorrencias','solicitacoes'])} nao enviando SLA alert quando prazo esta em {rpick([50,70,80,90])}%",
        lambda: f"Modulo de {rpick(['RH','folha de pagamento','ponto eletronico','ferias','beneficios'])} com dados desatualizados do colaborador",
        lambda: f"Integracao com {rpick(['Correios','transportadora','gateway SMS','plataforma de email marketing'])} com credenciais expiradas",
        lambda: f"Painel de indicadores (KPI) de {rpick(['atendimento','vendas','operacoes','financeiro'])} com formula de calculo incorreta",
        lambda: f"Backup automatico dos dados {rpick(['configuracao do sistema','templates','regras de negocio','parametros'])} nao sendo executado",
        lambda: f"Migracao de dados do sistema legado para o novo - {rpick([200,500,1000,2000])} registros nao importados por inconsistencia",
        lambda: f"Tela de {rpick(['home','login','cadastro','dashboard'])} do painel admin com aviso de versao desatualizada do navegador",
    ]
    for i in range(1000):
        t = rpick(templates)()
        cat = "ADMINISTRATIVO"
        pri = rpick(["MEDIA", "BAIXA", "MEDIA", "ALTA", "BAIXA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines

# ===================== BATCH 10: Mixed/Complex =====================
def gen_batch10():
    lines = []
    templates_tecnico = [
        lambda: f"Falha em cascata: {rpick(SERVICES)} caiu e derrubou {rpick(SERVICES)} e {rpick(SERVICES)} por dependencia direta",
        lambda: f"Integracao entre {rpick(SERVICES)} ({rpick(TECHS)}) e {rpick(SERVICES)} ({rpick(TECHS)}) falhando com erro de incompatibilidade de schema",
        lambda: f"Comunicacao gRPC entre {rpick(SERVICES)} e {rpick(SERVICES)} retornando DEADLINE_EXCEEDED - latencia de {rpick([2,5,10,30])}s",
        lambda: f"Service mesh (Istio/Linkerd) com circuit breaker abrindo para {rpick(SERVICES)} - {rpick([50,60,70,80])}% das requisicoes falhando",
        lambda: f"Event-driven: evento {rpick(['OrderCreated','PaymentProcessed','ShipmentDispatched','UserRegistered'])} publicado mas nao consumido por {rpick(SERVICES)}",
        lambda: f"Distributed tracing ({rpick(['Jaeger','Zipkin','OpenTelemetry'])}) mostrando gap no fluxo entre {rpick(SERVICES)} -> {rpick(SERVICES)} -> {rpick(SERVICES)}",
        lambda: f"API composition pattern falhando - {rpick(SERVICES)} nao consegue agregar respostas de {rpick(SERVICES)} e {rpick(SERVICES)}",
        lambda: f"Choreography saga entre {rpick(SERVICES)} e {rpick(SERVICES)} e {rpick(SERVICES)} com evento compensatorio nao disparando",
        lambda: f"Service discovery ({rpick(['Consul','Eureka','etcd'])}) nao registrando novas instancias do {rpick(SERVICES)} apos scale-up",
        lambda: f"Feature flag ({rpick(['LaunchDarkly','Unleash','Flagsmith','ConfigCat'])}) ativada parcialmente - {rpick(SERVICES)} com flag ON mas {rpick(SERVICES)} com flag OFF",
        lambda: f"Sidecar proxy do {rpick(SERVICES)} consumindo {rpick([30,40,50,60])}% da CPU alocada ao pod - performance degradada",
        lambda: f"Retry storm entre {rpick(SERVICES)} e {rpick(SERVICES)} gerando {rpick([10,50,100])}x mais trafego que o normal",
        lambda: f"Canary deployment do {rpick(SERVICES)} roteando {rpick([5,10,20])}% do trafego para versao com bug critico",
        lambda: f"Blue-green deployment do {rpick(SERVICES)} com ambiente green apontando para banco de {rpick(ENVS)} errado",
        lambda: f"Data consistency issue: {rpick(SERVICES)} atualizou mas {rpick(SERVICES)} nao recebeu evento de sincronizacao via {rpick(QUEUES)}",
        lambda: f"API Gateway ({rpick(['Kong','Apigee','AWS API Gateway','Nginx'])}) nao propagando headers customizados para {rpick(SERVICES)}",
        lambda: f"Microservico {rpick(SERVICES)} com {rpick([3,5,8,10])} dependencias circulares detectadas - nao consegue subir isoladamente",
        lambda: f"Cross-cutting concern: logging centralizado ({rpick(['ELK','Loki','Datadog'])}) perdendo traces do {rpick(SERVICES)} em {rpick(ENVS)}",
        lambda: f"Bulkhead pattern nao isolando falha do {rpick(SERVICES)} - thread pool compartilhado com {rpick(SERVICES)} esgotado",
        lambda: f"Cache distribuido (Redis Cluster) com inconsistencia entre nodes - {rpick(SERVICES)} lendo valor stale",
    ]
    templates_financeiro = [
        lambda: f"Falha na integracao {rpick(SERVICES)} com gateway de pagamento e servico de nota fiscal simultaneamente - pedidos travados",
        lambda: f"Reconciliacao entre {rpick(SERVICES)} e sistema bancario com {rpick([20,50,100])} transacoes nao conciliadas",
        lambda: f"Cobranca recorrente processada pelo {rpick(SERVICES)} com valor de plano antigo - divergencia financeira",
        lambda: f"Calculo de impostos no {rpick(SERVICES)} usando tabela desatualizada - impacto fiscal em {rpick([100,500,1000])} notas emitidas",
        lambda: f"Fluxo de caixa no dashboard mostrando dados inconsistentes - {rpick(SERVICES)} e {rpick(SERVICES)} com valores divergentes",
    ]
    templates_comercial = [
        lambda: f"Sincronizacao de estoque entre {rpick(SERVICES)} e marketplace {rpick(['Mercado Livre','Amazon','Shopee'])} falhando - vendas sem estoque",
        lambda: f"Campanha de marketing disparada pelo {rpick(SERVICES)} com link apontando para pagina 404 no {rpick(SERVICES)}",
        lambda: f"Integracao CRM com {rpick(SERVICES)} nao atualizando status do lead apos compra confirmada",
        lambda: f"Preco do produto divergente entre {rpick(SERVICES)} (catalogo) e {rpick(SERVICES)} (checkout) - experiencia do cliente comprometida",
        lambda: f"Logistica reversa: solicitacao de troca no {rpick(SERVICES)} nao gerando etiqueta no {rpick(SERVICES)}",
    ]
    templates_admin = [
        lambda: f"Relatorio consolidado requerendo dados de {rpick(SERVICES)} e {rpick(SERVICES)} e {rpick(SERVICES)} - timeout ao agregar",
        lambda: f"Auditoria de compliance: logs do {rpick(SERVICES)} nao seguindo formato padrao - dificultando rastreabilidade",
        lambda: f"Migracao de microservico monolitico para {rpick(SERVICES)} e {rpick(SERVICES)} com dados orfaos na base original",
        lambda: f"Configuracao de feature toggle afetando {rpick([3,5,8])} microservicos simultaneamente sem documentacao",
        lambda: f"SLA do {rpick(SERVICES)} estourado em {rpick([10,20,50])}% - impactando acordo com cliente enterprise",
    ]
    templates_seguranca = [
        lambda: f"Token de comunicacao inter-servico ({rpick(SERVICES)} -> {rpick(SERVICES)}) comprometido - necessario rotacionar todas as chaves",
        lambda: f"Vulnerabilidade de SSRF no {rpick(SERVICES)} permitindo acesso a metadata de cloud ({rpick(REGIONS)})",
        lambda: f"Secrets vazados no log do {rpick(SERVICES)} - credenciais de banco e API keys expostas no {rpick(['CloudWatch','Loki','Elasticsearch'])}",
        lambda: f"mTLS entre microservicos nao enforced - {rpick(SERVICES)} aceitando conexoes plain HTTP",
        lambda: f"Pen test revelou que {rpick(SERVICES)} permite escalacao de privilegio via manipulacao de JWT payload",
    ]
    templates_outros = [
        lambda: f"Nao sei qual servico e responsavel pelo erro que estou vendo - tela de {rpick(['checkout','perfil','busca'])} com mensagem generica",
        lambda: f"Preciso de acesso ao ambiente de {rpick(ENVS)} para investigar problema no {rpick(SERVICES)}",
        lambda: f"Documentacao da API do {rpick(SERVICES)} desatualizada - endpoints nao correspondem ao implementado",
        lambda: f"Treinamento necessario para operar o painel de monitoramento do {rpick(SERVICES)} ({rpick(['Grafana','Datadog','New Relic'])})",
        lambda: f"Duvida sobre arquitetura: qual servico devo chamar para {rpick(['validar CPF','consultar CEP','calcular frete','gerar boleto'])}?",
    ]

    all_templates = (
        [(t, "TECNICO") for t in templates_tecnico] * 3 +
        [(t, "FINANCEIRO") for t in templates_financeiro] * 2 +
        [(t, "COMERCIAL") for t in templates_comercial] * 2 +
        [(t, "ADMINISTRATIVO") for t in templates_admin] * 2 +
        [(t, "SEGURANCA") for t in templates_seguranca] * 2 +
        [(t, "OUTROS") for t in templates_outros] * 2
    )

    for i in range(1000):
        tmpl, cat = rpick(all_templates)
        t = tmpl()
        pri = rpick(["ALTA", "MEDIA", "CRITICA", "BAIXA", "ALTA", "MEDIA"])
        lines.append(f"{no_comma(t)},{cat},{pri}")
    return lines


# ===================== MAIN =====================
def main():
    all_lines = []
    generators = [
        ("Batch 1 - API/Backend errors", gen_batch1),
        ("Batch 2 - Authentication & Security", gen_batch2),
        ("Batch 3 - Database & Data", gen_batch3),
        ("Batch 4 - Payment & Financial", gen_batch4),
        ("Batch 5 - Infrastructure & DevOps", gen_batch5),
        ("Batch 6 - Queue & Messaging", gen_batch6),
        ("Batch 7 - Frontend & UX", gen_batch7),
        ("Batch 8 - Commercial & Sales", gen_batch8),
        ("Batch 9 - Administrative", gen_batch9),
        ("Batch 10 - Mixed/Complex", gen_batch10),
    ]

    for name, gen_func in generators:
        batch = gen_func()
        all_lines.extend(batch)
        print(f"[OK] {name}: {len(batch)} linhas geradas (total: {len(all_lines)})")

    # Validate: no commas in text field
    errors = 0
    for i, line in enumerate(all_lines):
        parts = line.split(",")
        if len(parts) != 3:
            print(f"[ERRO] Linha {i+1} tem {len(parts)} campos: {line[:80]}...")
            errors += 1
    if errors:
        print(f"\n[AVISO] {errors} linhas com formato incorreto!")
    else:
        print(f"\nValidacao OK: todas as {len(all_lines)} linhas com formato correto.")

    # Append to CSV
    with open(DATA_PATH, "a", encoding="utf-8") as f:
        for line in all_lines:
            f.write(line + "\n")

    print(f"\n{len(all_lines)} linhas adicionadas ao dataset: {DATA_PATH}")

    # Count total
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        total = sum(1 for _ in f)
    print(f"Total de linhas no arquivo (incluindo header): {total}")
    print(f"Total de amostras: {total - 1}")


if __name__ == "__main__":
    main()
