const { getDb } = require('../database/db');
const { PilhaHistorico, FilaRevisao } = require('../structures/DataStructures');
const { PeriodoBimestral } = require('../domain/Entities');

/**
 * Busca um ou múltiplos acompanhamentos enriquecidos com dados de Aluno, Turma,
 * Disciplina, Área, Professor, Tags e Interações dos Responsáveis.
 */
function listarAcompanhamentosDetalhados(filtros = {}) {
  const db = getDb();
  const where = ['1 = 1'];
  const params = [];

  if (filtros.id) {
    where.push('ac.id = ?');
    params.push(Number(filtros.id));
  }
  if (filtros.aluno_id) {
    where.push('ac.aluno_id = ?');
    params.push(Number(filtros.aluno_id));
  }
  if (filtros.turma_id) {
    where.push('ac.turma_id = ?');
    params.push(Number(filtros.turma_id));
  }
  if (filtros.disciplina_id) {
    where.push('ac.disciplina_id = ?');
    params.push(Number(filtros.disciplina_id));
  }
  if (filtros.professor_id) {
    where.push('ac.professor_id = ?');
    params.push(Number(filtros.professor_id));
  }
  if (filtros.ano_letivo) {
    where.push('ac.ano_letivo = ?');
    params.push(Number(filtros.ano_letivo));
  }
  if (filtros.bimestre) {
    where.push('ac.bimestre = ?');
    params.push(Number(filtros.bimestre));
  }
  if (filtros.status) {
    where.push('ac.status = ?');
    params.push(filtros.status);
  }
  if (Array.isArray(filtros.alunos_ids) && filtros.alunos_ids.length > 0) {
    const placeholders = filtros.alunos_ids.map(() => '?').join(',');
    where.push(`ac.aluno_id IN (${placeholders})`);
    params.push(...filtros.alunos_ids.map(Number));
  }

  const sql = `
    SELECT
      ac.*,
      al.nome AS aluno_nome,
      al.matricula AS aluno_matricula,
      al.serie_atual AS aluno_serie,
      t.nome AS turma_nome,
      t.codigo AS turma_codigo,
      t.serie AS turma_serie,
      t.turno AS turma_turno,
      d.nome AS disciplina_nome,
      d.codigo AS disciplina_codigo,
      ar.nome AS area_nome,
      ar.cor AS area_cor,
      prof.nome AS professor_nome,
      prof.email AS professor_email,
      rev.nome AS revisor_nome
    FROM acompanhamentos ac
    JOIN alunos al ON al.id = ac.aluno_id
    JOIN turmas t ON t.id = ac.turma_id
    JOIN disciplinas d ON d.id = ac.disciplina_id
    JOIN areas_conhecimento ar ON ar.id = d.area_id
    JOIN usuarios prof ON prof.id = ac.professor_id
    LEFT JOIN usuarios rev ON rev.id = ac.revisado_por
    WHERE ${where.join(' AND ')}
    ORDER BY ac.ano_letivo DESC, ac.bimestre ASC, t.nome ASC, al.nome ASC, d.nome ASC
  `;

  const rows = db.prepare(sql).all(...params);
  if (rows.length === 0) return [];

  const stmtTags = db.prepare(`
    SELECT tg.id, tg.nome, tg.categoria, tg.natureza, tg.cor
    FROM acompanhamento_tags atg
    JOIN tags tg ON tg.id = atg.tag_id
    WHERE atg.acompanhamento_id = ?
    ORDER BY tg.nome ASC
  `);

  const stmtInteracoes = db.prepare(`
    SELECT
      ir.*,
      u.nome AS responsavel_nome,
      u.email AS responsavel_email,
      resp_esc.nome AS respondido_por_nome
    FROM interacoes_responsavel ir
    JOIN usuarios u ON u.id = ir.responsavel_id
    LEFT JOIN usuarios resp_esc ON resp_esc.id = ir.respondido_por
    WHERE ir.acompanhamento_id = ?
    ORDER BY ir.data_ciencia DESC
  `);

  let resultado = rows.map((row) => {
    const tags = stmtTags.all(row.id);
    const interacoes = stmtInteracoes.all(row.id);
    return {
      ...row,
      tags,
      tagsIds: tags.map((t) => t.id),
      interacoes,
    };
  });

  if (filtros.tag_id) {
    const tagAlvo = Number(filtros.tag_id);
    resultado = resultado.filter((r) => r.tagsIds.includes(tagAlvo));
  }

  return resultado;
}

