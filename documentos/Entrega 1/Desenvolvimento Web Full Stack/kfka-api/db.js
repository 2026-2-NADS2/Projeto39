// Esse arquivo só cria a conexão com o banco de dados MySQL.
// Os dados vêm do arquivo .env (usuário, senha, nome do banco, etc.)

require('dotenv').config();
const mysql = require('mysql2/promise');

const conexao = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = conexao;
