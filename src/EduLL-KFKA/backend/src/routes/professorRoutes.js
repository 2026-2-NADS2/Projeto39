const express = require('express');
const { getDb, carregarGrafoVinculos } = require('../database/db');
const { autenticar, exigirPerfil } = require('../middlewares/auth');
const {
  RegraNegocioError,
  PeriodoBimestral,
  AcompanhamentoBimestral,
} = require('../domain/Entities');
const { GrafoVinculosEscolares } = require('../structures/DataStructures');
const {
  listarAcompanhamentosDetalhados,
  obterPilhaHistoricoAcompanhamento,
  registrarHistoricoAuditoria,
  listarPeriodosBimestrais,
} = require('../services/acompanhamentoService');

const router = express.Router();

// Todas as rotas deste módulo exigem perfil PROFESSOR
router.use(autenticar, exigirPerfil('PROFESSOR'));

/**
 * GET /api/professor/painel
 * Retorna apenas as turmas, disciplinas e alunos aos quais o professor está vinculado,
 * além dos períodos de digitação dos 4 bimestres e tags disponíveis.
 */
router.get('/painel', (req, res) => {
  const db = getDb();
  const professorId = req.usuario.id;

  const atribuicoes = db
    .prepare(
      `
      SELECT
        ptd.id AS vinculo_id,
        t.id AS turma_id,
        t.codigo AS turma_codigo,
        t.nome AS turma_nome,
        t.serie AS turma_serie,
        t.ano_letivo,
        t.turno,
        t.sala,
        d.id AS disciplina_id,
        d.codigo AS disciplina_codigo,
        d.nome AS disciplina_nome,
        ar.nome AS area_nome,
        ar.cor AS area_cor
      FROM professor_turma_disciplina ptd
      JOIN turmas t ON t.id = ptd.turma_id AND t.ativo = 1
      JOIN disciplinas d ON d.id = ptd.disciplina_id AND d.ativo = 1
      JOIN areas_conhecimento ar ON ar.id = d.area_id
      WHERE ptd.professor_id = ? AND ptd.ativo = 1
      ORDER BY t.nome ASC, d.nome ASC
    `
    )
    .all(professorId);

  const stmtAlunosTurma = db.prepare(`
    SELECT al.id, al.matricula, al.nome, al.serie_atual, al.observacoes_pedagogicas
    FROM aluno_turma at
    JOIN alunos al ON al.id = at.aluno_id
    WHERE at.turma_id = ? AND at.situacao = 'CURSANDO' AND al.ativo = 1
    ORDER BY al.nome ASC
  `);

  const atribuicoesComAlunos = atribuicoes.map((atrib) => ({
    ...atrib,
    alunos: stmtAlunosTurma.all(atrib.turma_id),
  }));

  const tagsAtivas = db
    .prepare('SELECT * FROM tags WHERE ativo = 1 ORDER BY categoria ASC, nome ASC')
    .all();

  const periodos = listarPeriodosBimestrais(2026);
  const acompanhamentos = listarAcompanhamentosDetalhados({
    professor_id: professorId,
    ano_letivo: 2026,
  });

  // Retornos dos responsáveis em acompanhamentos deste professor
  const retornosResponsaveis = [];
  for (const ac of acompanhamentos) {
    for (const inter of ac.interacoes || []) {
      retornosResponsaveis.push({
        ...inter,
        aluno_nome: ac.aluno_nome,
        turma_nome: ac.turma_nome,
        disciplina_nome: ac.disciplina_nome,
        bimestre: ac.bimestre,
        media: ac.media,
      });
    }
  }

  return res.json({
    professor: req.usuario.paraJSON(),
    atribuicoes: atribuicoesComAlunos,
    tagsAtivas,
    periodos,
    acompanhamentos,
    retornosResponsaveis,
  });
});

/**
 * GET /api/professor/acompanhamentos
 */
router.get('/acompanhamentos', (req, res) => {
  const { turma_id, disciplina_id, bimestre, status, ano_letivo } = req.query;
  const lista = listarAcompanhamentosDetalhados({
    professor_id: req.usuario.id,
    ano_letivo: ano_letivo || 2026,
    turma_id,
    disciplina_id,
    bimestre,
    status,
  });
  return res.json(lista);
});

/**
 * GET /api/professor/acompanhamentos/:id/historico
 */
router.get('/acompanhamentos/:id/historico', (req, res) => {
  const id = Number(req.params.id);
  const existentes = listarAcompanhamentosDetalhados({ id, professor_id: req.usuario.id });
  if (existentes.length === 0) {
    return res
      .status(404)
      .json({ erro: 'Acompanhamento não encontrado ou não vinculado a este professor.' });
  }
  return res.json(obterPilhaHistoricoAcompanhamento(id));
});

