const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

function garantirSeedInicial(forcarReset = false) {
  const db = getDb();

  const totalUsuarios = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
  if (totalUsuarios > 0 && !forcarReset) {
    return { seeded: false, message: 'Banco já contém dados iniciais.' };
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    if (forcarReset) {
      db.exec(`
        DELETE FROM interacoes_responsavel;
        DELETE FROM historico_acompanhamento;
        DELETE FROM acompanhamento_tags;
        DELETE FROM acompanhamentos;
        DELETE FROM professor_turma_disciplina;
        DELETE FROM aluno_turma;
        DELETE FROM responsavel_aluno;
        DELETE FROM periodos_bimestrais;
        DELETE FROM tags;
        DELETE FROM disciplinas;
        DELETE FROM areas_conhecimento;
        DELETE FROM turmas;
        DELETE FROM alunos;
        DELETE FROM usuarios;
        DELETE FROM sqlite_sequence;
      `);
    }

    const senhaHashPadrao = bcrypt.hashSync('123456', 10);

    // 1. USUÁRIOS (Admin, Professores e Pais/Responsáveis)
    const insertUsuario = db.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, perfil, cpf, telefone, registro_funcional, formacao_especialidade, parentesco_padrao, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const adminId = insertUsuario.run(
      'Dra. Helena Vasconcelos',
      'admin@escola.edu.br',
      senhaHashPadrao,
      'ADMIN',
      '111.222.333-44',
      '(11) 98800-1000',
      'ADM-2026-001',
      'Pedagogia e Gestão Escolar',
      null,
      1
    ).lastInsertRowid;

    const profCarlosId = insertUsuario.run(
      'Prof. Carlos Eduardo Mendes',
      'carlos.mendes@escola.edu.br',
      senhaHashPadrao,
      'PROFESSOR',
      '222.333.444-55',
      '(11) 98800-2001',
      'PROF-2026-101',
      'Licenciatura em Matemática e Ciências da Natureza',
      null,
      1
    ).lastInsertRowid;

    const profMarianaId = insertUsuario.run(
      'Profa. Mariana Alves Costa',
      'mariana.costa@escola.edu.br',
      senhaHashPadrao,
      'PROFESSOR',
      '333.444.555-66',
      '(11) 98800-2002',
      'PROF-2026-102',
      'Licenciatura em Letras, História e Geografia',
      null,
      1
    ).lastInsertRowid;

    const profRicardoId = insertUsuario.run(
      'Prof. Ricardo Fontes',
      'ricardo.fontes@escola.edu.br',
      senhaHashPadrao,
      'PROFESSOR',
      '444.555.666-77',
      '(11) 98800-2003',
      'PROF-2026-103',
      'Educação Física e Artes Visuais',
      null,
      1
    ).lastInsertRowid;

    const respRobertoId = insertUsuario.run(
      'Roberto Almeida Silva',
      'roberto.silva@familia.com',
      senhaHashPadrao,
      'RESPONSAVEL',
      '555.666.777-88',
      '(11) 99111-3001',
      null,
      null,
      'Pai',
      1
    ).lastInsertRowid;

    const respPatriciaId = insertUsuario.run(
      'Patrícia Almeida Silva',
      'patricia.silva@familia.com',
      senhaHashPadrao,
      'RESPONSAVEL',
      '666.777.888-99',
      '(11) 99111-3002',
      null,
      null,
      'Mãe',
      1
    ).lastInsertRowid;

    const respFernandaId = insertUsuario.run(
      'Fernanda Oliveira Santos',
      'fernanda.oliveira@familia.com',
      senhaHashPadrao,
      'RESPONSAVEL',
      '777.888.999-00',
      '(11) 99111-3003',
      null,
      null,
      'Mãe',
      1
    ).lastInsertRowid;

    const respMarcosId = insertUsuario.run(
      'Marcos Vinícius Rocha',
      'marcos.rocha@familia.com',
      senhaHashPadrao,
      'RESPONSAVEL',
      '888.999.000-11',
      '(11) 99111-3004',
      null,
      null,
      'Pai',
      1
    ).lastInsertRowid;

    // 2. ÁREAS DE CONHECIMENTO (BNCC Ensino Fundamental)
    const insertArea = db.prepare(`
      INSERT INTO areas_conhecimento (codigo, nome, descricao, cor, ativo)
      VALUES (?, ?, ?, ?, 1)
    `);

    const areaLingId = insertArea.run(
      'LING',
      'Linguagens e Suas Tecnologias',
      'Língua Portuguesa, Artes, Educação Física e Língua Inglesa no Ensino Fundamental.',
      '#2563eb'
    ).lastInsertRowid;

    const areaMatId = insertArea.run(
      'MAT',
      'Matemática',
      'Raciocínio lógico, álgebra, geometria, grandezas, medidas e probabilidade.',
      '#059669'
    ).lastInsertRowid;

    const areaCnatId = insertArea.run(
      'CNAT',
      'Ciências da Natureza',
      'Matéria e energia, vida e evolução, Terra e Universo.',
      '#0891b2'
    ).lastInsertRowid;

    const areaChumId = insertArea.run(
      'CHUM',
      'Ciências Humanas',
      'História, Geografia, cidadania e leitura crítica do espaço social.',
      '#d97706'
    ).lastInsertRowid;

    // 3. DISCIPLINAS CLASSIFICADAS POR ÁREA
    const insertDisc = db.prepare(`
      INSERT INTO disciplinas (area_id, codigo, nome, carga_horaria_anual, ativo)
      VALUES (?, ?, ?, ?, 1)
    `);

    const discPortId = insertDisc.run(areaLingId, 'PORT-EF', 'Língua Portuguesa', 200).lastInsertRowid;
    const discArteId = insertDisc.run(areaLingId, 'ARTE-EF', 'Artes', 80).lastInsertRowid;
    const discMatId = insertDisc.run(areaMatId, 'MAT-EF', 'Matemática', 200).lastInsertRowid;
    const discCienId = insertDisc.run(areaCnatId, 'CIEN-EF', 'Ciências', 120).lastInsertRowid;
    const discHistId = insertDisc.run(areaChumId, 'HIST-EF', 'História', 120).lastInsertRowid;
    const discGeogId = insertDisc.run(areaChumId, 'GEOG-EF', 'Geografia', 120).lastInsertRowid;

    // 4. TURMAS DO ENSINO FUNDAMENTAL
    const insertTurma = db.prepare(`
      INSERT INTO turmas (codigo, nome, serie, ano_letivo, turno, sala, ativo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const turma6AId = insertTurma.run(
      'EF-6A-2026',
      '6º Ano A - Ensino Fundamental II',
      '6º Ano',
      2026,
      'MANHA',
      'Sala 101 - Bloco A'
    ).lastInsertRowid;

    const turma5AId = insertTurma.run(
      'EF-5A-2026',
      '5º Ano A - Ensino Fundamental I',
      '5º Ano',
      2026,
      'MANHA',
      'Sala 104 - Bloco A'
    ).lastInsertRowid;

    const turma7BId = insertTurma.run(
      'EF-7B-2026',
      '7º Ano B - Ensino Fundamental II',
      '7º Ano',
      2026,
      'TARDE',
      'Sala 202 - Bloco B'
    ).lastInsertRowid;

    // 5. ALUNOS
    const insertAluno = db.prepare(`
      INSERT INTO alunos (matricula, nome, data_nascimento, serie_atual, observacoes_pedagogicas, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const alunoLucasId = insertAluno.run(
      '20260001',
      'Lucas Almeida Silva',
      '2014-04-15',
      '6º Ano',
      'Ótima participação em atividades em grupo; estímulo contínuo em resolução de problemas matemáticos.'
    ).lastInsertRowid;

    const alunaBeatrizId = insertAluno.run(
      '20260002',
      'Beatriz Almeida Silva',
      '2015-08-22',
      '5º Ano',
      'Excelente hábito de leitura e expressão escrita.'
    ).lastInsertRowid;

    const alunoGabrielId = insertAluno.run(
      '20260003',
      'Gabriel Oliveira Santos',
      '2014-01-30',
      '6º Ano',
      'Necessita acompanhamento próximo na entrega de tarefas de casa.'
    ).lastInsertRowid;

    const alunaSofiaId = insertAluno.run(
      '20260004',
      'Sofia Oliveira Santos',
      '2013-06-11',
      '7º Ano',
      'Aluna monitora de laboratório de Ciências.'
    ).lastInsertRowid;

    const alunoPedroId = insertAluno.run(
      '20260005',
      'Pedro Henrique Rocha',
      '2014-09-05',
      '6º Ano',
      'Demonstra evolução consistente ao longo dos bimestres.'
    ).lastInsertRowid;

    const alunaHelenaId = insertAluno.run(
      '20260006',
      'Helena Martins Ferreira',
      '2015-03-19',
      '5º Ano',
      'Participativa e colaborativa com os colegas.'
    ).lastInsertRowid;

    // 6. VÍNCULOS RESPONSÁVEL × ALUNO (N:N)
    // Demonstra: Roberto e Patrícia são responsáveis tanto de Lucas (6ºA) quanto de Beatriz (5ºA).
    const insertRespAluno = db.prepare(`
      INSERT INTO responsavel_aluno (responsavel_id, aluno_id, parentesco, autorizado_acesso)
      VALUES (?, ?, ?, 1)
    `);

    insertRespAluno.run(respRobertoId, alunoLucasId, 'Pai');
    insertRespAluno.run(respRobertoId, alunaBeatrizId, 'Pai');
    insertRespAluno.run(respPatriciaId, alunoLucasId, 'Mãe');
    insertRespAluno.run(respPatriciaId, alunaBeatrizId, 'Mãe');
    insertRespAluno.run(respFernandaId, alunoGabrielId, 'Mãe');
    insertRespAluno.run(respFernandaId, alunaSofiaId, 'Mãe');
    insertRespAluno.run(respMarcosId, alunoPedroId, 'Pai');
    insertRespAluno.run(respMarcosId, alunaHelenaId, 'Tio / Responsável Legal');

    // 7. ENTURMAÇÃO (ALUNO × TURMA)
    const insertAlunoTurma = db.prepare(`
      INSERT INTO aluno_turma (aluno_id, turma_id, situacao)
      VALUES (?, ?, 'CURSANDO')
    `);

    insertAlunoTurma.run(alunoLucasId, turma6AId);
    insertAlunoTurma.run(alunoGabrielId, turma6AId);
    insertAlunoTurma.run(alunoPedroId, turma6AId);
    insertAlunoTurma.run(alunaBeatrizId, turma5AId);
    insertAlunoTurma.run(alunaHelenaId, turma5AId);
    insertAlunoTurma.run(alunaSofiaId, turma7BId);

    // 8. VÍNCULOS PROFESSOR × TURMA × DISCIPLINA
    const insertProfTurmaDisc = db.prepare(`
      INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina_id, ativo)
      VALUES (?, ?, ?, 1)
    `);

    // Prof. Carlos leciona Matemática e Ciências no 6ºA, 5ºA e 7ºB
    insertProfTurmaDisc.run(profCarlosId, turma6AId, discMatId);
    insertProfTurmaDisc.run(profCarlosId, turma6AId, discCienId);
    insertProfTurmaDisc.run(profCarlosId, turma5AId, discMatId);
    insertProfTurmaDisc.run(profCarlosId, turma7BId, discCienId);

    // Profa. Mariana leciona Língua Portuguesa, História e Geografia
    insertProfTurmaDisc.run(profMarianaId, turma6AId, discPortId);
    insertProfTurmaDisc.run(profMarianaId, turma6AId, discHistId);
    insertProfTurmaDisc.run(profMarianaId, turma5AId, discPortId);
    insertProfTurmaDisc.run(profMarianaId, turma5AId, discGeogId);
    insertProfTurmaDisc.run(profMarianaId, turma7BId, discPortId);

    // Prof. Ricardo leciona Artes
    insertProfTurmaDisc.run(profRicardoId, turma6AId, discArteId);
    insertProfTurmaDisc.run(profRicardoId, turma5AId, discArteId);

    // 9. TAGS PEDAGÓGICAS E DE ACOMPANHAMENTO
    const insertTag = db.prepare(`
      INSERT INTO tags (nome, categoria, natureza, cor, descricao, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const tagParticipativoId = insertTag.run(
      'Participação Ativa',
      'PARTICIPACAO',
      'POSITIVA',
      '#16a34a',
      'Participa ativamente das aulas, tira dúvidas e contribui com os debates.'
    ).lastInsertRowid;

    const tagEvolucaoId = insertTag.run(
      'Ótima Evolução no Bimestre',
      'DESEMPENHO',
      'POSITIVA',
      '#2563eb',
      'Apresentou progresso consistente nas avaliações e atividades práticas.'
    ).lastInsertRowid;

    const tagTarefasEmDiaId = insertTag.run(
      'Tarefas e Trabalhos em Dia',
      'ASSIDUIDADE',
      'POSITIVA',
      '#0d9488',
      'Entrega pontualmente todas as lições de casa e projetos solicitados.'
    ).lastInsertRowid;

    const tagColaborativoId = insertTag.run(
      'Colaborativo em Grupo',
      'COMPORTAMENTO',
      'POSITIVA',
      '#4f46e5',
      'Demonstra empatia, respeito às regras de convivência e espírito de equipe.'
    ).lastInsertRowid;

    const tagAtencaoConcentracaoId = insertTag.run(
      'Atenção à Concentração em Sala',
      'COMPORTAMENTO',
      'ATENCAO',
      '#d97706',
      'Dispersa-se ocasionalmente durante explicações expositivas; requer mediação.'
    ).lastInsertRowid;

    const tagPendenciaTarefasId = insertTag.run(
      'Pendência em Lições de Casa',
      'ASSIDUIDADE',
      'ATENCAO',
      '#dc2626',
      'Deixou de entregar parte das atividades domiciliares previstas no bimestre.'
    ).lastInsertRowid;

    const tagReforcoRecomendadoId = insertTag.run(
      'Recomendado Plantão de Dúvidas',
      'RECOMENDACAO',
      'ATENCAO',
      '#9333ea',
      'Sugere-se participação nas oficinas de apoio pedagógico no contraturno.'
    ).lastInsertRowid;

    const tagDestaqueLeituraId = insertTag.run(
      'Destaque em Leitura e Interpretação',
      'DESEMPENHO',
      'POSITIVA',
      '#0284c7',
      'Excelente fluência leitora, repertório vocabular e argumentação escrita.'
    ).lastInsertRowid;

    // 10. PERÍODOS DE DIGITAÇÃO DOS 4 BIMESTRES (Ano Letivo 2026)
    const insertPeriodo = db.prepare(`
      INSERT INTO periodos_bimestrais (ano_letivo, bimestre, rotulo, data_hora_abertura, data_hora_encerramento, nota_minima, nota_maxima, media_referencia, fechado_manualmente)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPeriodo.run(2026, 1, '1º Bimestre', '2026-02-01T08:00', '2026-12-20T23:59', 0.0, 10.0, 6.0, 0);
    insertPeriodo.run(2026, 2, '2º Bimestre', '2026-05-01T08:00', '2026-12-20T23:59', 0.0, 10.0, 6.0, 0);
    insertPeriodo.run(2026, 3, '3º Bimestre', '2026-08-01T08:00', '2026-12-20T23:59', 0.0, 10.0, 6.0, 0);
    insertPeriodo.run(2026, 4, '4º Bimestre', '2026-10-01T08:00', '2026-12-20T23:59', 0.0, 10.0, 6.0, 0);

    // 11. ACOMPANHAMENTOS BIMESTRAIS DE EXEMPLO (Cobrindo todos os status do fluxo)
    const insertAcomp = db.prepare(`
      INSERT INTO acompanhamentos (
        aluno_id, turma_id, disciplina_id, professor_id, ano_letivo, bimestre,
        media, frequencia_percentual, descricao, status,
        motivo_devolucao, observacao_coordenacao, revisado_por,
        data_envio, data_revisao, data_publicacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAcompTag = db.prepare(`
      INSERT INTO acompanhamento_tags (acompanhamento_id, tag_id) VALUES (?, ?)
    `);

    const insertHist = db.prepare(`
      INSERT INTO historico_acompanhamento (
        acompanhamento_id, usuario_id, acao, status_anterior, status_posterior,
        estado_anterior_json, estado_posterior_json, justificativa, data_hora
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Caso 1: PUBLICADO (Lucas Silva - 6ºA - Matemática - 1º Bimestre - Prof. Carlos)
    const acomp1Id = insertAcomp.run(
      alunoLucasId,
      turma6AId,
      discMatId,
      profCarlosId,
      2026,
      1,
      8.6,
      98.0,
      'O aluno Lucas demonstrou excelente domínio nas operações com números naturais, frações e resolução de situações-problema. Participa com entusiasmo das aulas e colabora ativamente com os colegas.',
      'PUBLICADO',
      null,
      'Relatório revisado e validado pela Coordenação Pedagógica. Parabéns pelo acompanhamento detalhado.',
      adminId,
      '2026-04-15 14:20:00',
      '2026-04-16 09:30:00',
      '2026-04-16 09:30:00'
    ).lastInsertRowid;

    insertAcompTag.run(acomp1Id, tagParticipativoId);
    insertAcompTag.run(acomp1Id, tagEvolucaoId);
    insertAcompTag.run(acomp1Id, tagTarefasEmDiaId);

    insertHist.run(
      acomp1Id,
      profCarlosId,
      'CRIACAO_RASCUNHO',
      null,
      'RASCUNHO',
      null,
      JSON.stringify({ media: 8.5, descricao: 'O aluno Lucas demonstrou bom domínio em frações e situações-problema.', status: 'RASCUNHO' }),
      'Registro inicial do professor.',
      '2026-04-14 10:15:00'
    );
    insertHist.run(
      acomp1Id,
      profCarlosId,
      'ENVIO_REVISAO',
      'RASCUNHO',
      'ENVIADO',
      JSON.stringify({ media: 8.5, status: 'RASCUNHO' }),
      JSON.stringify({ media: 8.5, status: 'ENVIADO', tags: ['Participação Ativa', 'Ótima Evolução no Bimestre'] }),
      'Enviado pelo professor para revisão administrativa.',
      '2026-04-15 14:20:00'
    );
    insertHist.run(
      acomp1Id,
      adminId,
      'EDICAO_ADMINISTRATIVA',
      'ENVIADO',
      'ENVIADO',
      JSON.stringify({ media: 8.5, descricao: 'O aluno Lucas demonstrou bom domínio em frações e situações-problema.' }),
      JSON.stringify({ media: 8.6, descricao: 'O aluno Lucas demonstrou excelente domínio nas operações com números naturais, frações e resolução de situações-problema. Participa com entusiasmo das aulas e colabora ativamente com os colegas.' }),
      'Ajuste de arredondamento da média bimestral conforme pauta e enriquecimento textual pela coordenação.',
      '2026-04-16 09:25:00'
    );
    insertHist.run(
      acomp1Id,
      adminId,
      'PUBLICACAO',
      'ENVIADO',
      'PUBLICADO',
      JSON.stringify({ status: 'ENVIADO', media: 8.6 }),
      JSON.stringify({ status: 'PUBLICADO', media: 8.6 }),
      'Aprovado e publicado para visualização da família.',
      '2026-04-16 09:30:00'
    );

    // Caso 2: PUBLICADO (Lucas Silva - 6ºA - Língua Portuguesa - 1º Bimestre - Profa. Mariana)
    const acomp2Id = insertAcomp.run(
      alunoLucasId,
      turma6AId,
      discPortId,
      profMarianaId,
      2026,
      1,
      9.2,
      100.0,
      'Lucas destaca-se na interpretação de textos narrativos e crônicas, apresentando vocabulário rico e coesão textual nas produções escritas do bimestre.',
      'PUBLICADO',
      null,
      'Aprovado para publicação.',
      adminId,
      '2026-04-15 16:00:00',
      '2026-04-16 10:00:00',
      '2026-04-16 10:00:00'
    ).lastInsertRowid;

    insertAcompTag.run(acomp2Id, tagDestaqueLeituraId);
    insertAcompTag.run(acomp2Id, tagTarefasEmDiaId);
    insertAcompTag.run(acomp2Id, tagColaborativoId);

    insertHist.run(
      acomp2Id,
      profMarianaId,
      'ENVIO_REVISAO',
      'RASCUNHO',
      'ENVIADO',
      null,
      JSON.stringify({ media: 9.2, status: 'ENVIADO' }),
      'Enviado para revisão.',
      '2026-04-15 16:00:00'
    );
    insertHist.run(
      acomp2Id,
      adminId,
      'PUBLICACAO',
      'ENVIADO',
      'PUBLICADO',
      JSON.stringify({ status: 'ENVIADO' }),
      JSON.stringify({ status: 'PUBLICADO' }),
      'Publicado aos responsáveis.',
      '2026-04-16 10:00:00'
    );

    // Caso 3: PUBLICADO (Beatriz Silva - 5ºA - Língua Portuguesa - 1º Bimestre - Profa. Mariana)
    const acomp3Id = insertAcomp.run(
      alunaBeatrizId,
      turma5AId,
      discPortId,
      profMarianaId,
      2026,
      1,
      9.5,
      100.0,
      'Beatriz demonstra encantamento pelas rodas de leitura e produziu textos criativos com excelente domínio ortográfico para o 5º ano.',
      'PUBLICADO',
      null,
      'Excelente registro pedagógico.',
      adminId,
      '2026-04-15 17:10:00',
      '2026-04-16 11:00:00',
      '2026-04-16 11:00:00'
    ).lastInsertRowid;

    insertAcompTag.run(acomp3Id, tagDestaqueLeituraId);
    insertAcompTag.run(acomp3Id, tagParticipativoId);
    insertAcompTag.run(acomp3Id, tagEvolucaoId);

    insertHist.run(
      acomp3Id,
      adminId,
      'PUBLICACAO',
      'ENVIADO',
      'PUBLICADO',
      JSON.stringify({ status: 'ENVIADO' }),
      JSON.stringify({ status: 'PUBLICADO', media: 9.5 }),
      'Publicado aos responsáveis.',
      '2026-04-16 11:00:00'
    );

    // Caso 4: PUBLICADO (Beatriz Silva - 5ºA - Matemática - 1º Bimestre - Prof. Carlos)
    const acomp4Id = insertAcomp.run(
      alunaBeatrizId,
      turma5AId,
      discMatId,
      profCarlosId,
      2026,
      1,
      8.8,
      96.0,
      'Beatriz compreende com clareza o sistema de numeração decimal e geometria plana, mantendo caderno e atividades sempre organizados.',
      'PUBLICADO',
      null,
      'Aprovado e publicado.',
      adminId,
      '2026-04-15 17:30:00',
      '2026-04-16 11:15:00',
      '2026-04-16 11:15:00'
    ).lastInsertRowid;

    insertAcompTag.run(acomp4Id, tagTarefasEmDiaId);
    insertAcompTag.run(acomp4Id, tagEvolucaoId);

    insertHist.run(
      acomp4Id,
      adminId,
      'PUBLICACAO',
      'ENVIADO',
      'PUBLICADO',
      JSON.stringify({ status: 'ENVIADO' }),
      JSON.stringify({ status: 'PUBLICADO', media: 8.8 }),
      'Publicado aos responsáveis.',
      '2026-04-16 11:15:00'
    );

    // Caso 5: ENVIADO aguardando revisão do Admin (Gabriel Oliveira - 6ºA - Matemática - 1º Bimestre - Prof. Carlos)
    const acomp5Id = insertAcomp.run(
      alunoGabrielId,
      turma6AId,
      discMatId,
      profCarlosId,
      2026,
      1,
      5.8,
      90.0,
      'Gabriel apresenta potencial para compreender os conceitos algébricos, porém deixou de entregar três listas de exercícios no bimestre e precisa reforçar a atenção durante a correção em lousa.',
      'ENVIADO',
      null,
      null,
      null,
      '2026-11-08 15:40:00',
      null,
      null
    ).lastInsertRowid;

    insertAcompTag.run(acomp5Id, tagAtencaoConcentracaoId);
    insertAcompTag.run(acomp5Id, tagPendenciaTarefasId);
    insertAcompTag.run(acomp5Id, tagReforcoRecomendadoId);

    insertHist.run(
      acomp5Id,
      profCarlosId,
      'ENVIO_REVISAO',
      'RASCUNHO',
      'ENVIADO',
      JSON.stringify({ status: 'RASCUNHO', media: 5.8 }),
      JSON.stringify({ status: 'ENVIADO', media: 5.8 }),
      'Enviado para análise da coordenação pedagógica.',
      '2026-11-08 15:40:00'
    );

    // Caso 6: ENVIADO aguardando revisão do Admin (Pedro Rocha - 6ºA - Ciências - 1º Bimestre - Prof. Carlos)
    const acomp6Id = insertAcomp.run(
      alunoPedroId,
      turma6AId,
      discCienId,
      profCarlosId,
      2026,
      1,
      8.0,
      95.0,
      'Pedro demonstrou grande curiosidade científica nos experimentos sobre ecossistemas e camadas da Terra, trabalhando muito bem em equipe.',
      'ENVIADO',
      null,
      null,
      null,
      '2026-11-08 16:10:00',
      null,
      null
    ).lastInsertRowid;

    insertAcompTag.run(acomp6Id, tagParticipativoId);
    insertAcompTag.run(acomp6Id, tagColaborativoId);

    insertHist.run(
      acomp6Id,
      profCarlosId,
      'ENVIO_REVISAO',
      'RASCUNHO',
      'ENVIADO',
      JSON.stringify({ status: 'RASCUNHO', media: 8.0 }),
      JSON.stringify({ status: 'ENVIADO', media: 8.0 }),
      'Enviado para revisão administrativa.',
      '2026-11-08 16:10:00'
    );

    // Caso 7: DEVOLVIDO para ajustes do Professor (Gabriel Oliveira - 6ºA - Ciências - 1º Bimestre - Prof. Carlos)
    const acomp7Id = insertAcomp.run(
      alunoGabrielId,
      turma6AId,
      discCienId,
      profCarlosId,
      2026,
      1,
      6.2,
      92.0,
      'Gabriel realizou o trabalho prático de laboratório, mas precisa organizar melhor o caderno de relatórios.',
      'DEVOLVIDO',
      'Prof. Carlos, favor detalhar no parecer quais estratégias pedagógicas de apoio foram combinadas com o aluno para o próximo bimestre antes de publicarmos à família.',
      'Aguardando complementação qualitativa.',
      adminId,
      '2026-11-07 11:00:00',
      '2026-11-08 09:15:00',
      null
    ).lastInsertRowid;

    insertAcompTag.run(acomp7Id, tagAtencaoConcentracaoId);

    insertHist.run(
      acomp7Id,
      profCarlosId,
      'ENVIO_REVISAO',
      'RASCUNHO',
      'ENVIADO',
      null,
      JSON.stringify({ status: 'ENVIADO', media: 6.2 }),
      'Envio inicial do professor.',
      '2026-11-07 11:00:00'
    );
    insertHist.run(
      acomp7Id,
      adminId,
      'DEVOLUCAO_AJUSTES',
      'ENVIADO',
      'DEVOLVIDO',
      JSON.stringify({ status: 'ENVIADO', media: 6.2 }),
      JSON.stringify({ status: 'DEVOLVIDO', motivo_devolucao: 'Favor detalhar estratégias pedagógicas de apoio.' }),
      'Prof. Carlos, favor detalhar no parecer quais estratégias pedagógicas de apoio foram combinadas com o aluno para o próximo bimestre antes de publicarmos à família.',
      '2026-11-08 09:15:00'
    );

    // Caso 8: RASCUNHO em elaboração pelo Professor (Lucas Silva - 6ºA - Ciências - 1º Bimestre - Prof. Carlos)
    const acomp8Id = insertAcomp.run(
      alunoLucasId,
      turma6AId,
      discCienId,
      profCarlosId,
      2026,
      1,
      8.9,
      100.0,
      'Lucas participou ativamente das aulas de laboratório sobre células e cadeia alimentar, entregando relatórios bem ilustrados.',
      'RASCUNHO',
      null,
      null,
      null,
      null,
      null,
      null
    ).lastInsertRowid;

    insertAcompTag.run(acomp8Id, tagParticipativoId);
    insertAcompTag.run(acomp8Id, tagTarefasEmDiaId);

    insertHist.run(
      acomp8Id,
      profCarlosId,
      'CRIACAO_RASCUNHO',
      null,
      'RASCUNHO',
      null,
      JSON.stringify({ status: 'RASCUNHO', media: 8.9 }),
      'Rascunho salvo pelo professor.',
      '2026-11-09 08:30:00'
    );

    // 12. INTERAÇÃO / CIÊNCIA DO PAI/RESPONSÁVEL NOS RELATÓRIOS PUBLICADOS
    const insertInteracao = db.prepare(`
      INSERT INTO interacoes_responsavel (
        acompanhamento_id, responsavel_id, ciencia_confirmada, data_ciencia,
        observacao_responsavel, resposta_escola, respondido_por, data_resposta
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?)
    `);

    insertInteracao.run(
      acomp1Id,
      respRobertoId,
      '2026-04-17 19:45:00',
      'Agradecemos o cuidado do Prof. Carlos! Estamos acompanhando os estudos de Matemática do Lucas em casa todas as terças e quintas.',
      'Muito obrigado pela parceria, Sr. Roberto! O incentivo familiar tem feito toda a diferença.',
      profCarlosId,
      '2026-04-18 10:15:00'
    );

    db.exec('COMMIT;');
    return { seeded: true, message: 'Dados iniciais (seed) inseridos com sucesso!' };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

if (require.main === module) {
  const resultado = garantirSeedInicial(true);
  console.log(resultado.message);
}

module.exports = { garantirSeedInicial };
