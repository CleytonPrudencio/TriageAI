-- Admin (senha: admin123)
INSERT INTO users (email, password, name, role) VALUES
('admin@triageai.com', '$2b$10$8OBIiTN.EP94GvPkliHDgebXnGcmFfFjUSrI3yTnTWddRTw7jBLna', 'Carlos Admin', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Agentes (senha: agent123)
INSERT INTO users (email, password, name, role) VALUES
('maria@triageai.com', '$2b$10$IXOTprAcR2lmn/QHGuQiueJSc8aeJy.JW.srI5pbYzFwuUl1Fkm9W', 'Maria Silva', 'AGENT')
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (email, password, name, role) VALUES
('joao@triageai.com', '$2b$10$IXOTprAcR2lmn/QHGuQiueJSc8aeJy.JW.srI5pbYzFwuUl1Fkm9W', 'Joao Santos', 'AGENT')
ON CONFLICT (email) DO NOTHING;

-- Clientes (senha: client123)
INSERT INTO users (email, password, name, role) VALUES
('ana@empresa.com', '$2b$10$yGVOoSzdTh0Mg6m5w4J6AuI9B1aiUjcPjeD.Ws.Ok5ZGpHZg63K3C', 'Ana Costa', 'CLIENT')
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (email, password, name, role) VALUES
('pedro@empresa.com', '$2b$10$yGVOoSzdTh0Mg6m5w4J6AuI9B1aiUjcPjeD.Ws.Ok5ZGpHZg63K3C', 'Pedro Oliveira', 'CLIENT')
ON CONFLICT (email) DO NOTHING;
