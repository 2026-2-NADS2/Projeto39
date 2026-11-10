const express = require('express');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { getDb } = require('../database/db');
const { autenticar, exigirPerfil } = require('../middlewares/auth');
const {
  RegraNegocioError,
  PeriodoBimestral,
  AcompanhamentoBimestral,
} = require('../domain/Entities');
const { NoArvoreCurricular } = require('../structures/DataStructures');
const {
  listarAcompanhamentosDetalhados,
  obterPilhaHistoricoAcompanhamento,
  obterFilaRevisaoAdministrativa,
  registrarHistoricoAuditoria,
  listarPeriodosBimestrais,
} = require('../services/acompanhamentoService');

const router = express.Router();

// Todas as rotas deste módulo exigem perfil ADMIN
router.use(autenticar, exigirPerfil('ADMIN'));

// ============================================================================
// 1. GESTÃO DE USUÁRIOS (PROFESSORES, PAIS/RESPONSÁVEIS E ADMINISTRADORES)
// ============================================================================
router.get('/usuarios', (req, res) => {
  const db = getDb();
  const { perfil, busca, ativo } = req.query;
  const where = ['1 = 1'];
  const params = [];

  if (perfil) {
    where.push('u.perfil = ?');
    params.push(perfil);
  }
  if (ativo !== undefined && ativo !== '') {
    where.push('u.ativo = ?');
    params.push(Number(ativo));
  }
  if (busca) {
    where.push('(lower(u.nome) LIKE lower(?) OR lower(u.email) LIKE lower(?) OR u.cpf LIKE ?)');
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  const usuarios = db
    .prepare(
      `
      SELECT
        u.id, u.nome, u.email, u.perfil, u.cpf, u.telefone,
        u.registro_funcional, u.formacao_especialidade, u.parentesco_padrao,
        u.ativo, u.criado_em, u.atualizado_em
      FROM usuarios u
      WHERE ${where.join(' AND ')}
      ORDER BY u.perfil ASC, u.nome ASC
    `
    )
    .all(...params);

  // Para responsáveis, anexa alunos vinculados; para professores, anexa turmas/disciplinas
  const stmtAlunosResp = db.prepare(`
    SELECT ra.id AS vinculo_id, al.id AS aluno_id, al.nome AS aluno_nome, al.matricula, ra.parentesco
    FROM responsavel_aluno ra
    JOIN alunos al ON al.id = ra.aluno_id
    WHERE ra.responsavel_id = ?
  `);

  const stmtVinculosProf = db.prepare(`
    SELECT ptd.id AS vinculo_id, t.id AS turma_id, t.nome AS turma_nome, d.id AS disciplina_id, d.nome AS disciplina_nome
    FROM professor_turma_disciplina ptd
    JOIN turmas t ON t.id = ptd.turma_id
    JOIN disciplinas d ON d.id = ptd.disciplina_id
    WHERE ptd.professor_id = ? AND ptd.ativo = 1
  `);

  const resultado = usuarios.map((u) => ({
    ...u,
    alunos_vinculados: u.perfil === 'RESPONSAVEL' ? stmtAlunosResp.all(u.id) : [],
    atribuicoes_docentes: u.perfil === 'PROFESSOR' ? stmtVinculosProf.all(u.id) : [],
  }));

  res.json(resultado);
});

router.post('/usuarios', (req, res) => {
  try {
    const {
      nome,
      email,
      senha,
      perfil,
      cpf,
      telefone,
      registro_funcional,
      formacao_especialidade,
      parentesco_padrao,
    } = req.body;

    if (!nome || !email || !perfil) {
      return res.status(400).json({ erro: 'Nome, e-mail e perfil são obrigatórios.' });
    }
    if (!['ADMIN', 'PROFESSOR', 'RESPONSAVEL'].includes(perfil)) {
      return res.status(400).json({ erro: 'Perfil inválido.' });
    }

    const db = getDb();
    const existente = db
      .prepare('SELECT id FROM usuarios WHERE lower(email) = lower(?)')
      .get(email.trim());
    if (existente) {
      return res.status(400).json({ erro: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const senhaHash = bcrypt.hashSync(senha || '123456', 10);
    const info = db
      .prepare(
        `
        INSERT INTO usuarios (
          nome, email, senha_hash, perfil, cpf, telefone,
          registro_funcional, formacao_especialidade, parentesco_padrao, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `
      )
      .run(
        nome.trim(),
        email.trim().toLowerCase(),
        senhaHash,
        perfil,
        cpf || null,
        telefone || null,
        registro_funcional || null,
        formacao_especialidade || null,
        parentesco_padrao || null
      );

    const novo = db
      .prepare(
        'SELECT id, nome, email, perfil, cpf, telefone, registro_funcional, formacao_especialidade, parentesco_padrao, ativo FROM usuarios WHERE id = ?'
      )
      .get(info.lastInsertRowid);

    return res.status(201).json(novo);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.put('/usuarios/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      nome,
      email,
      senha,
      cpf,
      telefone,
      registro_funcional,
      formacao_especialidade,
      parentesco_padrao,
    } = req.body;

    const db = getDb();
    const atual = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    if (!atual) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const senhaHash = senha && senha.trim() ? bcrypt.hashSync(senha.trim(), 10) : atual.senha_hash;
    db.prepare(
      `
      UPDATE usuarios
      SET nome = ?, email = ?, senha_hash = ?, cpf = ?, telefone = ?,
          registro_funcional = ?, formacao_especialidade = ?, parentesco_padrao = ?,
          atualizado_em = datetime('now', 'localtime')
      WHERE id = ?
    `
    ).run(
      (nome || atual.nome).trim(),
      (email || atual.email).trim().toLowerCase(),
      senhaHash,
      cpf !== undefined ? cpf || null : atual.cpf,
      telefone !== undefined ? telefone || null : atual.telefone,
      registro_funcional !== undefined ? registro_funcional || null : atual.registro_funcional,
      formacao_especialidade !== undefined ? formacao_especialidade || null : atual.formacao_especialidade,
      parentesco_padrao !== undefined ? parentesco_padrao || null : atual.parentesco_padrao,
      id
    );

    const atualizado = db
      .prepare(
        'SELECT id, nome, email, perfil, cpf, telefone, registro_funcional, formacao_especialidade, parentesco_padrao, ativo FROM usuarios WHERE id = ?'
      )
      .get(id);
    return res.json(atualizado);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.patch('/usuarios/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { ativo } = req.body;
  const db = getDb();
  const usuario = db.prepare('SELECT id, perfil FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }
  const novoStatus = ativo !== undefined ? (ativo ? 1 : 0) : 0;
  db.prepare(
    "UPDATE usuarios SET ativo = ?, atualizado_em = datetime('now', 'localtime') WHERE id = ?"
  ).run(novoStatus, id);

  return res.json({ id, ativo: novoStatus });
});

// ============================================================================
// 2. GESTÃO DE ALUNOS E VÍNCULOS RESPONSÁVEL × ALUNO (N:N)
// ============================================================================
router.get('/alunos', (req, res) => {
  const db = getDb();
  const alunos = db.prepare('SELECT * FROM alunos ORDER BY nome ASC').all();

  const stmtTurmas = db.prepare(`
    SELECT at.id AS vinculo_id, t.id AS turma_id, t.codigo, t.nome, t.serie, t.ano_letivo, t.turno, at.situacao
    FROM aluno_turma at
    JOIN turmas t ON t.id = at.turma_id
    WHERE at.aluno_id = ?
  `);

  const stmtResponsaveis = db.prepare(`
    SELECT ra.id AS vinculo_id, u.id AS responsavel_id, u.nome, u.email, u.telefone, u.ativo, ra.parentesco, ra.autorizado_acesso
    FROM responsavel_aluno ra
    JOIN usuarios u ON u.id = ra.responsavel_id
    WHERE ra.aluno_id = ?
  `);

  const resultado = alunos.map((al) => ({
    ...al,
    turmas: stmtTurmas.all(al.id),
    responsaveis: stmtResponsaveis.all(al.id),
  }));

  res.json(resultado);
});

router.post('/alunos', (req, res) => {
  try {
    const {
      matricula,
      nome,
      data_nascimento,
      serie_atual,
      observacoes_pedagogicas,
      turma_id,
      responsaveis,
    } = req.body;

    if (!matricula || !nome || !data_nascimento || !serie_atual) {
      return res
        .status(400)
        .json({ erro: 'Matrícula, nome, data de nascimento e série são obrigatórios.' });
    }

    const db = getDb();
    const info = db
      .prepare(
        `
        INSERT INTO alunos (matricula, nome, data_nascimento, serie_atual, observacoes_pedagogicas, ativo)
        VALUES (?, ?, ?, ?, ?, 1)
      `
      )
      .run(
        matricula.trim(),
        nome.trim(),
        data_nascimento,
        serie_atual,
        observacoes_pedagogicas || null
      );

    const alunoId = info.lastInsertRowid;

    if (turma_id) {
      db.prepare(
        "INSERT OR IGNORE INTO aluno_turma (aluno_id, turma_id, situacao) VALUES (?, ?, 'CURSANDO')"
      ).run(alunoId, Number(turma_id));
    }

    if (Array.isArray(responsaveis)) {
      const stmtResp = db.prepare(
        'INSERT OR IGNORE INTO responsavel_aluno (responsavel_id, aluno_id, parentesco, autorizado_acesso) VALUES (?, ?, ?, 1)'
      );
      for (const r of responsaveis) {
        if (r.responsavel_id) {
          stmtResp.run(Number(r.responsavel_id), alunoId, r.parentesco || 'Responsável Legal');
        }
      }
    }

    const novoAluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(alunoId);
    return res.status(201).json(novoAluno);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.put('/alunos/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { matricula, nome, data_nascimento, serie_atual, observacoes_pedagogicas } = req.body;
    const db = getDb();
    const atual = db.prepare('SELECT * FROM alunos WHERE id = ?').get(id);
    if (!atual) {
      return res.status(404).json({ erro: 'Aluno não encontrado.' });
    }

    db.prepare(
      `
      UPDATE alunos
      SET matricula = ?, nome = ?, data_nascimento = ?, serie_atual = ?,
          observacoes_pedagogicas = ?, atualizado_em = datetime('now', 'localtime')
      WHERE id = ?
    `
    ).run(
      (matricula || atual.matricula).trim(),
      (nome || atual.nome).trim(),
      data_nascimento || atual.data_nascimento,
      serie_atual || atual.serie_atual,
      observacoes_pedagogicas !== undefined
        ? observacoes_pedagogicas
        : atual.observacoes_pedagogicas,
      id
    );

    const atualizado = db.prepare('SELECT * FROM alunos WHERE id = ?').get(id);
    return res.json(atualizado);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.patch('/alunos/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { ativo } = req.body;
  const db = getDb();
  const novoStatus = ativo ? 1 : 0;
  db.prepare(
    "UPDATE alunos SET ativo = ?, atualizado_em = datetime('now', 'localtime') WHERE id = ?"
  ).run(novoStatus, id);
  return res.json({ id, ativo: novoStatus });
});

router.post('/vinculos/responsavel-aluno', (req, res) => {
  try {
    const { responsavel_id, aluno_id, parentesco } = req.body;
    if (!responsavel_id || !aluno_id) {
      return res.status(400).json({ erro: 'Selecione o responsável e o aluno.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        `
        INSERT INTO responsavel_aluno (responsavel_id, aluno_id, parentesco, autorizado_acesso)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(responsavel_id, aluno_id) DO UPDATE SET parentesco = excluded.parentesco, autorizado_acesso = 1
      `
      )
      .run(Number(responsavel_id), Number(aluno_id), parentesco || 'Responsável Legal');

    return res.status(201).json({
      id: info.lastInsertRowid,
      responsavel_id: Number(responsavel_id),
      aluno_id: Number(aluno_id),
      parentesco: parentesco || 'Responsável Legal',
    });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.delete('/vinculos/responsavel-aluno/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM responsavel_aluno WHERE id = ?').run(Number(req.params.id));
  return res.json({ removido: true });
});

// ============================================================================
// 3. ÁREAS DE CONHECIMENTO E DISCIPLINAS (COM ÁRVORE CURRICULAR N-ÁRIA)
// ============================================================================
router.get('/curriculo', (_req, res) => {
  const db = getDb();
  const areas = db.prepare('SELECT * FROM areas_conhecimento ORDER BY nome ASC').all();
  const disciplinas = db
    .prepare(
      `
      SELECT d.*, a.nome AS area_nome, a.codigo AS area_codigo, a.cor AS area_cor
      FROM disciplinas d
      JOIN areas_conhecimento a ON a.id = d.area_id
      ORDER BY a.nome ASC, d.nome ASC
    `
    )
    .all();

  // Constrói a Árvore Curricular Hierárquica (Estrutura de Dados NoArvoreCurricular)
  const raiz = new NoArvoreCurricular(
    0,
    'ESCOLA',
    'Matriz Curricular - Ensino Fundamental (BNCC)'
  );

  for (const area of areas) {
    const noArea = new NoArvoreCurricular(area.id, 'AREA', area.nome, {
      codigo: area.codigo,
      cor: area.cor,
      ativo: area.ativo,
    });
    const discsDaArea = disciplinas.filter((d) => d.area_id === area.id);
    for (const disc of discsDaArea) {
      noArea.adicionarFilho(
        new NoArvoreCurricular(disc.id, 'DISCIPLINA', disc.nome, {
          codigo: disc.codigo,
          carga_horaria_anual: disc.carga_horaria_anual,
          ativo: disc.ativo,
        })
      );
    }
    raiz.adicionarFilho(noArea);
  }

  return res.json({
    areas,
    disciplinas,
    arvoreCurricular: raiz,
  });
});

router.post('/areas', (req, res) => {
  try {
    const { codigo, nome, descricao, cor } = req.body;
    if (!codigo || !nome) {
      return res.status(400).json({ erro: 'Código e nome da área são obrigatórios.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        'INSERT INTO areas_conhecimento (codigo, nome, descricao, cor, ativo) VALUES (?, ?, ?, ?, 1)'
      )
      .run(codigo.trim().toUpperCase(), nome.trim(), descricao || null, cor || '#2563eb');
    const nova = db
      .prepare('SELECT * FROM areas_conhecimento WHERE id = ?')
      .get(info.lastInsertRowid);
    return res.status(201).json(nova);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.put('/areas/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { codigo, nome, descricao, cor, ativo } = req.body;
    const db = getDb();
    const atual = db.prepare('SELECT * FROM areas_conhecimento WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Área não encontrada.' });

    db.prepare(
      'UPDATE areas_conhecimento SET codigo = ?, nome = ?, descricao = ?, cor = ?, ativo = ? WHERE id = ?'
    ).run(
      (codigo || atual.codigo).trim().toUpperCase(),
      (nome || atual.nome).trim(),
      descricao !== undefined ? descricao : atual.descricao,
      cor || atual.cor,
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    );
    return res.json(db.prepare('SELECT * FROM areas_conhecimento WHERE id = ?').get(id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.post('/disciplinas', (req, res) => {
  try {
    const { area_id, codigo, nome, carga_horaria_anual } = req.body;
    if (!area_id || !codigo || !nome) {
      return res
        .status(400)
        .json({ erro: 'Área de conhecimento, código e nome da disciplina são obrigatórios.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        'INSERT INTO disciplinas (area_id, codigo, nome, carga_horaria_anual, ativo) VALUES (?, ?, ?, ?, 1)'
      )
      .run(
        Number(area_id),
        codigo.trim().toUpperCase(),
        nome.trim(),
        Number(carga_horaria_anual || 80)
      );
    const nova = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(nova);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.put('/disciplinas/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { area_id, codigo, nome, carga_horaria_anual, ativo } = req.body;
    const db = getDb();
    const atual = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Disciplina não encontrada.' });

    db.prepare(
      'UPDATE disciplinas SET area_id = ?, codigo = ?, nome = ?, carga_horaria_anual = ?, ativo = ? WHERE id = ?'
    ).run(
      Number(area_id || atual.area_id),
      (codigo || atual.codigo).trim().toUpperCase(),
      (nome || atual.nome).trim(),
      Number(carga_horaria_anual || atual.carga_horaria_anual),
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    );
    return res.json(db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

// ============================================================================
// 4. TURMAS E VÍNCULOS PROFESSOR × DISCIPLINA × ALUNO
// ============================================================================
router.get('/turmas', (_req, res) => {
  const db = getDb();
  const turmas = db.prepare('SELECT * FROM turmas ORDER BY ano_letivo DESC, nome ASC').all();

  const stmtAlunos = db.prepare(`
    SELECT at.id AS vinculo_id, al.id AS aluno_id, al.matricula, al.nome, al.serie_atual, al.ativo, at.situacao
    FROM aluno_turma at
    JOIN alunos al ON al.id = at.aluno_id
    WHERE at.turma_id = ?
    ORDER BY al.nome ASC
  `);

  const stmtProfDisc = db.prepare(`
    SELECT
      ptd.id AS vinculo_id,
      ptd.professor_id,
      u.nome AS professor_nome,
      u.email AS professor_email,
      ptd.disciplina_id,
      d.nome AS disciplina_nome,
      d.codigo AS disciplina_codigo,
      ar.nome AS area_nome,
      ar.cor AS area_cor
    FROM professor_turma_disciplina ptd
    JOIN usuarios u ON u.id = ptd.professor_id
    JOIN disciplinas d ON d.id = ptd.disciplina_id
    JOIN areas_conhecimento ar ON ar.id = d.area_id
    WHERE ptd.turma_id = ? AND ptd.ativo = 1
    ORDER BY d.nome ASC
  `);

  // Matriz explícita Professor × Disciplina × Aluno
  const matrizVinculos = db
    .prepare(
      `
      SELECT
        t.id AS turma_id,
        t.nome AS turma_nome,
        t.ano_letivo,
        u.id AS professor_id,
        u.nome AS professor_nome,
        d.id AS disciplina_id,
        d.nome AS disciplina_nome,
        al.id AS aluno_id,
        al.nome AS aluno_nome,
        al.matricula AS aluno_matricula
      FROM professor_turma_disciplina ptd
      JOIN turmas t ON t.id = ptd.turma_id
      JOIN usuarios u ON u.id = ptd.professor_id
      JOIN disciplinas d ON d.id = ptd.disciplina_id
      JOIN aluno_turma at ON at.turma_id = t.id AND at.situacao = 'CURSANDO'
      JOIN alunos al ON al.id = at.aluno_id AND al.ativo = 1
      WHERE ptd.ativo = 1
      ORDER BY t.nome ASC, d.nome ASC, al.nome ASC
    `
    )
    .all();

  const resultado = turmas.map((t) => ({
    ...t,
    alunos: stmtAlunos.all(t.id),
    professores_disciplinas: stmtProfDisc.all(t.id),
  }));

  res.json({
    turmas: resultado,
    matrizProfessorDisciplinaAluno: matrizVinculos,
  });
});

router.post('/turmas', (req, res) => {
  try {
    const { codigo, nome, serie, ano_letivo, turno, sala } = req.body;
    if (!codigo || !nome || !serie || !turno) {
      return res.status(400).json({ erro: 'Código, nome, série e turno são obrigatórios.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        'INSERT INTO turmas (codigo, nome, serie, ano_letivo, turno, sala, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)'
      )
      .run(
        codigo.trim().toUpperCase(),
        nome.trim(),
        serie.trim(),
        Number(ano_letivo || 2026),
        turno,
        sala || null
      );
    return res
      .status(201)
      .json(db.prepare('SELECT * FROM turmas WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.put('/turmas/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { codigo, nome, serie, ano_letivo, turno, sala, ativo } = req.body;
    const db = getDb();
    const atual = db.prepare('SELECT * FROM turmas WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Turma não encontrada.' });

    db.prepare(
      'UPDATE turmas SET codigo = ?, nome = ?, serie = ?, ano_letivo = ?, turno = ?, sala = ?, ativo = ? WHERE id = ?'
    ).run(
      (codigo || atual.codigo).trim().toUpperCase(),
      (nome || atual.nome).trim(),
      (serie || atual.serie).trim(),
      Number(ano_letivo || atual.ano_letivo),
      turno || atual.turno,
      sala !== undefined ? sala : atual.sala,
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    );
    return res.json(db.prepare('SELECT * FROM turmas WHERE id = ?').get(id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.post('/vinculos/aluno-turma', (req, res) => {
  try {
    const { aluno_id, turma_id } = req.body;
    if (!aluno_id || !turma_id) {
      return res.status(400).json({ erro: 'Informe o aluno e a turma.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        `
        INSERT INTO aluno_turma (aluno_id, turma_id, situacao)
        VALUES (?, ?, 'CURSANDO')
        ON CONFLICT(aluno_id, turma_id) DO UPDATE SET situacao = 'CURSANDO'
      `
      )
      .run(Number(aluno_id), Number(turma_id));
    return res.status(201).json({
      id: info.lastInsertRowid,
      aluno_id: Number(aluno_id),
      turma_id: Number(turma_id),
    });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.delete('/vinculos/aluno-turma/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM aluno_turma WHERE id = ?').run(Number(req.params.id));
  return res.json({ removido: true });
});

router.post('/vinculos/professor-turma-disciplina', (req, res) => {
  try {
    const { professor_id, turma_id, disciplina_id } = req.body;
    if (!professor_id || !turma_id || !disciplina_id) {
      return res.status(400).json({ erro: 'Informe o professor, a turma e a disciplina.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        `
        INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina_id, ativo)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(turma_id, disciplina_id) DO UPDATE SET professor_id = excluded.professor_id, ativo = 1
      `
      )
      .run(Number(professor_id), Number(turma_id), Number(disciplina_id));

    return res.status(201).json({
      id: info.lastInsertRowid,
      professor_id: Number(professor_id),
      turma_id: Number(turma_id),
      disciplina_id: Number(disciplina_id),
    });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.delete('/vinculos/professor-turma-disciplina/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM professor_turma_disciplina WHERE id = ?').run(Number(req.params.id));
  return res.json({ removido: true });
});

// ============================================================================
// 5. TAGS DE CLASSIFICAÇÃO E ACOMPANHAMENTO
// ============================================================================
router.get('/tags', (_req, res) => {
  const db = getDb();
  const tags = db
    .prepare(
      `
      SELECT
        tg.*,
        (SELECT COUNT(*) FROM acompanhamento_tags atg WHERE atg.tag_id = tg.id) AS total_usos
      FROM tags tg
      ORDER BY tg.categoria ASC, tg.nome ASC
    `
    )
    .all();
  res.json(tags);
});

router.post('/tags', (req, res) => {
  try {
    const { nome, categoria, natureza, cor, descricao } = req.body;
    if (!nome || !categoria) {
      return res.status(400).json({ erro: 'Nome e categoria da tag são obrigatórios.' });
    }
    const db = getDb();
    const info = db
      .prepare(
        'INSERT INTO tags (nome, categoria, natureza, cor, descricao, ativo) VALUES (?, ?, ?, ?, ?, 1)'
      )
      .run(
        nome.trim(),
        categoria,
        natureza || 'NEUTRA',
        cor || '#0d6efd',
        descricao || null
      );
    return res
      .status(201)
      .json(db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

router.put('/tags/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, categoria, natureza, cor, descricao, ativo } = req.body;
    const db = getDb();
    const atual = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Tag não encontrada.' });

    db.prepare(
      'UPDATE tags SET nome = ?, categoria = ?, natureza = ?, cor = ?, descricao = ?, ativo = ? WHERE id = ?'
    ).run(
      (nome || atual.nome).trim(),
      categoria || atual.categoria,
      natureza || atual.natureza,
      cor || atual.cor,
      descricao !== undefined ? descricao : atual.descricao,
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    );
    return res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

// ============================================================================
// 6. PERÍODOS DE DIGITAÇÃO DOS 4 BIMESTRES
// ============================================================================
router.get('/periodos', (req, res) => {
  const anoLetivo = Number(req.query.ano_letivo || 2026);
  return res.json(listarPeriodosBimestrais(anoLetivo));
});

router.put('/periodos/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      data_hora_abertura,
      data_hora_encerramento,
      nota_minima,
      nota_maxima,
      media_referencia,
      fechado_manualmente,
    } = req.body;

    const db = getDb();
    const atual = db.prepare('SELECT * FROM periodos_bimestrais WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Período bimestral não encontrado.' });

    const abertura = data_hora_abertura || atual.data_hora_abertura;
    const encerramento = data_hora_encerramento || atual.data_hora_encerramento;

    if (new Date(abertura) >= new Date(encerramento)) {
      return res
        .status(400)
        .json({ erro: 'A data/hora de encerramento deve ser posterior à data/hora de abertura.' });
    }

    db.prepare(
      `
      UPDATE periodos_bimestrais
      SET data_hora_abertura = ?, data_hora_encerramento = ?,
          nota_minima = ?, nota_maxima = ?, media_referencia = ?,
          fechado_manualmente = ?
      WHERE id = ?
    `
    ).run(
      abertura,
      encerramento,
      nota_minima !== undefined ? Number(nota_minima) : atual.nota_minima,
      nota_maxima !== undefined ? Number(nota_maxima) : atual.nota_maxima,
      media_referencia !== undefined ? Number(media_referencia) : atual.media_referencia,
      fechado_manualmente !== undefined ? (fechado_manualmente ? 1 : 0) : atual.fechado_manualmente,
      id
    );

    const periodos = listarPeriodosBimestrais(atual.ano_letivo);
    return res.json(periodos.find((p) => p.id === id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
});

// ============================================================================
// 7. FLUXO DE REVISÃO, EDIÇÃO RASTREÁVEL, DEVOLUÇÃO E PUBLICAÇÃO
// ============================================================================
router.get('/acompanhamentos', (req, res) => {
  const { ano_letivo, bimestre, turma_id, disciplina_id, professor_id, status, tag_id } = req.query;
  const lista = listarAcompanhamentosDetalhados({
    ano_letivo: ano_letivo || 2026,
    bimestre,
    turma_id,
    disciplina_id,
    professor_id,
    status,
    tag_id,
  });

  const filaRevisao = obterFilaRevisaoAdministrativa(ano_letivo || 2026, bimestre);
  return res.json({
    acompanhamentos: lista,
    filaRevisao,
  });
});

router.get('/acompanhamentos/:id/historico', (req, res) => {
  const id = Number(req.params.id);
  const historicoLIFO = obterPilhaHistoricoAcompanhamento(id);
  return res.json(historicoLIFO);
});

/**
 * PUT /api/admin/acompanhamentos/:id/revisar
 * Permite ao Administrador revisar e alterar um acompanhamento com rastreabilidade
 * obrigatória (usuário, data/hora, estado anterior e estado posterior).
 */
router.put('/acompanhamentos/:id/revisar', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      media,
      frequencia_percentual,
      descricao,
      tagsIds,
      observacao_coordenacao,
      justificativa,
    } = req.body;

    const db = getDb();
    const existentes = listarAcompanhamentosDetalhados({ id });
    if (existentes.length === 0) {
      return res.status(404).json({ erro: 'Acompanhamento não encontrado.' });
    }
    const atual = existentes[0];

    const periodoRow = db
      .prepare('SELECT * FROM periodos_bimestrais WHERE ano_letivo = ? AND bimestre = ?')
      .get(atual.ano_letivo, atual.bimestre);
    const periodoDominio = periodoRow ? new PeriodoBimestral(periodoRow) : null;

    const entidadeAnterior = new AcompanhamentoBimestral({
      ...atual,
      tagsIds: atual.tagsIds,
    });
    const estadoAnteriorObj = entidadeAnterior.gerarSnapshotEstado();

    const entidadeNova = new AcompanhamentoBimestral({
      ...atual,
      media: media !== undefined ? media : atual.media,
      frequencia_percentual:
        frequencia_percentual !== undefined ? frequencia_percentual : atual.frequencia_percentual,
      descricao: descricao !== undefined ? descricao : atual.descricao,
      observacao_coordenacao:
        observacao_coordenacao !== undefined
          ? observacao_coordenacao
          : atual.observacao_coordenacao,
      tagsIds: Array.isArray(tagsIds) ? tagsIds : atual.tagsIds,
    });

    entidadeNova.validarDadosObrigatorios(periodoDominio);
    const estadoPosteriorObj = entidadeNova.gerarSnapshotEstado();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(
        `
        UPDATE acompanhamentos
        SET media = ?, frequencia_percentual = ?, descricao = ?,
            observacao_coordenacao = ?, revisado_por = ?,
            data_revisao = datetime('now', 'localtime'),
            atualizado_em = datetime('now', 'localtime')
        WHERE id = ?
      `
      ).run(
        entidadeNova.media,
        entidadeNova.frequenciaPercentual,
        entidadeNova.descricao,
        entidadeNova.observacaoCoordenacao,
        req.usuario.id,
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
        usuarioId: req.usuario.id,
        acao: 'EDICAO_ADMINISTRATIVA',
        statusAnterior: atual.status,
        statusPosterior: atual.status,
        estadoAnteriorObj,
        estadoPosteriorObj,
        justificativa:
          justificativa || 'Revisão e ajuste de conteúdo realizado pela Administração Escolar.',
      });

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    const atualizado = listarAcompanhamentosDetalhados({ id })[0];
    return res.json(atualizado);
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(400).json({ erro: err.message });
  }
});

/**
 * POST /api/admin/acompanhamentos/:id/devolver
 * Devolve o acompanhamento para ajustes do professor com rastreabilidade.
 */
router.post('/acompanhamentos/:id/devolver', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { motivo_devolucao } = req.body;
    const db = getDb();

    const existentes = listarAcompanhamentosDetalhados({ id });
    if (existentes.length === 0) {
      return res.status(404).json({ erro: 'Acompanhamento não encontrado.' });
    }
    const atual = existentes[0];

    const entidade = new AcompanhamentoBimestral({ ...atual, tagsIds: atual.tagsIds });
    const estadoAnteriorObj = entidade.gerarSnapshotEstado();
    const statusAnterior = entidade.status;

    entidade.devolverParaProfessor(motivo_devolucao);
    const estadoPosteriorObj = entidade.gerarSnapshotEstado();

    db.prepare(
      `
      UPDATE acompanhamentos
      SET status = 'DEVOLVIDO', motivo_devolucao = ?, revisado_por = ?,
          data_revisao = datetime('now', 'localtime'),
          atualizado_em = datetime('now', 'localtime')
      WHERE id = ?
    `
    ).run(entidade.motivoDevolucao, req.usuario.id, id);

    registrarHistoricoAuditoria({
      acompanhamentoId: id,
      usuarioId: req.usuario.id,
      acao: 'DEVOLUCAO_AJUSTES',
      statusAnterior,
      statusPosterior: 'DEVOLVIDO',
      estadoAnteriorObj,
      estadoPosteriorObj,
      justificativa: entidade.motivoDevolucao,
    });

    return res.json(listarAcompanhamentosDetalhados({ id })[0]);
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(400).json({ erro: err.message });
  }
});

/**
 * POST /api/admin/acompanhamentos/:id/publicar
 * Publica o acompanhamento para visualização do Pai/Responsável.
 */
router.post('/acompanhamentos/:id/publicar', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { observacao_coordenacao } = req.body;
    const db = getDb();

    const existentes = listarAcompanhamentosDetalhados({ id });
    if (existentes.length === 0) {
      return res.status(404).json({ erro: 'Acompanhamento não encontrado.' });
    }
    const atual = existentes[0];

    const entidade = new AcompanhamentoBimestral({ ...atual, tagsIds: atual.tagsIds });
    const estadoAnteriorObj = entidade.gerarSnapshotEstado();
    const statusAnterior = entidade.status;

    entidade.publicarParaResponsaveis(
      observacao_coordenacao !== undefined ? observacao_coordenacao : atual.observacao_coordenacao
    );
    const estadoPosteriorObj = entidade.gerarSnapshotEstado();

    db.prepare(
      `
      UPDATE acompanhamentos
      SET status = 'PUBLICADO', motivo_devolucao = NULL,
          observacao_coordenacao = ?, revisado_por = ?,
          data_revisao = datetime('now', 'localtime'),
          data_publicacao = datetime('now', 'localtime'),
          atualizado_em = datetime('now', 'localtime')
      WHERE id = ?
    `
    ).run(entidade.observacaoCoordenacao, req.usuario.id, id);

    registrarHistoricoAuditoria({
      acompanhamentoId: id,
      usuarioId: req.usuario.id,
      acao: 'PUBLICACAO',
      statusAnterior,
      statusPosterior: 'PUBLICADO',
      estadoAnteriorObj,
      estadoPosteriorObj,
      justificativa:
        entidade.observacaoCoordenacao || 'Acompanhamento aprovado e publicado aos responsáveis.',
    });

    return res.json(listarAcompanhamentosDetalhados({ id })[0]);
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(400).json({ erro: err.message });
  }
});

// ============================================================================
// 8. RELATÓRIOS GERENCIAIS E EXPORTAÇÃO PARA EXCEL (.XLSX)
// ============================================================================
router.get('/relatorios/gestao', (req, res) => {
  const db = getDb();
  const anoLetivo = Number(req.query.ano_letivo || 2026);
  const bimestre = req.query.bimestre ? Number(req.query.bimestre) : null;

  const acompanhamentos = listarAcompanhamentosDetalhados({
    ano_letivo: anoLetivo,
    bimestre: bimestre || undefined,
  });

  const contadoresStatus = {
    RASCUNHO: 0,
    ENVIADO: 0,
    DEVOLVIDO: 0,
    PUBLICADO: 0,
  };

  let somaMedias = 0;
  let abaixoMediaReferencia = 0;
  const mapaTags = new Map();
  const mapaTurmas = new Map();
  const mapaDisciplinas = new Map();

  for (const ac of acompanhamentos) {
    contadoresStatus[ac.status] = (contadoresStatus[ac.status] || 0) + 1;
    somaMedias += Number(ac.media);
    if (Number(ac.media) < 6.0) {
      abaixoMediaReferencia++;
    }

    for (const tg of ac.tags || []) {
      const atualTag = mapaTags.get(tg.id) || {
        id: tg.id,
        nome: tg.nome,
        categoria: tg.categoria,
        natureza: tg.natureza,
        cor: tg.cor,
        quantidade: 0,
      };
      atualTag.quantidade++;
      mapaTags.set(tg.id, atualTag);
    }

    const itemTurma = mapaTurmas.get(ac.turma_id) || {
      turma_id: ac.turma_id,
      turma_nome: ac.turma_nome,
      total: 0,
      somaMedias: 0,
      publicados: 0,
    };
    itemTurma.total++;
    itemTurma.somaMedias += Number(ac.media);
    if (ac.status === 'PUBLICADO') itemTurma.publicados++;
    mapaTurmas.set(ac.turma_id, itemTurma);

    const itemDisc = mapaDisciplinas.get(ac.disciplina_id) || {
      disciplina_id: ac.disciplina_id,
      disciplina_nome: ac.disciplina_nome,
      area_nome: ac.area_nome,
      total: 0,
      somaMedias: 0,
    };
    itemDisc.total++;
    itemDisc.somaMedias += Number(ac.media);
    mapaDisciplinas.set(ac.disciplina_id, itemDisc);
  }

  const totaisCadastros = {
    totalAlunosAtivos: db.prepare('SELECT COUNT(*) as c FROM alunos WHERE ativo = 1').get().c,
    totalProfessoresAtivos: db
      .prepare("SELECT COUNT(*) as c FROM usuarios WHERE perfil = 'PROFESSOR' AND ativo = 1")
      .get().c,
    totalResponsaveisAtivos: db
      .prepare("SELECT COUNT(*) as c FROM usuarios WHERE perfil = 'RESPONSAVEL' AND ativo = 1")
      .get().c,
    totalTurmasAtivas: db.prepare('SELECT COUNT(*) as c FROM turmas WHERE ativo = 1').get().c,
    totalCienciasConfirmadas: db
      .prepare('SELECT COUNT(*) as c FROM interacoes_responsavel WHERE ciencia_confirmada = 1')
      .get().c,
  };

  return res.json({
    anoLetivo,
    bimestre,
    totaisCadastros,
    totalAcompanhamentos: acompanhamentos.length,
    mediaGeral:
      acompanhamentos.length > 0
        ? Number((somaMedias / acompanhamentos.length).toFixed(2))
        : 0,
    abaixoMediaReferencia,
    contadoresStatus,
    desempenhoPorTurma: Array.from(mapaTurmas.values()).map((t) => ({
      ...t,
      mediaTurma: Number((t.somaMedias / t.total).toFixed(2)),
    })),
    desempenhoPorDisciplina: Array.from(mapaDisciplinas.values()).map((d) => ({
      ...d,
      mediaDisciplina: Number((d.somaMedias / d.total).toFixed(2)),
    })),
    rankingTags: Array.from(mapaTags.values()).sort((a, b) => b.quantidade - a.quantidade),
  });
});

/**
 * GET /api/admin/relatorios/exportar-excel
 * Exporta arquivo .xlsx compatível com Microsoft Excel contendo abas de
 * Acompanhamentos, Desempenho por Turma e Auditoria/Rastreabilidade.
 */
router.get('/relatorios/exportar-excel', (req, res) => {
  const db = getDb();
  const anoLetivo = Number(req.query.ano_letivo || 2026);
  const bimestre = req.query.bimestre ? Number(req.query.bimestre) : undefined;
  const status = req.query.status || undefined;

  const acompanhamentos = listarAcompanhamentosDetalhados({
    ano_letivo: anoLetivo,
    bimestre,
    status,
  });

  const planilhaAcompanhamentos = acompanhamentos.map((ac) => ({
    ID: ac.id,
    'Ano Letivo': ac.ano_letivo,
    Bimestre: `${ac.bimestre}º Bimestre`,
    Matrícula: ac.aluno_matricula,
    Aluno: ac.aluno_nome,
    Turma: ac.turma_nome,
    'Área de Conhecimento': ac.area_nome,
    Disciplina: ac.disciplina_nome,
    Professor: ac.professor_nome,
    'Média Bimestral': Number(ac.media).toFixed(1),
    'Frequência (%)': `${ac.frequencia_percentual}%`,
    Status: ac.status,
    Tags: (ac.tags || []).map((t) => t.nome).join(', '),
    'Parecer Descritivo': ac.descricao,
    'Observação Coordenação': ac.observacao_coordenacao || '',
    'Ciência da Família':
      ac.interacoes && ac.interacoes.length > 0
        ? `Confirmada por ${ac.interacoes[0].responsavel_nome} em ${ac.interacoes[0].data_ciencia}`
        : 'Pendente',
    'Observação da Família':
      ac.interacoes && ac.interacoes.length > 0
        ? ac.interacoes[0].observacao_responsavel || ''
        : '',
  }));

  const historicoRows = db
    .prepare(
      `
      SELECT
        h.id AS ID_Evento,
        h.acompanhamento_id AS ID_Acompanhamento,
        al.nome AS Aluno,
        d.nome AS Disciplina,
        ac.bimestre AS Bimestre,
        u.nome AS Usuario_Responsavel,
        u.perfil AS Perfil,
        h.acao AS Acao_Realizada,
        h.status_anterior AS Status_Anterior,
        h.status_posterior AS Status_Posterior,
        h.justificativa AS Justificativa,
        h.data_hora AS Data_Hora
      FROM historico_acompanhamento h
      JOIN acompanhamentos ac ON ac.id = h.acompanhamento_id
      JOIN alunos al ON al.id = ac.aluno_id
      JOIN disciplinas d ON d.id = ac.disciplina_id
      JOIN usuarios u ON u.id = h.usuario_id
      ORDER BY h.id DESC
    `
    )
    .all();

  const wb = XLSX.utils.book_new();
  const wsAcomp = XLSX.utils.json_to_sheet(
    planilhaAcompanhamentos.length > 0
      ? planilhaAcompanhamentos
      : [{ Mensagem: 'Nenhum acompanhamento encontrado para os filtros selecionados.' }]
  );
  XLSX.utils.book_append_sheet(wb, wsAcomp, 'Acompanhamentos_Bimestrais');

  const wsAudit = XLSX.utils.json_to_sheet(historicoRows);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Rastreabilidade_Auditoria');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Relatorio_Acad_EduLL-Kfka_${anoLetivo}.xlsx"`
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  return res.send(buffer);
});

module.exports = router;
