/**
 * ============================================================================
 * MODELO DE DOMÍNIO ORIENTADO A OBJETOS (POO) - EDULL-KFKA (PI ADS.2)
 * ============================================================================
 * Aplica os pilares de Programação Orientada a Objetos:
 * - Abstração: Modelagem fiel das entidades escolares e do fluxo bimestral.
 * - Encapsulamento: Atributos privados (#) protegidos por métodos de negócio.
 * - Herança: Especialização de Usuario em Administrador, Professor e Responsavel.
 * - Polimorfismo: Comportamento específico de permissões e visibilidade por perfil.
 */

class RegraNegocioError extends Error {
  constructor(mensagem, codigoHttp = 400) {
    super(mensagem);
    this.name = 'RegraNegocioError';
    this.statusCode = codigoHttp;
  }
}

/**
 * Classe Base: Usuario
 */
class Usuario {
  #id;
  #nome;
  #email;
  #perfil;
  #ativo;

  constructor({ id, nome, email, perfil, ativo = true, cpf = null, telefone = null }) {
    if (new.target === Usuario) {
      throw new Error('A classe Usuario é abstrata e deve ser instanciada via subclasse.');
    }
    this.#id = id;
    this.#nome = nome;
    this.#email = email;
    this.#perfil = perfil;
    this.#ativo = Boolean(ativo);
    this.cpf = cpf;
    this.telefone = telefone;
  }