/**
 * POST /api/professor/acompanhamentos
 * Cria ou salva acompanhamento bimestral (como RASCUNHO ou ENVIADO), validando:
 * 1) Vínculo Professor × Turma × Disciplina × Aluno via GrafoVinculosEscolares;
 * 2) Período de digitação aberto do bimestre via PeriodoBimestral;
 * 3) Escala de notas da escola via PeriodoBimestral.
 */
router.post('/acompanhamentos', (req, res) => {
  try {
    const db = getDb();
    const professorId = req.usuario.id;
    const {
      aluno_id,
      turma_id,
      disciplina_id,
      bimestre,
      ano_letivo = 2026,
      media,
      frequencia_percentual = 100,
      descricao,
      tagsIds = [],
      enviarParaRevisao = false,
    } = req.body;

    // 1. Valida vínculo em O(1) usando GrafoVinculosEscolares
    const grafo = carregarGrafoVinculos(GrafoVinculosEscolares);
    const possuiVinculo = grafo.professorLecionaParaAluno(
      professorId,
      Number(turma_id),
      Number(disciplina_id),
      Number(aluno_id)
    );
    if (!possuiVinculo) {
      throw new RegraNegocioError(
        'Acesso negado: Você somente pode registrar acompanhamentos para turmas, disciplinas e alunos aos quais está vinculado.',
        403
      );
    }

    // 2. Valida período de digitação do bimestre e escala de notas
    const periodoRow = db
      .prepare('SELECT * FROM periodos_bimestrais WHERE ano_letivo = ? AND bimestre = ?')
      .get(Number(ano_letivo), Number(bimestre));
    if (!periodoRow) {
      throw new RegraNegocioError(
        `Período do ${bimestre}º Bimestre/${ano_letivo} não configurado pela Administração.`
      );
    }
    const periodo = new PeriodoBimestral(periodoRow);
    periodo.validarPeriodoAberto(new Date());

    // Verifica se já existe registro para este (aluno, turma, disciplina, bimestre, ano_letivo)
    const existenteRow = db
      .prepare(
        `
        SELECT id FROM acompanhamentos
        WHERE aluno_id = ? AND turma_id = ? AND disciplina_id = ? AND bimestre = ? AND ano_letivo = ?
      `
      )
      .get(
        Number(aluno_id),
        Number(turma_id),
        Number(disciplina_id),
        Number(bimestre),
        Number(ano_letivo)
      );

    if (existenteRow) {
      return res.status(400).json({
        erro: 'Já existe um acompanhamento registrado para este aluno nesta disciplina e bimestre. Utilize a opção de editar.',
      });
    }

    const entidade = new AcompanhamentoBimestral({
      aluno_id,
      turma_id,
      disciplina_id,
      professor_id: professorId,
      ano_letivo,
      bimestre,
      media,
      frequencia_percentual,
      descricao,
      status: 'RASCUNHO',
      tagsIds,
    });

    entidade.validarDadosObrigatorios(periodo);
    if (enviarParaRevisao) {
      entidade.enviarParaRevisao();
    }

    let novoId;
    db.exec('BEGIN TRANSACTION;');
    try {
      const info = db
        .prepare(
          `
          INSERT INTO acompanhamentos (
            aluno_id, turma_id, disciplina_id, professor_id, ano_letivo, bimestre,
            media, frequencia_percentual, descricao, status, data_envio
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          entidade.alunoId,
          entidade.turmaId,
          entidade.disciplinaId,
          entidade.professorId,
          entidade.anoLetivo,
          entidade.bimestre,
          entidade.media,
          entidade.frequenciaPercentual,
          entidade.descricao,
          entidade.status,
          entidade.status === 'ENVIADO' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
        );

      novoId = info.lastInsertRowid;

      const stmtTag = db.prepare(
        'INSERT OR IGNORE INTO acompanhamento_tags (acompanhamento_id, tag_id) VALUES (?, ?)'
      );
      for (const tid of entidade.tagsIds) {
        stmtTag.run(novoId, Number(tid));
      }

      registrarHistoricoAuditoria({
        acompanhamentoId: novoId,
        usuarioId: professorId,
        acao: enviarParaRevisao ? 'ENVIO_REVISAO' : 'CRIACAO_RASCUNHO',
        statusAnterior: null,
        statusPosterior: entidade.status,
        estadoAnteriorObj: null,
        estadoPosteriorObj: entidade.gerarSnapshotEstado(),
        justificativa: enviarParaRevisao
          ? 'Acompanhamento registrado e enviado pelo professor para revisão administrativa.'
          : 'Rascunho inicial salvo pelo professor.',
      });

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    return res.status(201).json(listarAcompanhamentosDetalhados({ id: novoId })[0]);
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(400).json({ erro: err.message });
  }
});

/**
 * PUT /api/professor/acompanhamentos/:id
 * Edita rascunho ou acompanhamento devolvido para ajustes dentro do prazo autorizado.
 */
router.put('/acompanhamentos/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const professorId = req.usuario.id;
    const {
      media,
      frequencia_percentual,
      descricao,
      tagsIds,
      enviarParaRevisao = false,
    } = req.body;

    const db = getDb();
    const existentes = listarAcompanhamentosDetalhados({ id, professor_id: professorId });
    if (existentes.length === 0) {
      return res
        .status(404)
        .json({ erro: 'Acompanhamento não encontrado ou não pertence às suas turmas.' });
    }
    const atual = existentes[0];

    const periodoRow = db
      .prepare('SELECT * FROM periodos_bimestrais WHERE ano_letivo = ? AND bimestre = ?')
      .get(atual.ano_letivo, atual.bimestre);
    const periodo = new PeriodoBimestral(periodoRow);
    periodo.validarPeriodoAberto(new Date());

    const entidadeAnterior = new AcompanhamentoBimestral({ ...atual, tagsIds: atual.tagsIds });
    entidadeAnterior.validarPermissaoEdicaoProfessor();
    const estadoAnteriorObj = entidadeAnterior.gerarSnapshotEstado();

    const entidadeNova = new AcompanhamentoBimestral({
      ...atual,
      media: media !== undefined ? media : atual.media,
      frequencia_percentual:
        frequencia_percentual !== undefined ? frequencia_percentual : atual.frequencia_percentual,
      descricao: descricao !== undefined ? descricao : atual.descricao,
      tagsIds: Array.isArray(tagsIds) ? tagsIds : atual.tagsIds,
    });

    entidadeNova.validarDadosObrigatorios(periodo);
    if (enviarParaRevisao) {
      entidadeNova.enviarParaRevisao();
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(
        `
        UPDATE acompanhamentos
        SET media = ?, frequencia_percentual = ?, descricao = ?, status = ?,
            data_envio = CASE WHEN ? = 'ENVIADO' THEN datetime('now', 'localtime') ELSE data_envio END,
            atualizado_em = datetime('now', 'localtime')
        WHERE id = ?
      `
      ).run(
        entidadeNova.media,
        entidadeNova.frequenciaPercentual,
        entidadeNova.descricao,
        entidadeNova.status,
        entidadeNova.status,
        id
      );

      if (Array.isArray(tagsIds)) {
        db.prepare('DELETE FROM acompanhamento_tags WHERE acompanhamento_id = ?').run(id);
        const stmtTag = db.prepare(
          'INSERT OR IGNORE INTO acompanhamento_tags (acompanhamento_id, tag_id) VALUES (?, ?)'
        );
        for (const tid of entidadeNova.tagsIds) {
          stmtTag.run(id, Number(tid));
        }
      }

      registrarHistoricoAuditoria({
        acompanhamentoId: id,
        usuarioId: professorId,
        acao: enviarParaRevisao ? 'ENVIO_REVISAO' : 'ATUALIZACAO_PROFESSOR',
        statusAnterior: atual.status,
        statusPosterior: entidadeNova.status,
        estadoAnteriorObj,
        estadoPosteriorObj: entidadeNova.gerarSnapshotEstado(),
        justificativa: enviarParaRevisao
          ? atual.status === 'DEVOLVIDO'
            ? 'Ajustes realizados pelo professor após devolução e reenviado para revisão.'
            : 'Enviado pelo professor para revisão administrativa.'
          : 'Rascunho atualizado pelo professor.',
      });

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    return res.json(listarAcompanhamentosDetalhados({ id })[0]);
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(400).json({ erro: err.message });
  }
});

/**
 * POST /api/professor/interacoes/:id/responder
 * Permite ao professor responder a uma observação encaminhada pelo Pai/Responsável.
 */
router.post('/interacoes/:id/responder', (req, res) => {
  const interacaoId = Number(req.params.id);
  const { resposta_escola } = req.body;
  if (!resposta_escola || !resposta_escola.trim()) {
    return res.status(400).json({ erro: 'Digite uma mensagem de retorno para a família.' });
  }

  const db = getDb();
  const interacao = db
    .prepare(
      `
      SELECT ir.*, ac.professor_id
      FROM interacoes_responsavel ir
      JOIN acompanhamentos ac ON ac.id = ir.acompanhamento_id
      WHERE ir.id = ?
    `
    )
    .get(interacaoId);

  if (!interacao || Number(interacao.professor_id) !== Number(req.usuario.id)) {
    return res.status(404).json({ erro: 'Interação não encontrada para suas turmas.' });
  }

  db.prepare(
    `
    UPDATE interacoes_responsavel
    SET resposta_escola = ?, respondido_por = ?, data_resposta = datetime('now', 'localtime')
    WHERE id = ?
  `
  ).run(resposta_escola.trim(), req.usuario.id, interacaoId);

  return res.json({ atualizado: true });
});

module.exports = router;
