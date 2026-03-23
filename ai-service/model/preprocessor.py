import re
import unicodedata


STOPWORDS_PT = {
    'a', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo',
    'as', 'ate', 'com', 'como', 'da', 'das', 'de', 'dela', 'delas', 'dele',
    'deles', 'depois', 'do', 'dos', 'e', 'ela', 'elas', 'ele', 'eles', 'em',
    'entre', 'era', 'essa', 'essas', 'esse', 'esses', 'esta', 'estas', 'este',
    'estes', 'eu', 'foi', 'for', 'foram', 'ha', 'isso', 'isto', 'ja', 'la',
    'lhe', 'lhes', 'lo', 'mas', 'me', 'mesmo', 'meu', 'meus', 'minha',
    'minhas', 'muito', 'na', 'nao', 'nas', 'nem', 'no', 'nos', 'nossa',
    'nossas', 'nosso', 'nossos', 'num', 'numa', 'o', 'os', 'ou', 'para',
    'pela', 'pelas', 'pelo', 'pelos', 'por', 'qual', 'quando', 'que', 'quem',
    'sao', 'se', 'sem', 'ser', 'seu', 'seus', 'so', 'sua', 'suas', 'tambem',
    'te', 'tem', 'teu', 'teus', 'tu', 'tua', 'tuas', 'um', 'uma', 'umas',
    'uns', 'voce', 'voces', 'vos', 'pra', 'pro', 'dum', 'duma',
    'ainda', 'aqui', 'ali', 'onde', 'aonde', 'porque', 'pois',
    'entao', 'assim', 'agora', 'todo', 'toda', 'todos', 'todas',
    'mais', 'menos', 'bem', 'mal', 'sim', 'cada', 'outro', 'outra',
    'outros', 'outras', 'mim', 'ti', 'si', 'nos', 'vos',
}

# Sinonimos de dominio: mapeia termos variados para tokens padronizados
DOMAIN_SYNONYMS = {
    # Problemas tecnicos
    'bug': 'erro_tecnico',
    'crash': 'erro_tecnico',
    'travou': 'erro_tecnico',
    'travando': 'erro_tecnico',
    'caiu': 'erro_tecnico',
    'fora do ar': 'erro_tecnico',
    'offline': 'erro_tecnico',
    'instavel': 'erro_tecnico',
    'lento': 'problema_performance',
    'lentidao': 'problema_performance',
    'demora': 'problema_performance',
    'demorado': 'problema_performance',
    'timeout': 'problema_performance',
    'nao carrega': 'erro_tecnico',
    'tela branca': 'erro_tecnico',
    'erro 500': 'erro_servidor',
    'erro 404': 'erro_pagina',
    'erro 403': 'erro_permissao',
    'nullpointer': 'erro_tecnico',
    'exception': 'erro_tecnico',
    'stacktrace': 'erro_tecnico',

    # Financeiro
    'boleto': 'documento_financeiro',
    'fatura': 'documento_financeiro',
    'nota fiscal': 'documento_financeiro',
    'nf': 'documento_financeiro',
    'nfe': 'documento_financeiro',
    'cobranca': 'cobranca_financeira',
    'cobrado': 'cobranca_financeira',
    'debito': 'cobranca_financeira',
    'credito': 'pagamento_financeiro',
    'pix': 'pagamento_financeiro',
    'transferencia': 'pagamento_financeiro',
    'pagamento': 'pagamento_financeiro',
    'pagar': 'pagamento_financeiro',
    'reembolso': 'estorno_financeiro',
    'estorno': 'estorno_financeiro',
    'devolver': 'estorno_financeiro',
    'devolucao': 'estorno_financeiro',
    'desconto': 'desconto_financeiro',
    'promocao': 'desconto_financeiro',

    # Comercial
    'plano': 'plano_comercial',
    'assinatura': 'plano_comercial',
    'upgrade': 'mudanca_plano',
    'downgrade': 'mudanca_plano',
    'contratar': 'contratacao_comercial',
    'contrato': 'contratacao_comercial',
    'proposta': 'contratacao_comercial',
    'orcamento': 'contratacao_comercial',
    'cotacao': 'contratacao_comercial',
    'preco': 'valor_comercial',
    'custo': 'valor_comercial',
    'valor': 'valor_comercial',
    'demo': 'demonstracao_comercial',
    'demonstracao': 'demonstracao_comercial',
    'trial': 'demonstracao_comercial',

    # Administrativo
    'senha': 'credencial_acesso',
    'login': 'credencial_acesso',
    'acesso': 'credencial_acesso',
    'permissao': 'credencial_acesso',
    'usuario': 'conta_usuario',
    'conta': 'conta_usuario',
    'perfil': 'conta_usuario',
    'cadastro': 'cadastro_usuario',
    'cadastrar': 'cadastro_usuario',
    'registro': 'cadastro_usuario',
    'registrar': 'cadastro_usuario',
    'email': 'comunicacao_admin',
    'notificacao': 'comunicacao_admin',
    'aviso': 'comunicacao_admin',

    # Urgencia
    'urgente': 'prioridade_alta',
    'urgencia': 'prioridade_alta',
    'critico': 'prioridade_alta',
    'emergencia': 'prioridade_alta',
    'parado': 'prioridade_alta',
    'producao': 'prioridade_alta',
    'impacto': 'prioridade_alta',
    'todos usuarios': 'prioridade_alta',
    'varios clientes': 'prioridade_alta',
    'duvida': 'prioridade_baixa',
    'gostaria': 'prioridade_baixa',
    'sugestao': 'prioridade_baixa',
    'melhoria': 'prioridade_baixa',
    'quando possivel': 'prioridade_baixa',
}

# Sufixos comuns em portugues para stemming simples
SUFFIXES = [
    'amento', 'imento', 'mente', 'acao', 'icao',
    'ando', 'endo', 'indo', 'ondo',
    'avel', 'ivel', 'oso', 'osa',
    'ador', 'edor', 'idor',
    'ado', 'ido', 'ido',
    'ar', 'er', 'ir',
    'ais', 'eis', 'ois',
    'es', 'as', 'os',
]


def remove_accents(text: str) -> str:
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def simple_stem(word: str) -> str:
    """Stemming simples para portugues — remove sufixos comuns."""
    if len(word) <= 4:
        return word
    for suffix in SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[:-len(suffix)]
    return word


def expand_synonyms(text: str) -> str:
    """Expande sinonimos de dominio para tokens padronizados."""
    expanded = text
    # Processa expressoes compostas primeiro (mais longas primeiro)
    sorted_syns = sorted(DOMAIN_SYNONYMS.keys(), key=len, reverse=True)
    for term in sorted_syns:
        if term in expanded:
            expanded = expanded.replace(term, f"{term} {DOMAIN_SYNONYMS[term]}")
    return expanded


def preprocess(text: str, use_stemming: bool = True, use_synonyms: bool = True) -> str:
    text = text.lower()
    text = remove_accents(text)

    # Expande sinonimos antes de limpar
    if use_synonyms:
        text = expand_synonyms(text)

    # Mantem numeros (podem ser codigos de erro, IDs)
    text = re.sub(r'[^a-z0-9_\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    words = text.split()
    words = [w for w in words if w not in STOPWORDS_PT and len(w) > 2]

    # Aplica stemming simples
    if use_stemming:
        words = [simple_stem(w) for w in words]

    return ' '.join(words)
