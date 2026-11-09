-- Views do banco de dados do KFKA (SQLite)
-- Para recriar, basta rodar o arquivo de novo: o DROP VIEW cuida de apagar a versão antiga.

-- VIEW 1: relatórios publicados que o responsável pode ver
DROP VIEW IF EXISTS vw_relatorio_publicado_responsavel;
CREATE VIEW vw_relatorio_publicado_responsavel AS
SELECT
    ra.responsavel_id,
    a.id AS aluno_id,
    a.matricula,
    a.nome AS aluno,
    t.nome AS turma,
    ac.ano_letivo,
    ac.bimestre,
    ar.nome AS area_conhecimento,
    d.nome AS disciplina,
    p.nome AS professor,
    ac.media,
    pb.media_referencia,
    CASE WHEN ac.media >= pb.media_referencia
         THEN 'Acima da referência'
         ELSE 'Abaixo da referência' END AS situacao_media,
    ac.frequencia_percentual,
    ac.descricao,
    (SELECT GROUP_CONCAT(tg.nome, ', ')
       FROM acompanhamento_tags at
       JOIN tags tg ON tg.id = at.tag_id
      WHERE at.acompanhamento_id = ac.id) AS tags,
    ac.data_publicacao,
    ir.ciencia_confirmada,
    ir.data_ciencia
FROM acompanhamentos ac
JOIN alunos a ON a.id = ac.aluno_id
JOIN turmas t ON t.id = ac.turma_id
JOIN disciplinas d ON d.id = ac.disciplina_id
JOIN areas_conhecimento ar ON ar.id = d.area_id
JOIN usuarios p ON p.id = ac.professor_id
JOIN periodos_bimestrais pb ON pb.ano_letivo = ac.ano_letivo
                           AND pb.bimestre = ac.bimestre
JOIN responsavel_aluno ra ON ra.aluno_id = a.id
                         AND ra.autorizado_acesso = 1
LEFT JOIN interacoes_responsavel ir ON ir.acompanhamento_id = ac.id
                                   AND ir.responsavel_id = ra.responsavel_id
WHERE ac.status = 'PUBLICADO';

-- VIEW 2: indicadores por turma, disciplina e bimestre (visão do administrador)
DROP VIEW IF EXISTS vw_indicadores_turma_disciplina;
CREATE VIEW vw_indicadores_turma_disciplina AS
SELECT
    t.nome AS turma,
    d.nome AS disciplina,
    p.nome AS professor,
    ac.ano_letivo,
    ac.bimestre,
    COUNT(*) AS total_registros,
    SUM(ac.status = 'PUBLICADO') AS publicados,
    SUM(ac.status = 'ENVIADO') AS aguardando_revisao,
    SUM(ac.status = 'DEVOLVIDO') AS devolvidos,
    SUM(ac.status = 'RASCUNHO') AS rascunhos,
    ROUND(AVG(ac.media), 2) AS media_geral,
    MIN(ac.media) AS menor_media,
    MAX(ac.media) AS maior_media,
    SUM(ac.media < pb.media_referencia) AS alunos_abaixo_referencia,
    ROUND(AVG(ac.frequencia_percentual), 1) AS frequencia_media
FROM acompanhamentos ac
JOIN turmas t ON t.id = ac.turma_id
JOIN disciplinas d ON d.id = ac.disciplina_id
JOIN usuarios p ON p.id = ac.professor_id
JOIN periodos_bimestrais pb ON pb.ano_letivo = ac.ano_letivo
                           AND pb.bimestre = ac.bimestre
GROUP BY t.id, d.id, p.id, ac.ano_letivo, ac.bimestre;

-- VIEW 3: histórico de alterações de cada acompanhamento
DROP VIEW IF EXISTS vw_auditoria_acompanhamento;
CREATE VIEW vw_auditoria_acompanhamento AS
SELECT
    h.id AS historico_id,
    h.acompanhamento_id,
    a.nome AS aluno,
    d.nome AS disciplina,
    ac.bimestre,
    u.nome AS usuario,
    u.perfil AS perfil_usuario,
    h.acao,
    h.status_anterior,
    h.status_posterior,
    h.justificativa,
    h.data_hora
FROM historico_acompanhamento h
JOIN acompanhamentos ac ON ac.id = h.acompanhamento_id
JOIN alunos a ON a.id = ac.aluno_id
JOIN disciplinas d ON d.id = ac.disciplina_id
JOIN usuarios u ON u.id = h.usuario_id;
