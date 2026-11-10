const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/server');
const { garantirSeedInicial } = require('../src/database/seed');
const {
  FilaRevisao,
  PilhaHistorico,
  GrafoVinculosEscolares,
  NoArvoreCurricular,
} = require('../src/structures/DataStructures');
const { FabricaUsuario } = require('../src/domain/Entities');

let server;
let baseUrl;

function requestJson(path, { method = 'GET', token = null, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          resolve({ status: res.statusCode, data: JSON.parse(buffer.toString('utf-8')), headers: res.headers });
        } else {
          resolve({ status: res.statusCode, buffer, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test.before(async () => {
  garantirSeedInicial(true);
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Estruturas de Dados (Fila FIFO, Pilha LIFO, Grafo O(1) e Árvore N-ária) e Polimorfismo POO', () => {
  const fila = new FilaRevisao();
  fila.enfileirar({ id: 10 });
  fila.enfileirar({ id: 20 });
  assert.equal(fila.tamanho, 2);
  assert.equal(fila.desenfileirar().id, 10);

  const pilha = new PilhaHistorico();
  pilha.empilhar({ acao: 'CRIACAO_RASCUNHO' });
  pilha.empilhar({ acao: 'PUBLICACAO' });
  assert.equal(pilha.topo().acao, 'PUBLICACAO');

  const grafo = new GrafoVinculosEscolares();
  grafo.registrarVinculoProfessor(2, 1, 3);
  grafo.registrarMatriculaAluno(1, 100);
  assert.equal(grafo.professorLecionaParaAluno(2, 1, 3, 100), true);
  assert.equal(grafo.professorLecionaParaAluno(2, 1, 99, 100), false);

  const arvore = new NoArvoreCurricular(0, 'ESCOLA', 'EF');
  const area = arvore.adicionarFilho(new NoArvoreCurricular(1, 'AREA', 'Matemática'));
  area.adicionarFilho(new NoArvoreCurricular(2, 'DISCIPLINA', 'Álgebra'));
  assert.equal(arvore.contarNosPorTipo('DISCIPLINA'), 1);

  const admin = FabricaUsuario.criar({ id: 1, nome: 'Admin', email: 'a@a.com', perfil: 'ADMIN' });
  const resp = FabricaUsuario.criar({ id: 5, nome: 'Pai', email: 'p@a.com', perfil: 'RESPONSAVEL' });
  assert.equal(admin.podeVisualizarAcompanhamento({ status: 'RASCUNHO' }), true);
  assert.equal(resp.podeVisualizarAcompanhamento({ status: 'RASCUNHO', aluno_id: 1 }, { alunosVinculadosIds: [1] }), false);
  assert.equal(resp.podeVisualizarAcompanhamento({ status: 'PUBLICADO', aluno_id: 1 }, { alunosVinculadosIds: [1] }), true);
});

test('2. Fluxo Completo: Professor (Rascunho/Envio) -> Admin (Revisão Rastreável/Devolução/Publicação) -> Responsável (Consulta Publicados e Ciência)', async () => {
  // Login dos 3 perfis
  const loginAdmin = await requestJson('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@escola.edu.br', senha: '123456' },
  });
  assert.equal(loginAdmin.status, 200);
  const tokenAdmin = loginAdmin.data.token;

  const loginProf = await requestJson('/api/auth/login', {
    method: 'POST',
    body: { email: 'carlos.mendes@escola.edu.br', senha: '123456' },
  });
  assert.equal(loginProf.status, 200);
  const tokenProf = loginProf.data.token;

  const loginResp = await requestJson('/api/auth/login', {
    method: 'POST',
    body: { email: 'roberto.silva@familia.com', senha: '123456' },
  });
  assert.equal(loginResp.status, 200);
  const tokenResp = loginResp.data.token;

  // Regra: Professor bloqueado se informar média fora da escala (ex: 12.5)
  const erroEscala = await requestJson('/api/professor/acompanhamentos', {
    method: 'POST',
    token: tokenProf,
    body: {
      aluno_id: 1,
      turma_id: 1,
      disciplina_id: 3,
      bimestre: 2,
      media: 12.5,
      descricao: 'Teste de validação de escala.',
      tagsIds: [1],
    },
  });
  assert.equal(erroEscala.status, 400);

  // Professor registra acompanhamento no 2º Bimestre como RASCUNHO e depois envia
  const criarRascunho = await requestJson('/api/professor/acompanhamentos', {
    method: 'POST',
    token: tokenProf,
    body: {
      aluno_id: 1, // Lucas Silva
      turma_id: 1, // 6º Ano A
      disciplina_id: 3, // Matemática
      bimestre: 2,
      media: 7.8,
      frequencia_percentual: 96,
      descricao: 'Lucas manteve bom ritmo na resolução de equações no 2º bimestre.',
      tagsIds: [1, 2],
      enviarParaRevisao: true,
    },
  });
  assert.equal(criarRascunho.status, 201);
  const acompId = criarRascunho.data.id;
  assert.equal(criarRascunho.data.status, 'ENVIADO');

  // Responsável NÃO pode ver registro ENVIADO (ainda não publicado)
  const painelRespAntes = await requestJson('/api/responsavel/relatorios?bimestre=2', {
    token: tokenResp,
  });
  assert.equal(painelRespAntes.data.some((r) => r.id === acompId), false);

  // Admin revisa e altera com rastreabilidade
  const revisarAdmin = await requestJson(`/api/admin/acompanhamentos/${acompId}/revisar`, {
    method: 'PUT',
    token: tokenAdmin,
    body: {
      media: 8.2,
      descricao: 'Lucas manteve ótimo ritmo na resolução de equações e geometria no 2º bimestre.',
      justificativa: 'Acréscimo de ponto de projeto interdisciplinar validado pela coordenação.',
    },
  });
  assert.equal(revisarAdmin.status, 200);
  assert.equal(revisarAdmin.data.media, 8.2);

  // Admin publica o acompanhamento
  const publicarAdmin = await requestJson(`/api/admin/acompanhamentos/${acompId}/publicar`, {
    method: 'POST',
    token: tokenAdmin,
    body: { observacao_coordenacao: 'Aprovado e publicado.' },
  });
  assert.equal(publicarAdmin.status, 200);
  assert.equal(publicarAdmin.data.status, 'PUBLICADO');

  // Agora o Pai/Responsável visualiza o relatório PUBLICADO e registra ciência
  const painelRespDepois = await requestJson('/api/responsavel/relatorios?bimestre=2', {
    token: tokenResp,
  });
  assert.equal(painelRespDepois.data.some((r) => r.id === acompId), true);

  const ciencia = await requestJson(`/api/responsavel/acompanhamentos/${acompId}/ciencia`, {
    method: 'POST',
    token: tokenResp,
    body: { observacao_responsavel: 'Ciente do boletim do 2º bimestre. Obrigado!' },
  });
  assert.equal(ciencia.status, 200);
  assert.equal(ciencia.data.interacoes.length, 1);

  // Verifica trilha de rastreabilidade (Pilha LIFO)
  const historico = await requestJson(`/api/admin/acompanhamentos/${acompId}/historico`, {
    token: tokenAdmin,
  });
  assert.equal(historico.status, 200);
  assert.equal(historico.data.length >= 3, true);
  assert.equal(historico.data[0].acao, 'CIENCIA_RESPONSAVEL');

  // Verifica exportação de Excel (.xlsx)
  const excelRes = await requestJson('/api/admin/relatorios/exportar-excel?ano_letivo=2026', {
    token: tokenAdmin,
  });
  assert.equal(excelRes.status, 200);
  assert.ok(excelRes.buffer.length > 1000);
});
