const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');
const { FabricaUsuario, RegraNegocioError } = require('../domain/Entities');

const JWT_SECRET = process.env.JWT_SECRET || 'edubimestre-pi-ads2-chave-secreta-2026';

function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      nome: usuario.nome,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Autenticação necessária. Token não fornecido.' });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);

    const db = getDb();
    const row = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(payload.id);
    if (!row) {
      return res.status(401).json({ erro: 'Usuário não encontrado.' });
    }

    // Instancia polimorficamente Administrador, Professor ou Responsavel (POO)
    const usuarioDominio = FabricaUsuario.criar(row);
    usuarioDominio.validarAtivo();

    req.usuario = usuarioDominio;
    req.usuarioRow = row;
    next();
  } catch (err) {
    if (err instanceof RegraNegocioError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

function exigirPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Não autenticado.' });
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: `Acesso negado. Esta operação requer perfil: ${perfisPermitidos.join(' ou ')}.`,
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  gerarToken,
  autenticar,
  exigirPerfil,
};
