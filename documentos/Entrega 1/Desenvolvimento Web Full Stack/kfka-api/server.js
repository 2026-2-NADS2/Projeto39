// Projeto KFKA - Plataforma de Acompanhamento Escolar
// Entrega: CRUD completo da entidade "acompanhamentos"
// Feito com Node.js + Express + MySQL

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Trata JSON malformado no corpo da requisição (senão o Express devolve uma
// página HTML de erro em vez de um JSON com status 400)
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  next(erro);
});

// Estados válidos do fluxo editorial (RF06 / regras de negócio do PI)
const STATUS_VALIDOS = ['rascunho', 'enviado_revisao', 'em_revisao', 'publicado', 'devolvido', 'cancelado'];

// Valida os dados de um acompanhamento (campos obrigatórios + regras de negócio)
function validarAcompanhamento(dados) {
  const { aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, status } = dados;

  if (!aluno_id || !professor_id || !disciplina_id || !turma_id || !bimestre || !ano_letivo || !descricao || media === undefined || media === null) {
    return 'Preencha todos os campos obrigatórios: aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao e media.';
  }

  if (!Number.isInteger(Number(bimestre)) || Number(bimestre) < 1 || Number(bimestre) > 4) {
    return 'O campo bimestre deve ser um número inteiro entre 1 e 4.';
  }

  const mediaNumero = Number(media);
  if (Number.isNaN(mediaNumero) || mediaNumero < 0 || mediaNumero > 10) {
    return 'O campo media deve ser um número entre 0 e 10.';
  }

  if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
    return `O campo status deve ser um dos seguintes valores: ${STATUS_VALIDOS.join(', ')}.`;
  }

  return null;
}

// Rota inicial, só pra saber que a API está funcionando
app.get('/', (req, res) => {
  res.json({ mensagem: 'API do projeto KFKA está rodando! Use a rota /acompanhamentos' });
});

// ==========================================================
// CRUD da entidade principal: acompanhamentos
// ==========================================================

// CREATE - cria um novo acompanhamento
app.post('/acompanhamentos', async (req, res) => {
  const { aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, tags, status } = req.body;

  // validação básica + regras de negócio (bimestre 1-4, media 0-10, status válido)
  const mensagemErro = validarAcompanhamento(req.body);
  if (mensagemErro) {
    return res.status(400).json({ erro: mensagemErro });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO acompanhamentos (aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, tags || null, status || 'rascunho']
    );

    const [novoRegistro] = await db.query('SELECT * FROM acompanhamentos WHERE id = ?', [resultado.insertId]);
    res.status(201).json(novoRegistro[0]);
  } catch (erro) {
    console.log(erro);
    // Referência inexistente (aluno_id/professor_id/disciplina_id/turma_id) é erro do cliente, não do servidor
    if (erro.code === 'ER_NO_REFERENCED_ROW_2' || erro.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ erro: 'aluno_id, professor_id, disciplina_id ou turma_id não existe.' });
    }
    res.status(500).json({ erro: 'Erro ao criar o acompanhamento.' });
  }
});

// READ - lista todos os acompanhamentos
app.get('/acompanhamentos', async (req, res) => {
  try {
    const [linhas] = await db.query('SELECT * FROM acompanhamentos ORDER BY id DESC');
    res.status(200).json(linhas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao listar os acompanhamentos.' });
  }
});

// READ - busca um acompanhamento pelo id
app.get('/acompanhamentos/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const [linhas] = await db.query('SELECT * FROM acompanhamentos WHERE id = ?', [id]);

    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Acompanhamento não encontrado.' });
    }

    res.status(200).json(linhas[0]);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao buscar o acompanhamento.' });
  }
});

// UPDATE - atualiza um acompanhamento pelo id
app.put('/acompanhamentos/:id', async (req, res) => {
  const id = req.params.id;
  const { aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, tags, status } = req.body;

  const mensagemErro = validarAcompanhamento(req.body);
  if (mensagemErro) {
    return res.status(400).json({ erro: mensagemErro });
  }

  try {
    const [existe] = await db.query('SELECT * FROM acompanhamentos WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Acompanhamento não encontrado.' });
    }

    await db.query(
      'UPDATE acompanhamentos SET aluno_id = ?, professor_id = ?, disciplina_id = ?, turma_id = ?, bimestre = ?, ano_letivo = ?, descricao = ?, media = ?, tags = ?, status = ? WHERE id = ?',
      [aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, tags || null, status || existe[0].status, id]
    );

    const [atualizado] = await db.query('SELECT * FROM acompanhamentos WHERE id = ?', [id]);
    res.status(200).json(atualizado[0]);
  } catch (erro) {
    console.log(erro);
    if (erro.code === 'ER_NO_REFERENCED_ROW_2' || erro.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ erro: 'aluno_id, professor_id, disciplina_id ou turma_id não existe.' });
    }
    res.status(500).json({ erro: 'Erro ao atualizar o acompanhamento.' });
  }
});

// DELETE - remove um acompanhamento pelo id
app.delete('/acompanhamentos/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const [existe] = await db.query('SELECT * FROM acompanhamentos WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Acompanhamento não encontrado.' });
    }

    await db.query('DELETE FROM acompanhamentos WHERE id = ?', [id]);
    res.status(200).json({ mensagem: 'Acompanhamento removido com sucesso.' });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao deletar o acompanhamento.' });
  }
});

// ==========================================================
// Rotas simples só para consultar os dados de apoio
// (usadas para saber quais ids de aluno/professor/disciplina/turma existem)
// ==========================================================

app.get('/alunos', async (req, res) => {
  try {
    const [linhas] = await db.query('SELECT * FROM alunos');
    res.status(200).json(linhas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao listar os alunos.' });
  }
});

app.get('/professores', async (req, res) => {
  try {
    const [linhas] = await db.query('SELECT * FROM professores');
    res.status(200).json(linhas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao listar os professores.' });
  }
});

app.get('/disciplinas', async (req, res) => {
  try {
    const [linhas] = await db.query('SELECT * FROM disciplinas');
    res.status(200).json(linhas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao listar as disciplinas.' });
  }
});

app.get('/turmas', async (req, res) => {
  try {
    const [linhas] = await db.query('SELECT * FROM turmas');
    res.status(200).json(linhas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ erro: 'Erro ao listar as turmas.' });
  }
});

// Rota que não existe
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log('Servidor rodando em http://localhost:' + PORTA);
});
