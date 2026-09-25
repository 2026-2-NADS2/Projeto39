-- Banco de dados do projeto KFKA
-- Entidade principal: acompanhamentos

CREATE DATABASE IF NOT EXISTS kfka_db;
USE kfka_db;

DROP TABLE IF EXISTS acompanhamentos;
DROP TABLE IF EXISTS alunos;
DROP TABLE IF EXISTS professores;
DROP TABLE IF EXISTS disciplinas;
DROP TABLE IF EXISTS turmas;

-- Tabelas simples só para dar apoio (referência) para o acompanhamento
CREATE TABLE turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  ano_letivo INT NOT NULL
);

CREATE TABLE professores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150)
);

CREATE TABLE disciplinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  area VARCHAR(100)
);

CREATE TABLE alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  turma_id INT,
  FOREIGN KEY (turma_id) REFERENCES turmas(id)
);

-- Tabela principal do CRUD (essa é a entidade que tem POST/GET/PUT/DELETE)
CREATE TABLE acompanhamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id INT NOT NULL,
  professor_id INT NOT NULL,
  disciplina_id INT NOT NULL,
  turma_id INT NOT NULL,
  bimestre INT NOT NULL,
  ano_letivo INT NOT NULL,
  descricao TEXT NOT NULL,
  media DECIMAL(4,2) NOT NULL,
  tags VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (aluno_id) REFERENCES alunos(id),
  FOREIGN KEY (professor_id) REFERENCES professores(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
  FOREIGN KEY (turma_id) REFERENCES turmas(id)
);

-- Dados de exemplo, só para já ter algo pra testar no Postman
INSERT INTO turmas (nome, ano_letivo) VALUES ('5A', 2026), ('6B', 2026);

INSERT INTO professores (nome, email) VALUES
  ('Carlos Mendes', 'carlos.mendes@escola.com'),
  ('Ana Paula', 'ana.paula@escola.com');

INSERT INTO disciplinas (nome, area) VALUES
  ('Matemática', 'Exatas'),
  ('Português', 'Linguagens');

INSERT INTO alunos (nome, turma_id) VALUES
  ('Pedro Souza', 1),
  ('Julia Lima', 2);

INSERT INTO acompanhamentos
  (aluno_id, professor_id, disciplina_id, turma_id, bimestre, ano_letivo, descricao, media, tags, status)
VALUES
  (1, 1, 1, 1, 1, 2026, 'Aluno evoluiu bem em operações básicas.', 8.50, 'evolucao', 'publicado'),
  (2, 2, 2, 2, 1, 2026, 'Precisa reforçar interpretação de texto.', 6.00, 'atencao', 'rascunho');
