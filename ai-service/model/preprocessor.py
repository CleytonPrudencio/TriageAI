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
    'uns', 'voce', 'voces', 'vos',
}


def remove_accents(text: str) -> str:
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def preprocess(text: str) -> str:
    text = text.lower()
    text = remove_accents(text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    words = [w for w in words if w not in STOPWORDS_PT and len(w) > 2]
    return ' '.join(words)
