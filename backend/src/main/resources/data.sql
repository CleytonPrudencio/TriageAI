-- Admin (senha: admin123)
INSERT INTO users (email, password, name, role) VALUES
('admin@triageai.com', '$2a$10$pYKNBsMycL1JL.i7RLfjauuq/W3cyauhQ5Y5uF.fzAGPHtXOaaUUu', 'Carlos Admin', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Agentes (senha: agente123)
INSERT INTO users (email, password, name, role) VALUES
('maria@triageai.com', '$2a$10$tQxDWRBjLQq.YLbxoz4j4.LRm7ibC1/k5beKIia.mRYcyZcY1/tr2', 'Maria Silva', 'AGENT')
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (email, password, name, role) VALUES
('joao@triageai.com', '$2a$10$tQxDWRBjLQq.YLbxoz4j4.LRm7ibC1/k5beKIia.mRYcyZcY1/tr2', 'Joao Santos', 'AGENT')
ON CONFLICT (email) DO NOTHING;

-- Clientes (senha: cliente123)
INSERT INTO users (email, password, name, role) VALUES
('ana@empresa.com', '$2a$10$h3i5tVG0kGNURIiMWl1ZA.0F3j0dMLVKZfeUuT5DoePTff0vsf8R2', 'Ana Costa', 'CLIENT')
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (email, password, name, role) VALUES
('pedro@empresa.com', '$2a$10$h3i5tVG0kGNURIiMWl1ZA.0F3j0dMLVKZfeUuT5DoePTff0vsf8R2', 'Pedro Oliveira', 'CLIENT')
ON CONFLICT (email) DO NOTHING;
