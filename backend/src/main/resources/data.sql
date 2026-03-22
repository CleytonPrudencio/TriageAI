-- Admin (senha: admin123)
INSERT INTO users (email, password, name, role) VALUES
('admin@triageai.com', '$2b$10$8OBIiTN.EP94GvPkliHDgebXnGcmFfFjUSrI3yTnTWddRTw7jBLna', 'Carlos Admin', 'ADMIN');

-- Agentes (senha: agent123)
INSERT INTO users (email, password, name, role) VALUES
('maria@triageai.com', '$2b$10$IXOTprAcR2lmn/QHGuQiueJSc8aeJy.JW.srI5pbYzFwuUl1Fkm9W', 'Maria Silva', 'AGENT'),
('joao@triageai.com', '$2b$10$IXOTprAcR2lmn/QHGuQiueJSc8aeJy.JW.srI5pbYzFwuUl1Fkm9W', 'Joao Santos', 'AGENT');

-- Clientes (senha: client123)
INSERT INTO users (email, password, name, role) VALUES
('ana@empresa.com', '$2b$10$yGVOoSzdTh0Mg6m5w4J6AuI9B1aiUjcPjeD.Ws.Ok5ZGpHZg63K3C', 'Ana Costa', 'CLIENT'),
('pedro@empresa.com', '$2b$10$yGVOoSzdTh0Mg6m5w4J6AuI9B1aiUjcPjeD.Ws.Ok5ZGpHZg63K3C', 'Pedro Oliveira', 'CLIENT');

-- Tickets de exemplo
INSERT INTO tickets (titulo, descricao, categoria, prioridade, status, ai_score, user_id, created_at) VALUES
('Sistema fora do ar', 'O sistema principal esta completamente fora do ar desde as 8h. Ninguem consegue acessar.', 'TECNICO', 'ALTA', 'ABERTO', 0.95, 4, CURRENT_TIMESTAMP),
('Erro ao gerar boleto', 'Quando tento gerar um boleto aparece erro 500 na tela de pagamentos.', 'FINANCEIRO', 'ALTA', 'ABERTO', 0.91, 4, CURRENT_TIMESTAMP),
('Duvida sobre plano', 'Gostaria de saber as opcoes de plano disponiveis para minha empresa.', 'COMERCIAL', 'BAIXA', 'ABERTO', 0.88, 5, CURRENT_TIMESTAMP),
('Lentidao no relatorio', 'O relatorio mensal esta demorando mais de 5 minutos para carregar.', 'TECNICO', 'MEDIA', 'EM_ANDAMENTO', 0.85, 4, CURRENT_TIMESTAMP),
('Nota fiscal incorreta', 'A nota fiscal do mes passado veio com valor diferente do contrato.', 'FINANCEIRO', 'MEDIA', 'ABERTO', 0.82, 5, CURRENT_TIMESTAMP),
('Solicitar acesso novo usuario', 'Preciso cadastrar um novo colaborador no sistema.', 'ADMINISTRATIVO', 'BAIXA', 'RESOLVIDO', 0.79, 4, CURRENT_TIMESTAMP),
('Integracao com ERP falhou', 'A integracao com o SAP parou de funcionar apos a ultima atualizacao.', 'TECNICO', 'ALTA', 'EM_ANDAMENTO', 0.93, 5, CURRENT_TIMESTAMP),
('Cancelamento de contrato', 'Preciso cancelar o contrato da filial de Campinas.', 'COMERCIAL', 'MEDIA', 'ABERTO', 0.77, 4, CURRENT_TIMESTAMP),
('Impressora nao funciona', 'Impressora do andar 3 nao imprime. Ja troquei o toner.', 'TECNICO', 'BAIXA', 'ABERTO', 0.74, 5, CURRENT_TIMESTAMP),
('Reembolso pendente', 'Meu reembolso de viagem de janeiro ainda nao foi processado.', 'FINANCEIRO', 'MEDIA', 'ABERTO', 0.80, 4, CURRENT_TIMESTAMP);
