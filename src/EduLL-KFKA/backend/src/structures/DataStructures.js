/**
 * ============================================================================
 * MÓDULO DE ESTRUTURAS DE DADOS APLICADAS AO DOMÍNIO ESCOLAR (PI ADS.2)
 * ============================================================================
 * Implementa estruturas de dados clássicas aplicadas diretamente às regras de
 * negócio do Sistema de Acompanhamento Acadêmico Bimestral:
 *
 * 1. FilaRevisao (Queue - FIFO): Gerencia a fila de acompanhamentos enviados
 *    pelos professores aguardando revisão da Coordenação/Administração.
 * 2. PilhaHistorico (Stack - LIFO): Organiza os registros de rastreabilidade
 *    e auditoria do estado mais recente para o estado inicial.
 * 3. GrafoVinculosEscolares (Lista de Adjacência + Hash Map): Verifica em O(1)
 *    os vínculos Professor × Disciplina × Turma × Aluno e Responsável × Aluno.
 * 4. ArvoreCurricular (Árvore Hierárquica N-ária): Agrupa Áreas de Conhecimento,
 *    Disciplinas e Turmas vinculadas.
 */

class NoLista {
  constructor(valor) {
    this.valor = valor;
    this.proximo = null;
  }
}

/**
 * 1. FILA ENCADEADA (Queue - FIFO: First-In, First-Out)
 * Aplicada na fila de revisão administrativa de acompanhamentos enviados
 * pelos professores (ordem cronológica de envio).
 */
class FilaRevisao {
  #inicio = null;
  #fim = null;
  #tamanho = 0;

  enfileirar(item) {
    const novoNo = new NoLista(item);
    if (!this.#inicio) {
      this.#inicio = novoNo;
      this.#fim = novoNo;
    } else {
      this.#fim.proximo = novoNo;
      this.#fim = novoNo;
    }
    this.#tamanho++;
  }

  desenfileirar() {
    if (!this.#inicio) return null;
    const valor = this.#inicio.valor;
    this.#inicio = this.#inicio.proximo;
    if (!this.#inicio) {
      this.#fim = null;
    }
    this.#tamanho--;
    return valor;
  }

  frente() {
    return this.#inicio ? this.#inicio.valor : null;
  }

  estaVazia() {
    return this.#tamanho === 0;
  }

  get tamanho() {
    return this.#tamanho;
  }

  paraArray() {
    const resultado = [];
    let atual = this.#inicio;
    while (atual) {
      resultado.push(atual.valor);
      atual = atual.proximo;
    }
    return resultado;
  }
}

/**
 * 2. PILHA ENCADEADA (Stack - LIFO: Last-In, First-Out)
 * Aplicada na trilha de auditoria/rastreabilidade de alterações administrativas,
 * permitindo inspecionar do evento mais recente ao primeiro rascunho.
 */
class PilhaHistorico {
  #topo = null;
  #tamanho = 0;

  empilhar(evento) {
    const novoNo = new NoLista(evento);
    novoNo.proximo = this.#topo;
    this.#topo = novoNo;
    this.#tamanho++;
  }

  desempilhar() {
    if (!this.#topo) return null;
    const valor = this.#topo.valor;
    this.#topo = this.#topo.proximo;
    this.#tamanho--;
    return valor;
  }

  topo() {
    return this.#topo ? this.#topo.valor : null;
  }

  get tamanho() {
    return this.#tamanho;
  }

  paraArrayLIFO() {
    const resultado = [];
    let atual = this.#topo;
    while (atual) {
      resultado.push(atual.valor);
      atual = atual.proximo;
    }
    return resultado;
  }
}

/**
 * 3. GRAFO DE VÍNCULOS ESCOLARES (Tabela Hash + Conjunto de Adjacência)
 * Permite validar permissões em tempo constante O(1):
 * - Professor está vinculado à Turma e Disciplina?
 * - Aluno pertence à Turma?
 * - Responsável está vinculado ao Aluno?
 */
class GrafoVinculosEscolares {
  #profTurmaDisc = new Map(); // chave: `prof:${profId}` -> Set(`turma:${turmaId}:disc:${discId}`)
  #turmaAlunos = new Map();   // chave: `turma:${turmaId}` -> Set(alunoId)
  #respAlunos = new Map();    // chave: `resp:${respId}` -> Set(alunoId)

  registrarVinculoProfessor(professorId, turmaId, disciplinaId) {
    const chave = `prof:${professorId}`;
    if (!this.#profTurmaDisc.has(chave)) {
      this.#profTurmaDisc.set(chave, new Set());
    }
    this.#profTurmaDisc.get(chave).add(`turma:${turmaId}:disc:${disciplinaId}`);
  }

  registrarMatriculaAluno(turmaId, alunoId) {
    const chave = `turma:${turmaId}`;
    if (!this.#turmaAlunos.has(chave)) {
      this.#turmaAlunos.set(chave, new Set());
    }
    this.#turmaAlunos.get(chave).add(Number(alunoId));
  }

  registrarVinculoResponsavel(responsavelId, alunoId) {
    const chave = `resp:${responsavelId}`;
    if (!this.#respAlunos.has(chave)) {
      this.#respAlunos.set(chave, new Set());
    }
    this.#respAlunos.get(chave).add(Number(alunoId));
  }

  professorLecionaParaAluno(professorId, turmaId, disciplinaId, alunoId) {
    const chaveProf = `prof:${professorId}`;
    const chaveTurma = `turma:${turmaId}`;
    const vinculosProf = this.#profTurmaDisc.get(chaveProf);
    const alunosTurma = this.#turmaAlunos.get(chaveTurma);
    if (!vinculosProf || !alunosTurma) return false;
    return (
      vinculosProf.has(`turma:${turmaId}:disc:${disciplinaId}`) &&
      alunosTurma.has(Number(alunoId))
    );
  }

  responsavelVinculadoAoAluno(responsavelId, alunoId) {
    const chave = `resp:${responsavelId}`;
    const alunos = this.#respAlunos.get(chave);
    return alunos ? alunos.has(Number(alunoId)) : false;
  }
}

/**
 * 4. ÁRVORE CURRICULAR HIERÁRQUICA (Árvore N-ária)
 * Raiz (Escola) -> Áreas de Conhecimento -> Disciplinas -> Turmas/Professores
 */
class NoArvoreCurricular {
  constructor(id, tipo, nome, metadados = {}) {
    this.id = id;
    this.tipo = tipo; // 'ESCOLA' | 'AREA' | 'DISCIPLINA' | 'TURMA'
    this.nome = nome;
    this.metadados = metadados;
    this.filhos = [];
  }

  adicionarFilho(noFilho) {
    this.filhos.push(noFilho);
    return noFilho;
  }

  contarNosPorTipo(tipoAlvo) {
    let total = this.tipo === tipoAlvo ? 1 : 0;
    for (const filho of this.filhos) {
      total += filho.contarNosPorTipo(tipoAlvo);
    }
    return total;
  }
}

module.exports = {
  FilaRevisao,
  PilhaHistorico,
  GrafoVinculosEscolares,
  NoArvoreCurricular,
};