/**
 * Utiliza a estrutura de dados PilhaHistorico (Stack LIFO) para retornar
 * a trilha de auditoria e rastreabilidade de um acompanhamento.
 */
function obterPilhaHistoricoAcompanhamento(acompanhamentoId) {
  const db = getDb();
  const eventos = db
    .prepare(
      `
      SELECT
        h.*,
        u.nome AS usuario_nome,
        u.perfil AS usuario_perfil,
        u.email AS usuario_email
      FROM historico_acompanhamento h
      JOIN usuarios u ON u.id = h.usuario_id
      WHERE h.acompanhamento_id = ?
      ORDER BY h.id ASC
    `
    )
    .all(Number(acompanhamentoId));

  const pilha = new PilhaHistorico();
  for (const ev of eventos) {
    pilha.empilhar({
      ...ev,
      estado_anterior: ev.estado_anterior_json ? JSON.parse(ev.estado_anterior_json) : null,
      estado_posterior: ev.estado_posterior_json ? JSON.parse(ev.estado_posterior_json) : null,
    });
  }

  return pilha.paraArrayLIFO();
}

/**
 * Utiliza a estrutura de dados FilaRevisao (Queue FIFO) para organizar os
 * acompanhamentos com status ENVIADO por ordem de chegada para o Administrador.
 */
function obterFilaRevisaoAdministrativa(anoLetivo = 2026, bimestre = null) {
  const enviados = listarAcompanhamentosDetalhados({
    status: 'ENVIADO',
    ano_letivo: anoLetivo,
    bimestre: bimestre || undefined,
  });

  // Ordena por data_envio ascendente (FIFO - primeiro enviado é o primeiro da fila)
  enviados.sort((a, b) => {
    const da = a.data_envio || a.atualizado_em || '';
    const db = b.data_envio || b.atualizado_em || '';
    return da.localeCompare(db);
  });

  const fila = new FilaRevisao();
  for (const item of enviados) {
    fila.enfileirar(item);
  }
  return {
    tamanhoFila: fila.tamanho,
    proximoDaFila: fila.frente(),
    itensFila: fila.paraArray(),
  };
}

/**
 * Registra um evento de auditoria na tabela historico_acompanhamento
 */
function registrarHistoricoAuditoria({
  acompanhamentoId,
  usuarioId,
  acao,
  statusAnterior,
  statusPosterior,
  estadoAnteriorObj,
  estadoPosteriorObj,
  justificativa,
}) {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO historico_acompanhamento (
      acompanhamento_id, usuario_id, acao, status_anterior, status_posterior,
      estado_anterior_json, estado_posterior_json, justificativa
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    Number(acompanhamentoId),
    Number(usuarioId),
    acao,
    statusAnterior || null,
    statusPosterior || null,
    estadoAnteriorObj ? JSON.stringify(estadoAnteriorObj) : null,
    estadoPosteriorObj ? JSON.stringify(estadoPosteriorObj) : null,
    justificativa || null
  );
}

/**
 * Obtém os períodos bimestrais enriquecidos com a classe de domínio PeriodoBimestral
 */
function listarPeriodosBimestrais(anoLetivo = 2026) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM periodos_bimestrais WHERE ano_letivo = ? ORDER BY bimestre ASC')
    .all(Number(anoLetivo));

  const agora = new Date();
  return rows.map((r) => {
    const dominio = new PeriodoBimestral(r);
    return {
      ...r,
      esta_aberto: dominio.estaAbertoParaDigitacao(agora),
    };
  });
}

module.exports = {
  listarAcompanhamentosDetalhados,
  obterPilhaHistoricoAcompanhamento,
  obterFilaRevisaoAdministrativa,
  registrarHistoricoAuditoria,
  listarPeriodosBimestrais,
};
