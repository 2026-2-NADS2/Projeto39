const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'edubimestre.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    dbInstance.exec(schemaSql);
  }
  return dbInstance;
}

/**
 * Constrói o Grafo de Vínculos Escolares em memória a partir do banco SQLite
 * para validações rápidas O(1) nas regras de negócio.
 */
function carregarGrafoVinculos(GrafoVinculosEscolares) {
  const db = getDb();
  const grafo = new GrafoVinculosEscolares();

  const vinculosProf = db
    .prepare('SELECT professor_id, turma_id, disciplina_id FROM professor_turma_disciplina WHERE ativo = 1')
    .all();
  for (const v of vinculosProf) {
    grafo.registrarVinculoProfessor(v.professor_id, v.turma_id, v.disciplina_id);
  }

  const matriculas = db
    .prepare("SELECT aluno_id, turma_id FROM aluno_turma WHERE situacao = 'CURSANDO'")
    .all();
  for (const m of matriculas) {
    grafo.registrarMatriculaAluno(m.turma_id, m.aluno_id);
  }

  const vinculosResp = db
    .prepare('SELECT responsavel_id, aluno_id FROM responsavel_aluno WHERE autorizado_acesso = 1')
    .all();
  for (const r of vinculosResp) {
    grafo.registrarVinculoResponsavel(r.responsavel_id, r.aluno_id);
  }

  return grafo;
}

module.exports = {
  getDb,
  carregarGrafoVinculos,
  DB_PATH,
};
