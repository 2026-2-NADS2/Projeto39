-- =============================================================================
-- EDULL-KFKA - SISTEMA DE ACOMPANHAMENTO ACADÊMICO BIMESTRAL (ENSINO FUNDAMENTAL)
-- Script DDL - Modelagem Relacional Normalizada (SQLite / Compatível SQL ANSI)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. Tabela de Usuários (Hierarquia POO: Usuario -> Administrador | Professor | Responsavel)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK (perfil IN ('ADMIN', 'PROFESSOR', 'RESPONSAVEL')),
    cpf TEXT UNIQUE,
    telefone TEXT,
    registro_funcional TEXT,
    formacao_especialidade TEXT,
    parentesco_padrao TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 2. Tabela de Alunos do Ensino Fundamental
CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    data_nascimento TEXT NOT NULL,
    serie_atual TEXT NOT NULL,
    observacoes_pedagogicas TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 3. Vínculo N:N entre Pais/Responsáveis e Alunos
-- Regra: Um responsável pode estar vinculado a mais de um aluno e um aluno pode ter mais de um responsável autorizado.
CREATE TABLE IF NOT EXISTS responsavel_aluno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    responsavel_id INTEGER NOT NULL,
    aluno_id INTEGER NOT NULL,
    parentesco TEXT NOT NULL DEFAULT 'Responsável Legal',
    autorizado_acesso INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    UNIQUE (responsavel_id, aluno_id)
);

-- 4. Áreas de Conhecimento (BNCC Ensino Fundamental)
CREATE TABLE IF NOT EXISTS areas_conhecimento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    cor TEXT NOT NULL DEFAULT '#2563eb',
    ativo INTEGER NOT NULL DEFAULT 1
);

-- 5. Disciplinas classificadas por Área de Conhecimento
CREATE TABLE IF NOT EXISTS disciplinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    carga_horaria_anual INTEGER NOT NULL DEFAULT 80,
    ativo INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (area_id) REFERENCES areas_conhecimento(id) ON DELETE RESTRICT
);

-- 6. Turmas do Ensino Fundamental
CREATE TABLE IF NOT EXISTS turmas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    serie TEXT NOT NULL,
    ano_letivo INTEGER NOT NULL DEFAULT 2026,
    turno TEXT NOT NULL CHECK (turno IN ('MANHA', 'TARDE', 'INTEGRAL')),
    sala TEXT,
    ativo INTEGER NOT NULL DEFAULT 1
);

-- 7. Matrícula / Vínculo Aluno x Turma
CREATE TABLE IF NOT EXISTS aluno_turma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    turma_id INTEGER NOT NULL,
    situacao TEXT NOT NULL DEFAULT 'CURSANDO' CHECK (situacao IN ('CURSANDO', 'TRANSFERIDO', 'CONCLUIDO', 'INATIVO')),
    data_enturmacao TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
    UNIQUE (aluno_id, turma_id)
);

-- 8. Vínculo Professor x Turma x Disciplina (que, junto a aluno_turma, materializa Professor x Disciplina x Aluno)
CREATE TABLE IF NOT EXISTS professor_turma_disciplina (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professor_id INTEGER NOT NULL,
    turma_id INTEGER NOT NULL,
    disciplina_id INTEGER NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
    UNIQUE (turma_id, disciplina_id)
);

-- 9. Tags de Classificação Pedagógica e Comportamental
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    categoria TEXT NOT NULL CHECK (categoria IN ('DESEMPENHO', 'COMPORTAMENTO', 'ASSIDUIDADE', 'PARTICIPACAO', 'RECOMENDACAO')),
    natureza TEXT NOT NULL DEFAULT 'NEUTRA' CHECK (natureza IN ('POSITIVA', 'ATENCAO', 'NEUTRA')),
    cor TEXT NOT NULL DEFAULT '#0d6efd',
    descricao TEXT,
    ativo INTEGER NOT NULL DEFAULT 1
);

-- 10. Períodos de Digitação dos 4 Bimestres e Escala de Notas
CREATE TABLE IF NOT EXISTS periodos_bimestrais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_letivo INTEGER NOT NULL,
    bimestre INTEGER NOT NULL CHECK (bimestre IN (1, 2, 3, 4)),
    rotulo TEXT NOT NULL,
    data_hora_abertura TEXT NOT NULL,
    data_hora_encerramento TEXT NOT NULL,
    nota_minima REAL NOT NULL DEFAULT 0.0,
    nota_maxima REAL NOT NULL DEFAULT 10.0,
    media_referencia REAL NOT NULL DEFAULT 6.0,
    fechado_manualmente INTEGER NOT NULL DEFAULT 0,
    UNIQUE (ano_letivo, bimestre)
);

-- 11. Acompanhamentos Acadêmicos Bimestrais
-- Regra: Cada acompanhamento está associado a um único aluno, turma, disciplina, professor, bimestre e ano letivo.
CREATE TABLE IF NOT EXISTS acompanhamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    turma_id INTEGER NOT NULL,
    disciplina_id INTEGER NOT NULL,
    professor_id INTEGER NOT NULL,
    ano_letivo INTEGER NOT NULL,
    bimestre INTEGER NOT NULL CHECK (bimestre IN (1, 2, 3, 4)),
    media REAL NOT NULL,
    frequencia_percentual REAL NOT NULL DEFAULT 100.0,
    descricao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'ENVIADO', 'DEVOLVIDO', 'PUBLICADO')),
    motivo_devolucao TEXT,
    observacao_coordenacao TEXT,
    revisado_por INTEGER,
    data_envio TEXT,
    data_revisao TEXT,
    data_publicacao TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE (aluno_id, turma_id, disciplina_id, bimestre, ano_letivo)
);

-- 12. Relação N:N entre Acompanhamento e Múltiplas Tags
CREATE TABLE IF NOT EXISTS acompanhamento_tags (
    acompanhamento_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (acompanhamento_id, tag_id),
    FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 13. Histórico de Auditoria e Rastreabilidade de Alterações
-- Regra: Identifica usuário, data/hora, estado anterior e estado posterior.
CREATE TABLE IF NOT EXISTS historico_acompanhamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acompanhamento_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    acao TEXT NOT NULL,
    status_anterior TEXT,
    status_posterior TEXT,
    estado_anterior_json TEXT,
    estado_posterior_json TEXT,
    justificativa TEXT,
    data_hora TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- 14. Registro de Ciência e Retornos/Observações do Pai/Responsável
CREATE TABLE IF NOT EXISTS interacoes_responsavel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acompanhamento_id INTEGER NOT NULL,
    responsavel_id INTEGER NOT NULL,
    ciencia_confirmada INTEGER NOT NULL DEFAULT 1,
    data_ciencia TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    observacao_responsavel TEXT,
    resposta_escola TEXT,
    respondido_por INTEGER,
    data_resposta TEXT,
    FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (respondido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE (acompanhamento_id, responsavel_id)
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_acomp_turma_disc_bim ON acompanhamentos(turma_id, disciplina_id, bimestre, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_acomp_aluno_bim ON acompanhamentos(aluno_id, bimestre, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_acomp_status ON acompanhamentos(status);
CREATE INDEX IF NOT EXISTS idx_hist_acomp ON historico_acompanhamento(acompanhamento_id);
