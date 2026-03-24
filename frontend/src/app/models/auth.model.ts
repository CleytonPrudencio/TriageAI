export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nomeEmpresa: string;
  documento: string;
  name: string;
  email: string;
  password: string;
  telefone?: string;
  plano: string;
}

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
  role: string;
}
