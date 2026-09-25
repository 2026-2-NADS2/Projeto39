CREATE TABLE IF NOT EXISTS Alunos (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL,
    Turma TEXT NOT NULL
);

INSERT INTO Alunos (Nome, Turma) VALUES
('Ana Beatriz Souza', '8º A'),
('Bruno Henrique Lima', '8º A'),
('Carolina Mendes', '8º A'),
('Daniel Oliveira', '8º A'),
('Eduarda Martins', '8º A'),
('Felipe Santos', '8º B'),
('Gabriela Ferreira', '8º B'),
('Henrique Costa', '8º B'),
('Isabela Rodrigues', '8º B'),
('João Pedro Alves', '8º B'),
('Karina Barbosa', '9º A'),
('Lucas Almeida', '9º A'),
('Mariana Castro', '9º A'),
('Nicolas Ribeiro', '9º A'),
('Olivia Moreira', '9º A'),
('Paulo Viana', '9º B'),
('Rafaela Nunes', '9º B'),
('Samuel Carvalho', '9º B'),
('Thais Gomes', '9º B'),
('Vinicius Rocha', '9º B');
