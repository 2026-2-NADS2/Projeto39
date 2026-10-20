# KFKA - CRUD de Acompanhamentos

Projeto feito em Node.js + Express + MySQL para a matéria de Desenvolvimento Web Full Stack.

## Arquivos do projeto
- `server.js` → arquivo principal, tem TODAS as rotas do CRUD (é só abrir esse arquivo pra entender o projeto inteiro)
- `db.js` → só conecta no banco MySQL
- `schema.sql` → cria o banco e as tabelas
- `.env.example` → modelo das variáveis de ambiente
- `postman_collection.json` → testes prontos pra importar no Postman

## Como rodar

1. Instalar as dependências:
```
npm install
```

2. Criar o banco (abrir o MySQL Workbench e rodar o arquivo `schema.sql`, ou pelo terminal):
```
mysql -u root -p < schema.sql
```

3. Copiar o `.env.example` para `.env` e colocar o usuário/senha do seu MySQL:
```
cp .env.example .env
```

4. Rodar o servidor:
```
npm run dev
```

Se aparecer `Servidor rodando em http://localhost:3000` deu tudo certo.

## Rotas da entidade principal (acompanhamentos)

| Método | Rota                  | O que faz            |
|--------|------------------------|------------------------|
| POST   | /acompanhamentos       | Cria um acompanhamento |
| GET    | /acompanhamentos       | Lista todos            |
| GET    | /acompanhamentos/:id   | Busca um pelo id       |
| PUT    | /acompanhamentos/:id   | Atualiza um            |
| DELETE | /acompanhamentos/:id   | Apaga um               |

Campos obrigatórios no corpo (POST e PUT): `aluno_id`, `professor_id`, `disciplina_id`,
`turma_id`, `bimestre`, `ano_letivo`, `descricao`, `media`.

Também tem rotas simples pra ver os dados de apoio (usadas pra saber quais ids existem):
`GET /alunos`, `GET /professores`, `GET /disciplinas`, `GET /turmas`.

## Testando no Postman

1. Abrir o Postman e importar o `postman_collection.json`.
2. Rodar as requisições na ordem (1 até 7).
3. As requisições 6 e 7 são de erro de propósito (uma sem campo obrigatório, outra buscando
   um id que não existe) - servem pra mostrar que a API trata erro certinho (400 e 404).
4. Pra gerar a evidência da entrega: usar o botão "Run" do Postman e tirar print do resultado,
   ou gravar a tela rodando as requisições.
