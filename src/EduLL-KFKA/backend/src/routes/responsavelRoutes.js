const express = require('express');
const { getDb, carregarGrafoVinculos } = require('../database/db');
const { autenticar, exigirPerfil } = require('../middlewares/auth');
const { GrafoVinculosEscolares } = require('../structures/DataStructures');
const {
  listarAcompanhamentosDetalhados,
  registrarHistoricoAuditoria,
} = require('../services/acompanhamentoService');

const router = express.Router();

// Todas as rotas deste módulo exigem perfil RESPONSAVEL
router.use(autenticar, exigirPerfil('RESPONSAVEL'));

/**
 * GET /api/responsavel/painel
 * Retorna os alunos vinculados ao responsável e somente os relatórios PUBLICADOS.
 */
router.get('/painel', (req, res) => {
  const db = getDb();
  const responsavelId = req.usuario.id;

  const alunosVinculados = db
    .prepare(
      `
      SELECT
        al.id,
        al.matricula,
        al.nome,
        al.data_nascimento,
        al.serie_atual,
        al.observacoes_pedagogicas,
        ra.parentesco,
        t.id AS turma_id,
        t.codigo AS turma_codigo,
        t.nome AS turma_nome,
        t.ano_letivo,
        t.turno,
        t.sala
      FROM responsavel_aluno ra
      JOIN alunos al ON al.id = ra.aluno_id AND al.ativo = 1
      LEFT JOIN aluno_turma at ON at.aluno_id = al.id AND at.situacao = 'CURSANDO'
      LEFT JOIN turmas t ON t.id = at.turma_id
      WHERE ra.responsavel_id = ? AND ra.autorizado_acesso = 1
      ORDER BY al.nome ASC
    `
    )
    .all(responsavelId);

  const alunosIds = alunosVinculados.map((a) => a.id);
  const grafo = carregarGrafoVinculos(GrafoVinculosEscolares);

  let relatoriosPublicados = [];
  if (alunosIds.length > 0) {
    const candidatos = listarAcompanhamentosDetalhados({
      alunos_ids: alunosIds,
      status: 'PUBLICADO',
    });

    // Filtro polimórfico adicional (POO: Responsavel.podeVisualizarAcompanhamento)
    relatoriosPublicados = candidatos.filter((ac) =>
      req.usuario.podeVisualizarAcompanhamento(ac, {
        grafoVinculos: grafo,
        alunosVinculadosIds: alunosIds,
      })
    );
  }

  return res.json({
    responsavel: req.usuario.paraJSON(),
    alunos: alunosVinculados,
    relatoriosPublicados,
  });
});

/**
 * GET /api/responsavel/relatorios
 * Consulta relatórios publicados filtrando por aluno_id, ano_letivo, bimestre e disciplina_id.
 */
router.get('/relatorios', (req, res) => {
  const db = getDb();
  const responsavelId = req.usuario.id;
  const { aluno_id, ano_letivo, bimestre, disciplina_id } = req.query;

  const vinculos = db
    .prepare(
      'SELECT aluno_id FROM responsavel_aluno WHERE responsavel_id = ? AND autorizado_acesso = 1'
    )
    .all(responsavelId);
  const alunosIds = vinculos.map((v) => v.aluno_id);

  if (alunosIds.length === 0) {
    return res.json([]);
  }

  if (aluno_id && !alunosIds.includes(Number(aluno_id))) {
    return res
      .status(403)
      .json({ erro: 'Você não possui vínculo autorizado para consultar este aluno.' });
  }

  const lista = listarAcompanhamentosDetalhados({
    alunos_ids: aluno_id ? [Number(aluno_id)] : alunosIds,
    ano_letivo: ano_letivo || undefined,
    bimestre: bimestre || undefined,
    disciplina_id: disciplina_id || undefined,
    status: 'PUBLICADO',
  });

  return res.json(lista);
});

/**
 * POST /api/responsavel/acompanhamentos/:id/ciencia
 * Registra ciência do Pai/Responsável sobre o relatório publicado e encaminha
 * eventual observação ao professor e à administração escolar.
 */
router.post('/acompanhamentos/:id/ciencia', (req, res) => {
  const acompanhamentoId = Number(req.params.id);
  const responsavelId = req.usuario.id;
  const { observacao_responsavel } = req.body;

  const existentes = listarAcompanhamentosDetalhados({ id: acompanhamentoId });
  if (existentes.length === 0) {
    return res.status(404).json({ erro: 'Relatório não encontrado.' });
  }
  const ac = existentes[0];

  const grafo = carregarGrafoVinculos(GrafoVinculosEscolares);
  if (!req.usuario.podeVisualizarAcompanhamento(ac, { grafoVinculos: grafo })) {
    return res.status(403).json({
      erro: 'Acesso negado: Você só pode registrar ciência em relatórios publicados de alunos vinculados ao seu cadastro.',
    });
  }

  const db = getDb();
  db.prepare(
    `
    INSERT INTO interacoes_responsavel (
      acompanhamento_id, responsavel_id, ciencia_confirmada, data_ciencia, observacao_responsavel
    ) VALUES (?, ?, 1, datetime('now', 'localtime'), ?)
    ON CONFLICT(acompanhamento_id, responsavel_id)
    DO UPDATE SET
      ciencia_confirmada = 1,
      data_ciencia = datetime('now', 'localtime'),
      observacao_responsavel = COALESCE(excluded.observacao_responsavel, interacoes_responsavel.observacao_responsavel)
  `
  ).run(acompanhamentoId, responsavelId, observacao_responsavel ? observacao_responsavel.trim() : null);

  registrarHistoricoAuditoria({
    acompanhamentoId,
    usuarioId: responsavelId,
    acao: 'CIENCIA_RESPONSAVEL',
    statusAnterior: 'PUBLICADO',
    statusPosterior: 'PUBLICADO',
    estadoAnteriorObj: { ciencia_confirmada: false },
    estadoPosteriorObj: {
      ciencia_confirmada: true,
      observacao_responsavel: observacao_responsavel || null,
    },
    justificativa: observacao_responsavel
      ? `Ciência registrada pelo responsável com observação: "${observacao_responsavel.trim()}"`
      : 'Ciência de leitura confirmada pelo responsável.',
  });

  return res.json(listarAcompanhamentosDetalhados({ id: acompanhamentoId })[0]);
});

module.exports = router;