  get id() { return this.#id; }
  get nome() { return this.#nome; }
  get email() { return this.#email; }
  get perfil() { return this.#perfil; }
  get ativo() { return this.#ativo; }

  validarAtivo() {
    if (!this.#ativo) {
      throw new RegraNegocioError('Usuário inativo. Contate a secretaria escolar.', 403);
    }
  }

  // Métodos polimórficos sobrescritos pelas subclasses
  obterPermissoes() {
    return [];
  }

  podeVisualizarAcompanhamento(_acompanhamento, _contexto = {}) {
    return false;
  }

  paraJSON() {
    return {
      id: this.#id,
      nome: this.#nome,
      email: this.#email,
      perfil: this.#perfil,
      ativo: this.#ativo,
      cpf: this.cpf,
      telefone: this.telefone,
      permissoes: this.obterPermissoes(),
    };
  }
}

/**
 * Subclasse: Administrador
 */
class Administrador extends Usuario {
  constructor(dados) {
    super({ ...dados, perfil: 'ADMIN' });
    this.registroFuncional = dados.registro_funcional || dados.registroFuncional || null;
  }

  obterPermissoes() {
    return [
      'GERENCIAR_USUARIOS',
      'GERENCIAR_ALUNOS',
      'GERENCIAR_CURRICULO',
      'GERENCIAR_TURMAS_VINCULOS',
      'GERENCIAR_TAGS',
      'CONFIGURAR_BIMESTRES',
      'REVISAR_EDITAR_PUBLICAR_ACOMPANHAMENTOS',
      'EXPORTAR_EXCEL_GERENCIAL',
    ];
  }

  podeVisualizarAcompanhamento(_acompanhamento) {
    return true;
  }
}

/**
 * Subclasse: Professor
 */
class Professor extends Usuario {
  constructor(dados) {
    super({ ...dados, perfil: 'PROFESSOR' });
    this.registroFuncional = dados.registro_funcional || dados.registroFuncional || null;
    this.formacaoEspecialidade = dados.formacao_especialidade || dados.formacaoEspecialidade || null;
  }

  obterPermissoes() {
    return [
      'VISUALIZAR_TURMAS_VINCULADAS',
      'REGISTRAR_RASCUNHO_ACOMPANHAMENTO',
      'ENVIAR_ACOMPANHAMENTO_REVISAO',
      'TRATAR_DEVOLUCAO',
      'CONSULTAR_RETORNOS_RESPONSAVEIS',
    ];
  }

  podeVisualizarAcompanhamento(acompanhamento, { grafoVinculos } = {}) {
    if (Number(acompanhamento.professor_id) === Number(this.id)) return true;
    if (grafoVinculos) {
      return grafoVinculos.professorLecionaParaAluno(
        this.id,
        acompanhamento.turma_id,
        acompanhamento.disciplina_id,
        acompanhamento.aluno_id
      );
    }
    return false;
  }
}

/**
 * Subclasse: Responsavel (Pai / Mãe / Tutor Legal)
 */
class Responsavel extends Usuario {
  constructor(dados) {
    super({ ...dados, perfil: 'RESPONSAVEL' });
    this.parentescoPadrao = dados.parentesco_padrao || dados.parentescoPadrao || 'Responsável Legal';
  }

  obterPermissoes() {
    return [
      'VISUALIZAR_ALUNOS_VINCULADOS',
      'CONSULTAR_RELATORIOS_PUBLICADOS',
      'GERAR_BOLETIM_PDF',
      'REGISTRAR_CIENCIA_E_OBSERVACAO',
    ];
  }

  /**
   * Regra de negócio: Somente registros PUBLICADOS de alunos vinculados ao
   * responsável podem ser visualizados pelo Pai/Responsável.
   */
  podeVisualizarAcompanhamento(acompanhamento, { grafoVinculos, alunosVinculadosIds = [] } = {}) {
    if (acompanhamento.status !== 'PUBLICADO') {
      return false;
    }
    if (grafoVinculos) {
      return grafoVinculos.responsavelVinculadoAoAluno(this.id, acompanhamento.aluno_id);
    }
    return alunosVinculadosIds.map(Number).includes(Number(acompanhamento.aluno_id));
  }
}

/**
 * Factory Pattern para instanciar a subclasse correta de Usuario
 */
class FabricaUsuario {
  static criar(dados) {
    if (!dados) return null;
    switch (dados.perfil) {
      case 'ADMIN':
        return new Administrador(dados);
      case 'PROFESSOR':
        return new Professor(dados);
      case 'RESPONSAVEL':
        return new Responsavel(dados);
      default:
        throw new RegraNegocioError(`Perfil de usuário inválido: ${dados.perfil}`);
    }
  }
}

/**
 * Entidade de Domínio: PeriodoBimestral
 * Controla a abertura/encerramento do bimestre e a escala de notas da escola.
 */
class PeriodoBimestral {
  constructor({
    id,
    ano_letivo,
    bimestre,
    rotulo,
    data_hora_abertura,
    data_hora_encerramento,
    nota_minima = 0.0,
    nota_maxima = 10.0,
    media_referencia = 6.0,
    fechado_manualmente = 0,
  }) {
    this.id = id;
    this.anoLetivo = Number(ano_letivo);
    this.bimestre = Number(bimestre);
    this.rotulo = rotulo || `${bimestre}º Bimestre`;
    this.dataHoraAbertura = data_hora_abertura;
    this.dataHoraEncerramento = data_hora_encerramento;
    this.notaMinima = Number(nota_minima);
    this.notaMaxima = Number(nota_maxima);
    this.mediaReferencia = Number(media_referencia);
    this.fechadoManualmente = Boolean(fechado_manualmente);
  }

  estaAbertoParaDigitacao(agora = new Date()) {
    if (this.fechadoManualmente) return false;
    const inicio = new Date(this.dataHoraAbertura);
    const fim = new Date(this.dataHoraEncerramento);
    return agora >= inicio && agora <= fim;
  }

  validarPeriodoAberto(agora = new Date()) {
    if (this.fechadoManualmente) {
      throw new RegraNegocioError(
        `O período de digitação do ${this.rotulo}/${this.anoLetivo} foi encerrado manualmente pela Administração.`
      );
    }
    const inicio = new Date(this.dataHoraAbertura);
    const fim = new Date(this.dataHoraEncerramento);
    if (agora < inicio) {
      throw new RegraNegocioError(
        `O período de digitação do ${this.rotulo}/${this.anoLetivo} ainda não iniciou (abertura em ${this.dataHoraAbertura}).`
      );
    }
    if (agora > fim) {
      throw new RegraNegocioError(
        `O período de digitação do ${this.rotulo}/${this.anoLetivo} encerrou em ${this.dataHoraEncerramento}.`
      );
    }
  }

  validarMediaEscolar(media) {
    const valor = Number(media);
    if (Number.isNaN(valor)) {
      throw new RegraNegocioError('A média informada deve ser um valor numérico válido.');
    }
    if (valor < this.notaMinima || valor > this.notaMaxima) {
      throw new RegraNegocioError(
        `A média (${valor}) deve respeitar a escala definida pela escola: de ${this.notaMinima.toFixed(1)} a ${this.notaMaxima.toFixed(1)}.`
      );
    }
    return Math.round(valor * 10) / 10;
  }
}

/**
 * Entidade de Domínio: AcompanhamentoBimestral
 * Implementa a máquina de estados:
 * RASCUNHO -> ENVIADO -> DEVOLVIDO -> ENVIADO -> PUBLICADO
 * e gera snapshots imutáveis para rastreabilidade administrativa.
 */
class AcompanhamentoBimestral {
  static STATUS = {
    RASCUNHO: 'RASCUNHO',
    ENVIADO: 'ENVIADO',
    DEVOLVIDO: 'DEVOLVIDO',
    PUBLICADO: 'PUBLICADO',
  };

  constructor(dados) {
    this.id = dados.id || null;
    this.alunoId = Number(dados.aluno_id ?? dados.alunoId);
    this.turmaId = Number(dados.turma_id ?? dados.turmaId);
    this.disciplinaId = Number(dados.disciplina_id ?? dados.disciplinaId);
    this.professorId = Number(dados.professor_id ?? dados.professorId);
    this.anoLetivo = Number(dados.ano_letivo ?? dados.anoLetivo ?? 2026);
    this.bimestre = Number(dados.bimestre);
    this.media = Number(dados.media);
    this.frequenciaPercentual = Number(dados.frequencia_percentual ?? dados.frequenciaPercentual ?? 100);
    this.descricao = (dados.descricao || '').trim();
    this.status = dados.status || AcompanhamentoBimestral.STATUS.RASCUNHO;
    this.motivoDevolucao = dados.motivo_devolucao ?? dados.motivoDevolucao ?? null;
    this.observacaoCoordenacao = dados.observacao_coordenacao ?? dados.observacaoCoordenacao ?? null;
    this.tagsIds = Array.isArray(dados.tagsIds) ? dados.tagsIds.map(Number) : [];
  }

  validarDadosObrigatorios(periodoBimestral) {
    if (!this.alunoId || !this.turmaId || !this.disciplinaId || !this.professorId) {
      throw new RegraNegocioError(
        'O acompanhamento deve estar associado a um único aluno, turma, disciplina e professor.'
      );
    }
    if (![1, 2, 3, 4].includes(this.bimestre)) {
      throw new RegraNegocioError('O bimestre deve ser 1, 2, 3 ou 4.');
    }
    if (!this.descricao || this.descricao.length < 10) {
      throw new RegraNegocioError(
        'A descrição qualitativa do acompanhamento deve conter ao menos 10 caracteres.'
      );
    }
    if (this.frequenciaPercentual < 0 || this.frequenciaPercentual > 100) {
      throw new RegraNegocioError('A frequência percentual deve estar entre 0% e 100%.');
    }
    if (periodoBimestral) {
      this.media = periodoBimestral.validarMediaEscolar(this.media);
    }
  }

  validarPermissaoEdicaoProfessor() {
    if (
      this.status !== AcompanhamentoBimestral.STATUS.RASCUNHO &&
      this.status !== AcompanhamentoBimestral.STATUS.DEVOLVIDO
    ) {
      throw new RegraNegocioError(
        `O acompanhamento encontra-se com status "${this.status}" e não pode ser editado diretamente pelo professor.`
      );
    }
  }

  enviarParaRevisao() {
    this.validarPermissaoEdicaoProfessor();
    if (!this.tagsIds || this.tagsIds.length === 0) {
      throw new RegraNegocioError(
        'Selecione ao menos uma tag de acompanhamento antes de enviar para revisão administrativa.'
      );
    }
    this.status = AcompanhamentoBimestral.STATUS.ENVIADO;
  }

  devolverParaProfessor(motivo) {
    if (!motivo || motivo.trim().length < 5) {
      throw new RegraNegocioError(
        'Informe o motivo/orientação pedagógica para devolver o acompanhamento ao professor.'
      );
    }
    if (
      this.status !== AcompanhamentoBimestral.STATUS.ENVIADO &&
      this.status !== AcompanhamentoBimestral.STATUS.PUBLICADO
    ) {
      throw new RegraNegocioError(
        `Somente acompanhamentos enviados ou publicados podem ser devolvidos para ajustes (status atual: ${this.status}).`
      );
    }
    this.status = AcompanhamentoBimestral.STATUS.DEVOLVIDO;
    this.motivoDevolucao = motivo.trim();
  }

  publicarParaResponsaveis(observacaoCoordenacao = null) {
    if (this.status === AcompanhamentoBimestral.STATUS.RASCUNHO) {
      throw new RegraNegocioError(
        'Um rascunho ainda não enviado pelo professor não pode ser publicado diretamente.'
      );
    }
    this.status = AcompanhamentoBimestral.STATUS.PUBLICADO;
    if (observacaoCoordenacao !== null) {
      this.observacaoCoordenacao = observacaoCoordenacao;
    }
  }

  gerarSnapshotEstado() {
    return {
      media: this.media,
      frequencia_percentual: this.frequenciaPercentual,
      descricao: this.descricao,
      status: this.status,
      motivo_devolucao: this.motivoDevolucao,
      observacao_coordenacao: this.observacaoCoordenacao,
      tags_ids: [...this.tagsIds],
    };
  }
}

module.exports = {
  RegraNegocioError,
  Usuario,
  Administrador,
  Professor,
  Responsavel,
  FabricaUsuario,
  PeriodoBimestral,
  AcompanhamentoBimestral,
};
