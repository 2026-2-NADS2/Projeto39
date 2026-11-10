const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/db');
const { FabricaUsuario, RegraNegocioError } = require('../domain/Entities');
const { gerarToken, autenticar } = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe o e-mail e a senha de acesso.' });
    }

    const db = getDb();
    const row = db
      .prepare('SELECT * FROM usuarios WHERE lower(email) = lower(?)')
      .get(email.trim());

    if (!row) {
      return res.status(401).json({ erro: 'Credenciais inválidas. Verifique o e-mail e a senha.' });
    }

    const senhaValida = bcrypt.compareSync(senha, row.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas. Verifique o e-mail e a senha.' });
    }

    const usuario = FabricaUsuario.criar(row);
    usuario.validarAtivo();

    const token = gerarToken(usuario);
    return res.json({
      token,
      usuario: {
        ...usuario.paraJSON(),
        registro_funcional: row.registro_funcional,
        formacao_especialidade: row.formacao_especialidade,
        parentesco_padrao: row.parentesco_padrao,
      },
    });
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(500).json({ erro: err.message || 'Erro interno ao autenticar.' });
  }
});

// GET /api/auth/me
router.get('/me', autenticar, (req, res) => {
  return res.json({
    usuario: {
      ...req.usuario.paraJSON(),
      registro_funcional: req.usuarioRow.registro_funcional,
      formacao_especialidade: req.usuarioRow.formacao_especialidade,
      parentesco_padrao: req.usuarioRow.parentesco_padrao,
    },
  });
});

// GET /api/auth/perfis-demo (Facilita demonstração acadêmica com login de 1 clique)
router.get('/perfis-demo', (_req, res) => {
  const db = getDb();
  const usuarios = db
    .prepare(
      `
      SELECT id, nome, email, perfil, registro_funcional, formacao_especialidade, parentesco_padrao
      FROM usuarios
      WHERE ativo = 1
      ORDER BY CASE perfil WHEN 'ADMIN' THEN 1 WHEN 'PROFESSOR' THEN 2 ELSE 3 END, id ASC
    `
    )
    .all();

  return res.json({
    senhaPadraoDemo: '123456',
    usuarios,
  });
});

module.exports = router;
