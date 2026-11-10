const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'EduLL-Kfka API - Acompanhamento Acadêmico Bimestral (Ensino Fundamental)',
    version: '1.0.0',
    description:
      'API RESTful integrada para registro, revisão administrativa com rastreabilidade, publicação e acompanhamento bimestral de alunos do Ensino Fundamental (PI ADS.2).',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor Local de Desenvolvimento / Produção',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Realiza login e retorna token JWT + perfil polimórfico (ADMIN, PROFESSOR ou RESPONSAVEL)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: {
                  email: { type: 'string', example: 'admin@escola.edu.br' },
                  senha: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Autenticado com sucesso' },
          401: { description: 'Credenciais inválidas' },
        },
      },
    },
    '/api/auth/perfis-demo': {
      get: {
        tags: ['Autenticação'],
        summary: 'Lista contas de demonstração ativas por perfil para acesso rápido',
        security: [],
        responses: {
          200: { description: 'Lista de usuários de demonstração' },
        },
      },
    },
    '/api/admin/usuarios': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Lista professores, pais/responsáveis e administradores cadastrados',
        responses: { 200: { description: 'Lista de usuários' } },
      },
      post: {
        tags: ['Módulo Administrador'],
        summary: 'Cadastra novo usuário (Professor, Pai/Responsável ou Administrador)',
        responses: { 201: { description: 'Usuário criado' } },
      },
    },
    '/api/admin/alunos': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Lista alunos com turmas e múltiplos responsáveis vinculados',
        responses: { 200: { description: 'Lista de alunos' } },
      },
      post: {
        tags: ['Módulo Administrador'],
        summary: 'Cadastra novo aluno e estabelece vínculos com turma e responsáveis',
        responses: { 201: { description: 'Aluno cadastrado' } },
      },
    },
    '/api/admin/curriculo': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Retorna Áreas de Conhecimento, Disciplinas e a Árvore Curricular N-ária',
        responses: { 200: { description: 'Estrutura curricular' } },
      },
    },
    '/api/admin/turmas': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Lista turmas e a Matriz de Vínculos Professor × Disciplina × Aluno',
        responses: { 200: { description: 'Turmas e vínculos' } },
      },
    },
    '/api/admin/tags': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Lista tags pedagógicas para classificação de acompanhamentos',
        responses: { 200: { description: 'Lista de tags' } },
      },
    },
    '/api/admin/periodos': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Lista os períodos de digitação do 1º, 2º, 3º e 4º bimestres e escala de notas',
        responses: { 200: { description: 'Períodos bimestrais' } },
      },
    },
    '/api/admin/acompanhamentos': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Lista acompanhamentos e a Fila de Revisão Administrativa (FIFO)',
        responses: { 200: { description: 'Acompanhamentos e fila de revisão' } },
      },
    },
    '/api/admin/acompanhamentos/{id}/revisar': {
      put: {
        tags: ['Módulo Administrador'],
        summary: 'Altera acompanhamento com rastreabilidade completa (estado anterior e posterior)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Acompanhamento revisado e auditado' } },
      },
    },
    '/api/admin/acompanhamentos/{id}/devolver': {
      post: {
        tags: ['Módulo Administrador'],
        summary: 'Devolve acompanhamento ao professor para ajustes',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Acompanhamento devolvido' } },
      },
    },
    '/api/admin/acompanhamentos/{id}/publicar': {
      post: {
        tags: ['Módulo Administrador'],
        summary: 'Publica acompanhamento aos responsáveis vinculados',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Acompanhamento publicado' } },
      },
    },
    '/api/admin/relatorios/exportar-excel': {
      get: {
        tags: ['Módulo Administrador'],
        summary: 'Exporta dados gerenciais e trilha de auditoria em formato .xlsx compatível com Excel',
        responses: { 200: { description: 'Arquivo Excel (.xlsx)' } },
      },
    },
    '/api/professor/painel': {
      get: {
        tags: ['Módulo Professor'],
        summary: 'Retorna apenas turmas, disciplinas, alunos e períodos vinculados ao professor autenticado',
        responses: { 200: { description: 'Painel do professor' } },
      },
    },
    '/api/professor/acompanhamentos': {
      post: {
        tags: ['Módulo Professor'],
        summary: 'Registra acompanhamento bimestral (rascunho ou envio) validando vínculo e período aberto',
        responses: { 201: { description: 'Acompanhamento salvo' } },
      },
    },
    '/api/responsavel/painel': {
      get: {
        tags: ['Módulo Pai/Responsável'],
        summary: 'Lista alunos vinculados ao responsável e somente relatórios com status PUBLICADO',
        responses: { 200: { description: 'Painel do responsável' } },
      },
    },
    '/api/responsavel/acompanhamentos/{id}/ciencia': {
      post: {
        tags: ['Módulo Pai/Responsável'],
        summary: 'Registra confirmação de ciência da família e encaminha observação à escola',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Ciência registrada' } },
      },
    },
  },
};

module.exports = swaggerDocument;
