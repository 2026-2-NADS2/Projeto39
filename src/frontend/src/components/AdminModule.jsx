import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, baixarRelatorioExcel } from '../services/api';

export default function AdminModule() {
  const [abaAtiva, setAbaAtiva] = useState('revisao');
  const [mensagem, setMensagem] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Estados gerais do módulo Admin
  const [relatorioGestao, setRelatorioGestao] = useState(null);
  const [acompanhamentos, setAcompanhamentos] = useState([]);
  const [filaRevisao, setFilaRevisao] = useState({ tamanhoFila: 0, itensFila: [] });
  const [usuarios, setUsuarios] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [curriculo, setCurriculo] = useState({ areas: [], disciplinas: [], arvoreCurricular: null });
  const [turmasInfo, setTurmasInfo] = useState({ turmas: [], matrizProfessorDisciplinaAluno: [] });
  const [tags, setTags] = useState([]);
  const [periodos, setPeriodos] = useState([]);

  // Filtros de acompanhamentos
  const [filtroBimestre, setFiltroBimestre] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroTag, setFiltroTag] = useState('');

  // Modais de Revisão / Devolução / Histórico
  const [modalRevisao, setModalRevisao] = useState(null);
  const [modalDevolucao, setModalDevolucao] = useState(null);
  const [modalHistorico, setModalHistorico] = useState(null);

  // Formulários de Cadastros
  const [formUsuario, setFormUsuario] = useState({
    id: null,
    nome: '',
    email: '',
    senha: '',
    perfil: 'PROFESSOR',
    cpf: '',
    telefone: '',
    registro_funcional: '',
    formacao_especialidade: '',
    parentesco_padrao: 'Mãe',
  });

  const [formAluno, setFormAluno] = useState({
    id: null,
    matricula: '',
    nome: '',
    data_nascimento: '2014-05-10',
    serie_atual: '6º Ano',
    observacoes_pedagogicas: '',
    turma_id: '',
  });

  const [formVinculoResp, setFormVinculoResp] = useState({
    responsavel_id: '',
    aluno_id: '',
    parentesco: 'Mãe',
  });

  const [formArea, setFormArea] = useState({ codigo: '', nome: '', descricao: '', cor: '#2563eb' });
  const [formDisciplina, setFormDisciplina] = useState({
    area_id: '',
    codigo: '',
    nome: '',
    carga_horaria_anual: 120,
  });

  const [formTurma, setFormTurma] = useState({
    codigo: '',
    nome: '',
    serie: '6º Ano',
    ano_letivo: 2026,
    turno: 'MANHA',
    sala: '',
  });

  const [formVinculoProf, setFormVinculoProf] = useState({
    professor_id: '',
    turma_id: '',
    disciplina_id: '',
  });

  const [formVinculoAlunoTurma, setFormVinculoAlunoTurma] = useState({
    aluno_id: '',
    turma_id: '',
  });

  const [formTag, setFormTag] = useState({
    id: null,
    nome: '',
    categoria: 'DESEMPENHO',
    natureza: 'POSITIVA',
    cor: '#16a34a',
    descricao: '',
  });

  const exibirAlerta = (texto, tipo = 'success') => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem(null), 5000);
  };

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const paramsAcomp = new URLSearchParams();
      if (filtroBimestre) paramsAcomp.set('bimestre', filtroBimestre);
      if (filtroStatus) paramsAcomp.set('status', filtroStatus);
      if (filtroTurma) paramsAcomp.set('turma_id', filtroTurma);
      if (filtroTag) paramsAcomp.set('tag_id', filtroTag);

      const [
        resGestao,
        resAcomp,
        resUsuarios,
        resAlunos,
        resCurriculo,
        resTurmas,
        resTags,
        resPeriodos,
      ] = await Promise.all([
        apiRequest(`/admin/relatorios/gestao${filtroBimestre ? `?bimestre=${filtroBimestre}` : ''}`),
        apiRequest(`/admin/acompanhamentos?${paramsAcomp.toString()}`),
        apiRequest('/admin/usuarios'),
        apiRequest('/admin/alunos'),
        apiRequest('/admin/curriculo'),
        apiRequest('/admin/turmas'),
        apiRequest('/admin/tags'),
        apiRequest('/admin/periodos'),
      ]);

      setRelatorioGestao(resGestao);
      setAcompanhamentos(resAcomp.acompanhamentos || []);
      setFilaRevisao(resAcomp.filaRevisao || { tamanhoFila: 0, itensFila: [] });
      setUsuarios(resUsuarios || []);
      setAlunos(resAlunos || []);
      setCurriculo(resCurriculo || { areas: [], disciplinas: [], arvoreCurricular: null });
      setTurmasInfo(resTurmas || { turmas: [], matrizProfessorDisciplinaAluno: [] });
      setTags(resTags || []);
      setPeriodos(resPeriodos || []);
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    } finally {
      setCarregando(false);
    }
  }, [filtroBimestre, filtroStatus, filtroTurma, filtroTag]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ==========================================================================
  // Ações de Revisão, Edição Rastreável, Devolução e Publicação
  // ==========================================================================
  async function abrirHistorico(ac) {
    try {
      const hist = await apiRequest(`/admin/acompanhamentos/${ac.id}/historico`);
      setModalHistorico({ acompanhamento: ac, eventos: hist });
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarRevisaoAdmin(e) {
    e.preventDefault();
    try {
      await apiRequest(`/admin/acompanhamentos/${modalRevisao.id}/revisar`, {
        method: 'PUT',
        body: JSON.stringify({
          media: Number(modalRevisao.media),
          frequencia_percentual: Number(modalRevisao.frequencia_percentual),
          descricao: modalRevisao.descricao,
          observacao_coordenacao: modalRevisao.observacao_coordenacao,
          tagsIds: modalRevisao.tagsIds,
          justificativa: modalRevisao.justificativa,
        }),
      });
      exibirAlerta('Acompanhamento alterado com rastreabilidade registrada no histórico!');
      setModalRevisao(null);
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function confirmarDevolucao(e) {
    e.preventDefault();
    try {
      await apiRequest(`/admin/acompanhamentos/${modalDevolucao.id}/devolver`, {
        method: 'POST',
        body: JSON.stringify({ motivo_devolucao: modalDevolucao.motivo_devolucao }),
      });
      exibirAlerta('Acompanhamento devolvido ao professor para ajustes.');
      setModalDevolucao(null);
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function publicarAcompanhamento(ac) {
    try {
      await apiRequest(`/admin/acompanhamentos/${ac.id}/publicar`, {
        method: 'POST',
        body: JSON.stringify({
          observacao_coordenacao:
            ac.observacao_coordenacao || 'Aprovado e publicado pela Coordenação Pedagógica.',
        }),
      });
      exibirAlerta(`Relatório de ${ac.aluno_nome} (${ac.disciplina_nome}) publicado aos responsáveis!`);
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  // ==========================================================================
  // Ações de Cadastros (Usuários, Alunos, Currículo, Turmas, Tags, Períodos)
  // ==========================================================================
  async function salvarUsuario(e) {
    e.preventDefault();
    try {
      if (formUsuario.id) {
        await apiRequest(`/admin/usuarios/${formUsuario.id}`, {
          method: 'PUT',
          body: JSON.stringify(formUsuario),
        });
        exibirAlerta('Cadastro de usuário atualizado com sucesso!');
      } else {
        await apiRequest('/admin/usuarios', {
          method: 'POST',
          body: JSON.stringify(formUsuario),
        });
        exibirAlerta('Novo usuário cadastrado com sucesso!');
      }
      setFormUsuario({
        id: null,
        nome: '',
        email: '',
        senha: '',
        perfil: 'PROFESSOR',
        cpf: '',
        telefone: '',
        registro_funcional: '',
        formacao_especialidade: '',
        parentesco_padrao: 'Mãe',
      });
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function alternarStatusUsuario(u) {
    try {
      await apiRequest(`/admin/usuarios/${u.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !u.ativo }),
      });
      exibirAlerta(`Usuário ${u.nome} ${!u.ativo ? 'ativado' : 'inativado'} com sucesso.`);
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarAluno(e) {
    e.preventDefault();
    try {
      if (formAluno.id) {
        await apiRequest(`/admin/alunos/${formAluno.id}`, {
          method: 'PUT',
          body: JSON.stringify(formAluno),
        });
        exibirAlerta('Dados do aluno atualizados!');
      } else {
        await apiRequest('/admin/alunos', {
          method: 'POST',
          body: JSON.stringify(formAluno),
        });
        exibirAlerta('Aluno cadastrado com sucesso!');
      }
      setFormAluno({
        id: null,
        matricula: '',
        nome: '',
        data_nascimento: '2014-05-10',
        serie_atual: '6º Ano',
        observacoes_pedagogicas: '',
        turma_id: '',
      });
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function alternarStatusAluno(al) {
    try {
      await apiRequest(`/admin/alunos/${al.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !al.ativo }),
      });
      exibirAlerta(`Aluno ${al.nome} ${!al.ativo ? 'ativado' : 'inativado'}.`);
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function vincularResponsavelAluno(e) {
    e.preventDefault();
    try {
      await apiRequest('/admin/vinculos/responsavel-aluno', {
        method: 'POST',
        body: JSON.stringify(formVinculoResp),
      });
      exibirAlerta('Vínculo Responsável × Aluno estabelecido com sucesso!');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function removerVinculoRespAluno(vinculoId) {
    try {
      await apiRequest(`/admin/vinculos/responsavel-aluno/${vinculoId}`, { method: 'DELETE' });
      exibirAlerta('Vínculo removido.');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarArea(e) {
    e.preventDefault();
    try {
      await apiRequest('/admin/areas', {
        method: 'POST',
        body: JSON.stringify(formArea),
      });
      setFormArea({ codigo: '', nome: '', descricao: '', cor: '#2563eb' });
      exibirAlerta('Área de conhecimento cadastrada!');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarDisciplina(e) {
    e.preventDefault();
    try {
      await apiRequest('/admin/disciplinas', {
        method: 'POST',
        body: JSON.stringify(formDisciplina),
      });
      setFormDisciplina({ area_id: '', codigo: '', nome: '', carga_horaria_anual: 120 });
      exibirAlerta('Disciplina cadastrada na área selecionada!');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarTurma(e) {
    e.preventDefault();
    try {
      await apiRequest('/admin/turmas', {
        method: 'POST',
        body: JSON.stringify(formTurma),
      });
      setFormTurma({
        codigo: '',
        nome: '',
        serie: '6º Ano',
        ano_letivo: 2026,
        turno: 'MANHA',
        sala: '',
      });
      exibirAlerta('Turma cadastrada com sucesso!');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function vincularProfTurmaDisc(e) {
    e.preventDefault();
    try {
      await apiRequest('/admin/vinculos/professor-turma-disciplina', {
        method: 'POST',
        body: JSON.stringify(formVinculoProf),
      });
      exibirAlerta('Vínculo Professor × Disciplina × Turma salvo!');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function vincularAlunoTurma(e) {
    e.preventDefault();
    try {
      await apiRequest('/admin/vinculos/aluno-turma', {
        method: 'POST',
        body: JSON.stringify(formVinculoAlunoTurma),
      });
      exibirAlerta('Aluno enturmado com sucesso!');
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarTag(e) {
    e.preventDefault();
    try {
      if (formTag.id) {
        await apiRequest(`/admin/tags/${formTag.id}`, {
          method: 'PUT',
          body: JSON.stringify(formTag),
        });
        exibirAlerta('Tag atualizada!');
      } else {
        await apiRequest('/admin/tags', {
          method: 'POST',
          body: JSON.stringify(formTag),
        });
        exibirAlerta('Nova tag pedagógica cadastrada!');
      }
      setFormTag({
        id: null,
        nome: '',
        categoria: 'DESEMPENHO',
        natureza: 'POSITIVA',
        cor: '#16a34a',
        descricao: '',
      });
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function salvarPeriodo(periodo) {
    try {
      await apiRequest(`/admin/periodos/${periodo.id}`, {
        method: 'PUT',
        body: JSON.stringify(periodo),
      });
      exibirAlerta(`Configuração do ${periodo.rotulo} atualizada com sucesso!`);
      carregarDados();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  const professoresAtivos = usuarios.filter((u) => u.perfil === 'PROFESSOR' && u.ativo);
  const responsaveisAtivos = usuarios.filter((u) => u.perfil === 'RESPONSAVEL' && u.ativo);

  return (
    <div className="container-fluid py-4 px-md-4">
      {mensagem && (
        <div className={`alert alert-${mensagem.tipo} alert-dismissible fade show shadow-sm mb-3`}>
          <i className="bi bi-info-circle-fill me-2"></i>
          {mensagem.texto}
          <button type="button" className="btn-close" onClick={() => setMensagem(null)}></button>
        </div>
      )}

      {/* Barra de Navegação do Módulo Administrador */}
      <div className="edu-card p-2 mb-4">
        <ul className="nav nav-pills edu-nav-pills flex-wrap gap-1">
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'revisao' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('revisao')}
            >
              <i className="bi bi-clipboard2-check me-2"></i>
              Revisão e Publicação
              {filaRevisao.tamanhoFila > 0 && (
                <span className="badge bg-warning text-dark ms-2">{filaRevisao.tamanhoFila}</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'gestao' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('gestao')}
            >
              <i className="bi bi-bar-chart-line me-2"></i>
              Relatórios & Excel
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'pessoas' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('pessoas')}
            >
              <i className="bi bi-people me-2"></i>
              Professores, Pais e Alunos
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'turmas' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('turmas')}
            >
              <i className="bi bi-diagram-3 me-2"></i>
              Turmas & Vínculos (Prof × Disc × Aluno)
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'curriculo' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('curriculo')}
            >
              <i className="bi bi-book me-2"></i>
              Áreas e Disciplinas
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'tags' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('tags')}
            >
              <i className="bi bi-tags me-2"></i>
              Tags Pedagógicas
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'periodos' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('periodos')}
            >
              <i className="bi bi-calendar-range me-2"></i>
              Períodos dos 4 Bimestres
            </button>
          </li>
        </ul>
      </div>

      {/* =====================================================================
          ABA 1: REVISÃO ADMINISTRATIVA, RASTREABILIDADE, DEVOLUÇÃO E PUBLICAÇÃO
         ===================================================================== */}
      {abaAtiva === 'revisao' && (
        <div>
          {/* Fila de Revisão FIFO em destaque */}
          <div className="edu-card p-3 mb-4 border-start border-4 border-primary">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1">
                  ESTRUTURA DE DADOS: FILA DE REVISÃO (FIFO)
                </span>
                <h5 className="fw-bold mb-0">
                  Acompanhamentos Aguardando Revisão Administrativa ({filaRevisao.tamanhoFila})
                </h5>
                <small className="text-muted">
                  Registros enviados pelos professores aguardando análise, edição rastreável, devolução ou publicação às famílias.
                </small>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-success btn-sm fw-semibold"
                  onClick={() => baixarRelatorioExcel({ ano_letivo: 2026, bimestre: filtroBimestre, status: filtroStatus })}
                >
                  <i className="bi bi-file-earmark-excel me-1"></i>
                  Exportar Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="edu-card p-3 mb-4">
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-semibold mb-1">Filtrar por Bimestre</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroBimestre}
                  onChange={(e) => setFiltroBimestre(e.target.value)}
                >
                  <option value="">Todos os Bimestres</option>
                  <option value="1">1º Bimestre</option>
                  <option value="2">2º Bimestre</option>
                  <option value="3">3º Bimestre</option>
                  <option value="4">4º Bimestre</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold mb-1">Filtrar por Status</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="">Todos os Status</option>
                  <option value="ENVIADO">ENVIADO (Aguardando Revisão)</option>
                  <option value="PUBLICADO">PUBLICADO (Disponível aos Pais)</option>
                  <option value="DEVOLVIDO">DEVOLVIDO (Para Ajustes)</option>
                  <option value="RASCUNHO">RASCUNHO (Em Elaboração)</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold mb-1">Filtrar por Turma</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                >
                  <option value="">Todas as Turmas</option>
                  {turmasInfo.turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold mb-1">Filtrar por Tag</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroTag}
                  onChange={(e) => setFiltroTag(e.target.value)}
                >
                  <option value="">Todas as Tags</option>
                  {tags.map((tg) => (
                    <option key={tg.id} value={tg.id}>{tg.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Acompanhamentos */}
          <div className="row g-3">
            {acompanhamentos.map((ac) => (
              <div className="col-12" key={ac.id}>
                <div className="edu-card p-3 p-md-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className={`edu-status-badge status-${ac.status}`}>
                          {ac.status}
                        </span>
                        <span className="badge bg-dark">{ac.bimestre}º Bimestre / {ac.ano_letivo}</span>
                        <span className="badge bg-light text-dark border">{ac.turma_nome}</span>
                        <span
                          className="badge"
                          style={{ backgroundColor: ac.area_cor || '#2563eb', color: '#fff' }}
                        >
                          {ac.disciplina_nome} ({ac.area_nome})
                        </span>
                      </div>
                      <h5 className="fw-bold mt-2 mb-1">
                        {ac.aluno_nome}{' '}
                        <small className="text-muted fw-normal fs-6">
                          (Matrícula: {ac.aluno_matricula})
                        </small>
                      </h5>
                      <div className="small text-secondary">
                        Professor(a): <strong>{ac.professor_nome}</strong> • Média Bimestral:{' '}
                        <span className={`fw-bold ${Number(ac.media) < 6 ? 'text-danger' : 'text-success'}`}>
                          {Number(ac.media).toFixed(1)}
                        </span>{' '}
                        • Frequência: <strong>{ac.frequencia_percentual}%</strong>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => abrirHistorico(ac)}
                        title="Consultar histórico completo de rastreabilidade (Pilha LIFO)"
                      >
                        <i className="bi bi-clock-history me-1"></i>
                        Rastreabilidade
                      </button>

                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() =>
                          setModalRevisao({
                            ...ac,
                            tagsIds: ac.tagsIds || [],
                            justificativa: '',
                          })
                        }
                      >
                        <i className="bi bi-pencil-square me-1"></i>
                        Revisar / Alterar
                      </button>

                      {(ac.status === 'ENVIADO' || ac.status === 'PUBLICADO') && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() =>
                            setModalDevolucao({
                              id: ac.id,
                              aluno_nome: ac.aluno_nome,
                              disciplina_nome: ac.disciplina_nome,
                              professor_nome: ac.professor_nome,
                              motivo_devolucao: ac.motivo_devolucao || '',
                            })
                          }
                        >
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          Devolver
                        </button>
                      )}

                      {ac.status !== 'PUBLICADO' && ac.status !== 'RASCUNHO' && (
                        <button
                          className="btn btn-success btn-sm fw-semibold"
                          onClick={() => publicarAcompanhamento(ac)}
                        >
                          <i className="bi bi-check2-all me-1"></i>
                          Publicar aos Pais
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-3 bg-light border my-2">
                    <div className="small fw-semibold text-secondary mb-1">
                      Parecer Qualitativo do Professor:
                    </div>
                    <div className="text-dark">{ac.descricao}</div>
                  </div>

                  {ac.motivo_devolucao && (
                    <div className="alert alert-danger py-2 small mb-2">
                      <strong>Motivo da Devolução ao Professor:</strong> {ac.motivo_devolucao}
                    </div>
                  )}

                  {ac.observacao_coordenacao && (
                    <div className="small text-muted mb-2">
                      <i className="bi bi-shield-check text-primary me-1"></i>
                      <strong>Nota da Coordenação:</strong> {ac.observacao_coordenacao}
                    </div>
                  )}

                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
                    <div className="d-flex flex-wrap gap-1">
                      {(ac.tags || []).map((tg) => (
                        <span
                          key={tg.id}
                          className="edu-tag-chip"
                          style={{
                            backgroundColor: `${tg.cor}18`,
                            color: tg.cor,
                            borderColor: `${tg.cor}50`,
                          }}
                        >
                          <i className="bi bi-tag-fill"></i>
                          {tg.nome}
                        </span>
                      ))}
                    </div>

                    {ac.interacoes && ac.interacoes.length > 0 && (
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Ciência da Família: {ac.interacoes[0].responsavel_nome} ({ac.interacoes[0].data_ciencia})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 2: RELATÓRIOS DE GESTÃO ESCOLAR & EXPORTAÇÃO EXCEL
         ===================================================================== */}
      {abaAtiva === 'gestao' && relatorioGestao && (
        <div>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <div>
              <h5 className="fw-bold mb-0">Indicadores Gerenciais da Escola — Ano Letivo 2026</h5>
              <small className="text-muted">
                Visão consolidada de desempenho, status do fluxo bimestral e recorrência de tags.
              </small>
            </div>
            <button
              className="btn btn-success fw-semibold"
              onClick={() => baixarRelatorioExcel({ ano_letivo: 2026, bimestre: filtroBimestre })}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>
              Exportar Planilha Completa (.xlsx)
            </button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="edu-card p-3 d-flex align-items-center gap-3">
                <div className="edu-kpi-icon bg-primary-subtle text-primary">
                  <i className="bi bi-journal-text"></i>
                </div>
                <div>
                  <div className="text-muted small">Total de Acompanhamentos</div>
                  <h4 className="fw-bold mb-0">{relatorioGestao.totalAcompanhamentos}</h4>
                  <small className="text-success">
                    {relatorioGestao.contadoresStatus.PUBLICADO} publicados
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="edu-card p-3 d-flex align-items-center gap-3">
                <div className="edu-kpi-icon bg-success-subtle text-success">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <div>
                  <div className="text-muted small">Média Geral da Escola</div>
                  <h4 className="fw-bold mb-0">{Number(relatorioGestao.mediaGeral).toFixed(2)}</h4>
                  <small className="text-muted">Escala de 0,0 a 10,0</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="edu-card p-3 d-flex align-items-center gap-3">
                <div className="edu-kpi-icon bg-warning-subtle text-warning">
                  <i className="bi bi-exclamation-diamond"></i>
                </div>
                <div>
                  <div className="text-muted small">Atenção Pedagógica (&lt; 6,0)</div>
                  <h4 className="fw-bold mb-0">{relatorioGestao.abaixoMediaReferencia}</h4>
                  <small className="text-danger">Registros abaixo da média</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="edu-card p-3 d-flex align-items-center gap-3">
                <div className="edu-kpi-icon bg-info-subtle text-info">
                  <i className="bi bi-patch-check"></i>
                </div>
                <div>
                  <div className="text-muted small">Ciências de Responsáveis</div>
                  <h4 className="fw-bold mb-0">
                    {relatorioGestao.totaisCadastros.totalCienciasConfirmadas}
                  </h4>
                  <small className="text-muted">Leituras confirmadas</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-6">
              <div className="edu-card p-4 h-100">
                <h6 className="fw-bold mb-3">Desempenho Médio por Turma</h6>
                {relatorioGestao.desempenhoPorTurma.map((t) => (
                  <div key={t.turma_id} className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-semibold">{t.turma_nome}</span>
                      <span>
                        Média: <strong>{t.mediaTurma}</strong> ({t.publicados}/{t.total} publicados)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-primary"
                        style={{ width: `${Math.min(100, t.mediaTurma * 10)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="edu-card p-4 h-100">
                <h6 className="fw-bold mb-3">Tags Pedagógicas Mais Recorrentes</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Tag</th>
                        <th>Categoria</th>
                        <th>Natureza</th>
                        <th className="text-end">Ocorrências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioGestao.rankingTags.map((tg) => (
                        <tr key={tg.id}>
                          <td>
                            <span
                              className="edu-tag-chip"
                              style={{ backgroundColor: `${tg.cor}18`, color: tg.cor }}
                            >
                              {tg.nome}
                            </span>
                          </td>
                          <td className="small text-muted">{tg.categoria}</td>
                          <td>
                            <span
                              className={`badge ${
                                tg.natureza === 'POSITIVA'
                                  ? 'bg-success-subtle text-success'
                                  : tg.natureza === 'ATENCAO'
                                  ? 'bg-danger-subtle text-danger'
                                  : 'bg-secondary-subtle text-secondary'
                              }`}
                            >
                              {tg.natureza}
                            </span>
                          </td>
                          <td className="text-end fw-bold">{tg.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 3: CADASTROS DE PROFESSORES, PAIS/RESPONSÁVEIS E ALUNOS + VÍNCULOS
         ===================================================================== */}
      {abaAtiva === 'pessoas' && (
        <div className="row g-4">
          {/* Coluna 1: Cadastrar / Editar Professor ou Pai/Responsável */}
          <div className="col-lg-5">
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">
                {formUsuario.id ? 'Editar Usuário' : 'Cadastrar Professor, Responsável ou Admin'}
              </h6>
              <form onSubmit={salvarUsuario}>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Perfil de Acesso</label>
                    <select
                      className="form-select form-select-sm"
                      value={formUsuario.perfil}
                      onChange={(e) => setFormUsuario({ ...formUsuario, perfil: e.target.value })}
                      disabled={Boolean(formUsuario.id)}
                    >
                      <option value="PROFESSOR">Professor(a)</option>
                      <option value="RESPONSAVEL">Pai / Responsável</option>
                      <option value="ADMIN">Administrador(a)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">CPF</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formUsuario.cpf}
                      onChange={(e) => setFormUsuario({ ...formUsuario, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Nome Completo</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formUsuario.nome}
                      onChange={(e) => setFormUsuario({ ...formUsuario, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-semibold">E-mail de Login</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={formUsuario.email}
                      onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">
                      {formUsuario.id ? 'Nova Senha (opcional)' : 'Senha Inicial'}
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      value={formUsuario.senha}
                      onChange={(e) => setFormUsuario({ ...formUsuario, senha: e.target.value })}
                      placeholder="Padrão: 123456"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Telefone</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formUsuario.telefone}
                      onChange={(e) => setFormUsuario({ ...formUsuario, telefone: e.target.value })}
                    />
                  </div>
                  {formUsuario.perfil === 'PROFESSOR' ? (
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Especialidade / Formação</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formUsuario.formacao_especialidade}
                        onChange={(e) =>
                          setFormUsuario({ ...formUsuario, formacao_especialidade: e.target.value })
                        }
                      />
                    </div>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Parentesco Padrão</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formUsuario.parentesco_padrao}
                        onChange={(e) =>
                          setFormUsuario({ ...formUsuario, parentesco_padrao: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm fw-semibold">
                    <i className="bi bi-save me-1"></i>
                    {formUsuario.id ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                  </button>
                  {formUsuario.id && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setFormUsuario({
                          id: null,
                          nome: '',
                          email: '',
                          senha: '',
                          perfil: 'PROFESSOR',
                          cpf: '',
                          telefone: '',
                          registro_funcional: '',
                          formacao_especialidade: '',
                          parentesco_padrao: 'Mãe',
                        })
                      }
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Cadastrar / Editar Aluno */}
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">
                {formAluno.id ? 'Editar Aluno' : 'Cadastrar Novo Aluno do Ensino Fundamental'}
              </h6>
              <form onSubmit={salvarAluno}>
                <div className="row g-2">
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">Matrícula</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formAluno.matricula}
                      onChange={(e) => setFormAluno({ ...formAluno, matricula: e.target.value })}
                      placeholder="Ex: 20260009"
                      required
                    />
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-semibold">Nome Completo do Aluno</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formAluno.nome}
                      onChange={(e) => setFormAluno({ ...formAluno, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Data de Nascimento</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={formAluno.data_nascimento}
                      onChange={(e) =>
                        setFormAluno({ ...formAluno, data_nascimento: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Série / Ano</label>
                    <select
                      className="form-select form-select-sm"
                      value={formAluno.serie_atual}
                      onChange={(e) => setFormAluno({ ...formAluno, serie_atual: e.target.value })}
                    >
                      <option value="1º Ano">1º Ano</option>
                      <option value="2º Ano">2º Ano</option>
                      <option value="3º Ano">3º Ano</option>
                      <option value="4º Ano">4º Ano</option>
                      <option value="5º Ano">5º Ano</option>
                      <option value="6º Ano">6º Ano</option>
                      <option value="7º Ano">7º Ano</option>
                      <option value="8º Ano">8º Ano</option>
                      <option value="9º Ano">9º Ano</option>
                    </select>
                  </div>
                  {!formAluno.id && (
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Enturmar na Turma</label>
                      <select
                        className="form-select form-select-sm"
                        value={formAluno.turma_id}
                        onChange={(e) => setFormAluno({ ...formAluno, turma_id: e.target.value })}
                      >
                        <option value="">Selecione uma turma (opcional)</option>
                        {turmasInfo.turmas.map((t) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Observações Pedagógicas</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formAluno.observacoes_pedagogicas}
                      onChange={(e) =>
                        setFormAluno({ ...formAluno, observacoes_pedagogicas: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm fw-semibold">
                    <i className="bi bi-person-plus me-1"></i>
                    {formAluno.id ? 'Atualizar Aluno' : 'Cadastrar Aluno'}
                  </button>
                </div>
              </form>
            </div>

            {/* Vincular Pai/Responsável × Aluno (N:N) */}
            <div className="edu-card p-4">
              <h6 className="fw-bold mb-2">Vincular Pai/Responsável × Aluno (N:N)</h6>
              <p className="small text-muted mb-3">
                Um responsável pode ter vários alunos vinculados e um aluno pode ter mais de um responsável autorizado.
              </p>
              <form onSubmit={vincularResponsavelAluno} className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Responsável</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoResp.responsavel_id}
                    onChange={(e) =>
                      setFormVinculoResp({ ...formVinculoResp, responsavel_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione o responsável...</option>
                    {responsaveisAtivos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome} ({r.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-7">
                  <label className="form-label small fw-semibold">Aluno</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoResp.aluno_id}
                    onChange={(e) =>
                      setFormVinculoResp({ ...formVinculoResp, aluno_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione o aluno...</option>
                    {alunos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.serie_atual})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-semibold">Parentesco</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formVinculoResp.parentesco}
                    onChange={(e) =>
                      setFormVinculoResp({ ...formVinculoResp, parentesco: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-12 mt-2">
                  <button type="submit" className="btn btn-outline-primary btn-sm w-100 fw-semibold">
                    <i className="bi bi-link-45deg me-1"></i>
                    Estabelecer Vínculo Familiar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Coluna 2: Listagem de Usuários e Alunos */}
          <div className="col-lg-7">
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">Professores, Pais/Responsáveis e Administradores</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Nome / E-mail</th>
                      <th>Perfil</th>
                      <th>Vínculos</th>
                      <th>Status</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="fw-semibold">{u.nome}</div>
                          <div className="small text-muted">{u.email}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              u.perfil === 'ADMIN'
                                ? 'bg-primary'
                                : u.perfil === 'PROFESSOR'
                                ? 'bg-success'
                                : 'bg-info text-dark'
                            }`}
                          >
                            {u.perfil}
                          </span>
                        </td>
                        <td className="small">
                          {u.perfil === 'RESPONSAVEL' &&
                            (u.alunos_vinculados || []).map((av) => (
                              <span
                                key={av.vinculo_id}
                                className="badge bg-light text-dark border me-1 mb-1"
                              >
                                {av.aluno_nome} ({av.parentesco})
                                <button
                                  type="button"
                                  className="btn-close ms-1"
                                  style={{ fontSize: '0.5rem' }}
                                  onClick={() => removerVinculoRespAluno(av.vinculo_id)}
                                  title="Remover vínculo"
                                ></button>
                              </span>
                            ))}
                          {u.perfil === 'PROFESSOR' &&
                            (u.atribuicoes_docentes || []).map((ad) => (
                              <span
                                key={ad.vinculo_id}
                                className="badge bg-light text-dark border me-1 mb-1"
                              >
                                {ad.turma_nome}: {ad.disciplina_nome}
                              </span>
                            ))}
                        </td>
                        <td>
                          <span className={`badge ${u.ativo ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() =>
                                setFormUsuario({
                                  id: u.id,
                                  nome: u.nome,
                                  email: u.email,
                                  senha: '',
                                  perfil: u.perfil,
                                  cpf: u.cpf || '',
                                  telefone: u.telefone || '',
                                  registro_funcional: u.registro_funcional || '',
                                  formacao_especialidade: u.formacao_especialidade || '',
                                  parentesco_padrao: u.parentesco_padrao || '',
                                })
                              }
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className={`btn btn-outline-${u.ativo ? 'danger' : 'success'}`}
                              onClick={() => alternarStatusUsuario(u)}
                              title={u.ativo ? 'Inativar' : 'Ativar'}
                            >
                              <i className={`bi bi-${u.ativo ? 'person-slash' : 'person-check'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="edu-card p-4">
              <h6 className="fw-bold mb-3">Alunos Matriculados e Seus Responsáveis Autorizados</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Matrícula / Nome</th>
                      <th>Série / Turmas</th>
                      <th>Responsáveis Vinculados</th>
                      <th>Status</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((al) => (
                      <tr key={al.id}>
                        <td>
                          <div className="fw-semibold">{al.nome}</div>
                          <div className="small text-muted">Matrícula: {al.matricula}</div>
                        </td>
                        <td>
                          <span className="badge bg-dark me-1">{al.serie_atual}</span>
                          {(al.turmas || []).map((t) => (
                            <span key={t.vinculo_id} className="badge bg-primary-subtle text-primary">
                              {t.nome}
                            </span>
                          ))}
                        </td>
                        <td className="small">
                          {(al.responsaveis || []).map((r) => (
                            <div key={r.vinculo_id}>
                              <i className="bi bi-person-heart text-primary me-1"></i>
                              {r.nome} ({r.parentesco})
                            </div>
                          ))}
                        </td>
                        <td>
                          <span className={`badge ${al.ativo ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                            {al.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() =>
                                setFormAluno({
                                  id: al.id,
                                  matricula: al.matricula,
                                  nome: al.nome,
                                  data_nascimento: al.data_nascimento,
                                  serie_atual: al.serie_atual,
                                  observacoes_pedagogicas: al.observacoes_pedagogicas || '',
                                  turma_id: '',
                                })
                              }
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className={`btn btn-outline-${al.ativo ? 'danger' : 'success'}`}
                              onClick={() => alternarStatusAluno(al)}
                            >
                              <i className={`bi bi-${al.ativo ? 'slash-circle' : 'check-circle'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: TURMAS & VÍNCULOS PROFESSOR × DISCIPLINA × ALUNO
         ===================================================================== */}
      {abaAtiva === 'turmas' && (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">Cadastrar Nova Turma</h6>
              <form onSubmit={salvarTurma} className="row g-2">
                <div className="col-md-5">
                  <label className="form-label small fw-semibold">Código</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formTurma.codigo}
                    onChange={(e) => setFormTurma({ ...formTurma, codigo: e.target.value })}
                    placeholder="EF-8A-2026"
                    required
                  />
                </div>
                <div className="col-md-7">
                  <label className="form-label small fw-semibold">Série</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formTurma.serie}
                    onChange={(e) => setFormTurma({ ...formTurma, serie: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Nome da Turma</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formTurma.nome}
                    onChange={(e) => setFormTurma({ ...formTurma, nome: e.target.value })}
                    placeholder="8º Ano A - Ensino Fundamental II"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Turno</label>
                  <select
                    className="form-select form-select-sm"
                    value={formTurma.turno}
                    onChange={(e) => setFormTurma({ ...formTurma, turno: e.target.value })}
                  >
                    <option value="MANHA">Manhã</option>
                    <option value="TARDE">Tarde</option>
                    <option value="INTEGRAL">Integral</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Sala</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formTurma.sala}
                    onChange={(e) => setFormTurma({ ...formTurma, sala: e.target.value })}
                  />
                </div>
                <div className="col-12 mt-2">
                  <button type="submit" className="btn btn-primary btn-sm w-100 fw-semibold">
                    Criar Turma
                  </button>
                </div>
              </form>
            </div>

            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">Vincular Professor × Disciplina × Turma</h6>
              <form onSubmit={vincularProfTurmaDisc} className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Turma</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoProf.turma_id}
                    onChange={(e) =>
                      setFormVinculoProf({ ...formVinculoProf, turma_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione a turma...</option>
                    {turmasInfo.turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Disciplina</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoProf.disciplina_id}
                    onChange={(e) =>
                      setFormVinculoProf({ ...formVinculoProf, disciplina_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione a disciplina...</option>
                    {curriculo.disciplinas.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} ({d.area_nome})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Professor(a) Responsável</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoProf.professor_id}
                    onChange={(e) =>
                      setFormVinculoProf({ ...formVinculoProf, professor_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione o professor...</option>
                    {professoresAtivos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 mt-2">
                  <button type="submit" className="btn btn-outline-primary btn-sm w-100 fw-semibold">
                    Vincular Professor à Disciplina da Turma
                  </button>
                </div>
              </form>
            </div>

            <div className="edu-card p-4">
              <h6 className="fw-bold mb-3">Enturmar Aluno na Turma</h6>
              <form onSubmit={vincularAlunoTurma} className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Aluno</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoAlunoTurma.aluno_id}
                    onChange={(e) =>
                      setFormVinculoAlunoTurma({
                        ...formVinculoAlunoTurma,
                        aluno_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecione o aluno...</option>
                    {alunos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.serie_atual})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Turma</label>
                  <select
                    className="form-select form-select-sm"
                    value={formVinculoAlunoTurma.turma_id}
                    onChange={(e) =>
                      setFormVinculoAlunoTurma({
                        ...formVinculoAlunoTurma,
                        turma_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecione a turma...</option>
                    {turmasInfo.turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 mt-2">
                  <button type="submit" className="btn btn-outline-success btn-sm w-100 fw-semibold">
                    Matricular Aluno na Turma
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">Turmas Cadastradas, Corpo Docente e Alunos</h6>
              {turmasInfo.turmas.map((t) => (
                <div key={t.id} className="border rounded-3 p-3 mb-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <span className="badge bg-primary me-2">{t.codigo}</span>
                      <strong>{t.nome}</strong>
                      <small className="text-muted ms-2">
                        ({t.turno} • {t.sala})
                      </small>
                    </div>
                    <span className="badge bg-dark">{(t.alunos || []).length} alunos</span>
                  </div>
                  <div className="row g-2 small">
                    <div className="col-md-6">
                      <div className="fw-semibold text-secondary mb-1">Professores × Disciplinas:</div>
                      {(t.professores_disciplinas || []).map((pd) => (
                        <div key={pd.vinculo_id} className="mb-1">
                          <span className="badge bg-white text-dark border me-1">
                            {pd.disciplina_nome}
                          </span>
                          <span>{pd.professor_nome}</span>
                        </div>
                      ))}
                    </div>
                    <div className="col-md-6">
                      <div className="fw-semibold text-secondary mb-1">Alunos Enturmados:</div>
                      <div className="d-flex flex-wrap gap-1">
                        {(t.alunos || []).map((al) => (
                          <span key={al.vinculo_id} className="badge bg-white text-dark border">
                            {al.nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="edu-card p-4">
              <span className="badge bg-primary-subtle text-primary mb-1">
                GRAFO DE ADJACÊNCIA O(1)
              </span>
              <h6 className="fw-bold mb-3">
                Matriz Consolidada de Vínculos: Professor × Disciplina × Aluno (
                {turmasInfo.matrizProfessorDisciplinaAluno.length} vínculos ativos)
              </h6>
              <div className="table-responsive" style={{ maxHeight: '320px' }}>
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Turma</th>
                      <th>Disciplina</th>
                      <th>Professor(a)</th>
                      <th>Aluno(a) Vinculado(a)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmasInfo.matrizProfessorDisciplinaAluno.map((m, idx) => (
                      <tr key={idx}>
                        <td className="small">{m.turma_nome}</td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary">
                            {m.disciplina_nome}
                          </span>
                        </td>
                        <td className="small fw-semibold">{m.professor_nome}</td>
                        <td className="small">
                          {m.aluno_nome} <span className="text-muted">({m.aluno_matricula})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 5: ÁREAS DE CONHECIMENTO E DISCIPLINAS (ÁRVORE CURRICULAR)
         ===================================================================== */}
      {abaAtiva === 'curriculo' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">Cadastrar Área de Disciplina (BNCC)</h6>
              <form onSubmit={salvarArea} className="row g-2">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Código</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formArea.codigo}
                    onChange={(e) => setFormArea({ ...formArea, codigo: e.target.value })}
                    placeholder="EX: ENSREL"
                    required
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-semibold">Nome da Área</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formArea.nome}
                    onChange={(e) => setFormArea({ ...formArea, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Cor</label>
                  <input
                    type="color"
                    className="form-control form-control-sm form-control-color w-100"
                    value={formArea.cor}
                    onChange={(e) => setFormArea({ ...formArea, cor: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Descrição</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formArea.descricao}
                    onChange={(e) => setFormArea({ ...formArea, descricao: e.target.value })}
                  />
                </div>
                <div className="col-12 mt-2">
                  <button type="submit" className="btn btn-primary btn-sm w-100 fw-semibold">
                    Cadastrar Área
                  </button>
                </div>
              </form>
            </div>

            <div className="edu-card p-4">
              <h6 className="fw-bold mb-3">Cadastrar Disciplina Classificada por Área</h6>
              <form onSubmit={salvarDisciplina} className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Área de Conhecimento</label>
                  <select
                    className="form-select form-select-sm"
                    value={formDisciplina.area_id}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, area_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione a área...</option>
                    {curriculo.areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Código</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formDisciplina.codigo}
                    onChange={(e) =>
                      setFormDisciplina({ ...formDisciplina, codigo: e.target.value })
                    }
                    placeholder="ING-EF"
                    required
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-semibold">Nome da Disciplina</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formDisciplina.nome}
                    onChange={(e) => setFormDisciplina({ ...formDisciplina, nome: e.target.value })}
                    placeholder="Língua Inglesa"
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Carga Horária</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={formDisciplina.carga_horaria_anual}
                    onChange={(e) =>
                      setFormDisciplina({
                        ...formDisciplina,
                        carga_horaria_anual: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col-12 mt-2">
                  <button type="submit" className="btn btn-primary btn-sm w-100 fw-semibold">
                    Cadastrar Disciplina
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="edu-card p-4">
              <span className="badge bg-primary-subtle text-primary mb-1">
                ESTRUTURA DE DADOS: ÁRVORE CURRICULAR N-ÁRIA
              </span>
              <h6 className="fw-bold mb-3">
                Hierarquia de Áreas de Conhecimento e Disciplinas do Ensino Fundamental
              </h6>
              {curriculo.arvoreCurricular &&
                curriculo.arvoreCurricular.filhos.map((noArea) => (
                  <div
                    key={noArea.id}
                    className="border rounded-3 p-3 mb-3"
                    style={{ borderLeft: `5px solid ${noArea.metadados.cor || '#2563eb'}` }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold">
                        <i className="bi bi-folder2-open me-2 text-primary"></i>
                        {noArea.nome} ({noArea.metadados.codigo})
                      </span>
                      <span className="badge bg-light text-dark border">
                        {noArea.filhos.length} disciplina(s)
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {noArea.filhos.map((noDisc) => (
                        <span
                          key={noDisc.id}
                          className="badge bg-white text-dark border p-2"
                        >
                          <i className="bi bi-book me-1 text-secondary"></i>
                          <strong>{noDisc.nome}</strong> ({noDisc.metadados.codigo} •{' '}
                          {noDisc.metadados.carga_horaria_anual}h)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 6: TAGS PEDAGÓGICAS DE ACOMPANHAMENTO
         ===================================================================== */}
      {abaAtiva === 'tags' && (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="edu-card p-4">
              <h6 className="fw-bold mb-3">
                {formTag.id ? 'Editar Tag Pedagógica' : 'Cadastrar Nova Tag'}
              </h6>
              <form onSubmit={salvarTag} className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Nome da Tag</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={formTag.nome}
                    onChange={(e) => setFormTag({ ...formTag, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Categoria</label>
                  <select
                    className="form-select form-select-sm"
                    value={formTag.categoria}
                    onChange={(e) => setFormTag({ ...formTag, categoria: e.target.value })}
                  >
                    <option value="DESEMPENHO">Desempenho</option>
                    <option value="COMPORTAMENTO">Comportamento</option>
                    <option value="ASSIDUIDADE">Assiduidade</option>
                    <option value="PARTICIPACAO">Participação</option>
                    <option value="RECOMENDACAO">Recomendação</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Natureza</label>
                  <select
                    className="form-select form-select-sm"
                    value={formTag.natureza}
                    onChange={(e) => setFormTag({ ...formTag, natureza: e.target.value })}
                  >
                    <option value="POSITIVA">Positiva</option>
                    <option value="ATENCAO">Atenção</option>
                    <option value="NEUTRA">Neutra</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-semibold">Cor</label>
                  <input
                    type="color"
                    className="form-control form-control-sm form-control-color w-100"
                    value={formTag.cor}
                    onChange={(e) => setFormTag({ ...formTag, cor: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Descrição Orientadora</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    value={formTag.descricao}
                    onChange={(e) => setFormTag({ ...formTag, descricao: e.target.value })}
                  ></textarea>
                </div>
                <div className="col-12 mt-2 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm fw-semibold flex-grow-1">
                    {formTag.id ? 'Atualizar Tag' : 'Cadastrar Tag'}
                  </button>
                  {formTag.id && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setFormTag({
                          id: null,
                          nome: '',
                          categoria: 'DESEMPENHO',
                          natureza: 'POSITIVA',
                          cor: '#16a34a',
                          descricao: '',
                        })
                      }
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="edu-card p-4">
              <h6 className="fw-bold mb-3">Catálogo de Tags para Classificação Bimestral</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Tag Visual</th>
                      <th>Categoria</th>
                      <th>Descrição</th>
                      <th className="text-center">Usos</th>
                      <th>Status</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tg) => (
                      <tr key={tg.id}>
                        <td>
                          <span
                            className="edu-tag-chip"
                            style={{ backgroundColor: `${tg.cor}18`, color: tg.cor }}
                          >
                            <i className="bi bi-tag-fill"></i>
                            {tg.nome}
                          </span>
                        </td>
                        <td className="small">{tg.categoria}</td>
                        <td className="small text-muted">{tg.descricao}</td>
                        <td className="text-center fw-bold">{tg.total_usos}</td>
                        <td>
                          <span className={`badge ${tg.ativo ? 'bg-success-subtle text-success' : 'bg-secondary'}`}>
                            {tg.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() =>
                              setFormTag({
                                id: tg.id,
                                nome: tg.nome,
                                categoria: tg.categoria,
                                natureza: tg.natureza,
                                cor: tg.cor,
                                descricao: tg.descricao || '',
                                ativo: tg.ativo,
                              })
                            }
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 7: PERÍODOS DE DIGITAÇÃO DOS 4 BIMESTRES E ESCALA DE NOTAS
         ===================================================================== */}
      {abaAtiva === 'periodos' && (
        <div>
          <div className="edu-card p-4 mb-4">
            <h5 className="fw-bold mb-1">
              Configuração dos Períodos de Digitação (1º, 2º, 3º e 4º Bimestres) e Escala Escolar
            </h5>
            <p className="text-secondary small mb-0">
              Regra de Negócio: O professor somente poderá registrar ou editar acompanhamentos dentro do intervalo de abertura e encerramento definido abaixo e quando o bimestre não estiver bloqueado manualmente.
            </p>
          </div>

          <div className="row g-3">
            {periodos.map((p) => (
              <div className="col-md-6" key={p.id}>
                <div className="edu-card p-4 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-0">
                        {p.rotulo} — Ano Letivo {p.ano_letivo}
                      </h5>
                    </div>
                    <span
                      className={`badge ${
                        p.esta_aberto ? 'bg-success' : 'bg-danger'
                      } px-3 py-2`}
                    >
                      <i
                        className={`bi ${
                          p.esta_aberto ? 'bi-unlock-fill' : 'bi-lock-fill'
                        } me-1`}
                      ></i>
                      {p.esta_aberto ? 'DIGITAÇÃO ABERTA' : 'DIGITAÇÃO ENCERRADA / BLOQUEADA'}
                    </span>
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Data e Hora de Abertura</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={p.data_hora_abertura.slice(0, 16)}
                        onChange={(e) => {
                          const novos = periodos.map((item) =>
                            item.id === p.id
                              ? { ...item, data_hora_abertura: e.target.value }
                              : item
                          );
                          setPeriodos(novos);
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Data e Hora de Encerramento</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={p.data_hora_encerramento.slice(0, 16)}
                        onChange={(e) => {
                          const novos = periodos.map((item) =>
                            item.id === p.id
                              ? { ...item, data_hora_encerramento: e.target.value }
                              : item
                          );
                          setPeriodos(novos);
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Nota Mínima</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm"
                        value={p.nota_minima}
                        onChange={(e) => {
                          const novos = periodos.map((item) =>
                            item.id === p.id ? { ...item, nota_minima: e.target.value } : item
                          );
                          setPeriodos(novos);
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Nota Máxima</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm"
                        value={p.nota_maxima}
                        onChange={(e) => {
                          const novos = periodos.map((item) =>
                            item.id === p.id ? { ...item, nota_maxima: e.target.value } : item
                          );
                          setPeriodos(novos);
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Média Referência</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm"
                        value={p.media_referencia}
                        onChange={(e) => {
                          const novos = periodos.map((item) =>
                            item.id === p.id ? { ...item, media_referencia: e.target.value } : item
                          );
                          setPeriodos(novos);
                        }}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={Boolean(p.fechado_manualmente)}
                        onChange={(e) => {
                          const atualizado = {
                            ...p,
                            fechado_manualmente: e.target.checked ? 1 : 0,
                          };
                          salvarPeriodo(atualizado);
                        }}
                      />
                      <label className="form-check-label small fw-semibold">
                        Bloquear digitação manualmente
                      </label>
                    </div>
                    <button
                      className="btn btn-primary btn-sm fw-semibold"
                      onClick={() => salvarPeriodo(p)}
                    >
                      <i className="bi bi-check2 me-1"></i>
                      Salvar Período
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REVISÃO E EDIÇÃO ADMINISTRATIVA COM RASTREABILIDADE
         ===================================================================== */}
      {modalRevisao && (
        <div className="edu-modal-backdrop" onClick={() => setModalRevisao(null)}>
          <div className="edu-modal-content p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <span className="badge bg-primary mb-1">REVISÃO COM RASTREABILIDADE</span>
                <h5 className="fw-bold mb-0">
                  {modalRevisao.aluno_nome} — {modalRevisao.disciplina_nome} (
                  {modalRevisao.bimestre}º Bimestre)
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setModalRevisao(null)}
              ></button>
            </div>

            <form onSubmit={salvarRevisaoAdmin}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Média do Bimestre (0 a 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    className="form-control"
                    value={modalRevisao.media}
                    onChange={(e) =>
                      setModalRevisao({ ...modalRevisao, media: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Frequência (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={modalRevisao.frequencia_percentual}
                    onChange={(e) =>
                      setModalRevisao({
                        ...modalRevisao,
                        frequencia_percentual: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Descrição Qualitativa do Acompanhamento
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={modalRevisao.descricao}
                    onChange={(e) =>
                      setModalRevisao({ ...modalRevisao, descricao: e.target.value })
                    }
                    required
                  ></textarea>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Tags Pedagógicas Associadas
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {tags.map((tg) => {
                      const selecionada = (modalRevisao.tagsIds || []).includes(tg.id);
                      return (
                        <span
                          key={tg.id}
                          className="edu-tag-chip edu-tag-selectable"
                          style={{
                            backgroundColor: selecionada ? tg.cor : '#f1f5f9',
                            color: selecionada ? '#fff' : '#334155',
                          }}
                          onClick={() => {
                            const atuais = modalRevisao.tagsIds || [];
                            const novas = selecionada
                              ? atuais.filter((id) => id !== tg.id)
                              : [...atuais, tg.id];
                            setModalRevisao({ ...modalRevisao, tagsIds: novas });
                          }}
                        >
                          <i className={`bi ${selecionada ? 'bi-check-circle-fill' : 'bi-plus-circle'}`}></i>
                          {tg.nome}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Observação da Coordenação / Administração Escolar
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalRevisao.observacao_coordenacao || ''}
                    onChange={(e) =>
                      setModalRevisao({
                        ...modalRevisao,
                        observacao_coordenacao: e.target.value,
                      })
                    }
                    placeholder="Parecer complementar da coordenação..."
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold text-primary">
                    Justificativa da Alteração Administrativa (Registrada na Auditoria)
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary"
                    value={modalRevisao.justificativa}
                    onChange={(e) =>
                      setModalRevisao({ ...modalRevisao, justificativa: e.target.value })
                    }
                    placeholder="Descreva o motivo da revisão/alteração para o histórico de rastreabilidade..."
                    required
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setModalRevisao(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary fw-semibold">
                  <i className="bi bi-shield-check me-1"></i>
                  Salvar Alteração com Rastreabilidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DEVOLVER ACOMPANHAMENTO AO PROFESSOR PARA AJUSTES
         ===================================================================== */}
      {modalDevolucao && (
        <div className="edu-modal-backdrop" onClick={() => setModalDevolucao(null)}>
          <div className="edu-modal-content p-4" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <h5 className="fw-bold text-danger mb-2">
              <i className="bi bi-arrow-counterclockwise me-2"></i>
              Devolver Acompanhamento para Ajustes
            </h5>
            <p className="small text-secondary mb-3">
              Aluno(a): <strong>{modalDevolucao.aluno_nome}</strong> • Disciplina:{' '}
              <strong>{modalDevolucao.disciplina_nome}</strong> • Professor(a):{' '}
              <strong>{modalDevolucao.professor_nome}</strong>
            </p>
            <form onSubmit={confirmarDevolucao}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Orientações e Motivo da Devolução
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={modalDevolucao.motivo_devolucao}
                  onChange={(e) =>
                    setModalDevolucao({
                      ...modalDevolucao,
                      motivo_devolucao: e.target.value,
                    })
                  }
                  placeholder="Explique ao professor quais pontos devem ser complementados ou ajustados..."
                  required
                ></textarea>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setModalDevolucao(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger fw-semibold">
                  Confirmar Devolução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: PILHA DE HISTÓRICO DE RASTREABILIDADE (LIFO)
         ===================================================================== */}
      {modalHistorico && (
        <div className="edu-modal-backdrop" onClick={() => setModalHistorico(null)}>
          <div className="edu-modal-content p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <span className="badge bg-dark mb-1">
                  ESTRUTURA DE DADOS: PILHA DE AUDITORIA (LIFO)
                </span>
                <h5 className="fw-bold mb-0">
                  Trilha de Rastreabilidade — {modalHistorico.acompanhamento.aluno_nome} (
                  {modalHistorico.acompanhamento.disciplina_nome})
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setModalHistorico(null)}
              ></button>
            </div>

            <div className="edu-timeline mt-3">
              {modalHistorico.eventos.map((ev) => (
                <div className="edu-timeline-item" key={ev.id}>
                  <div className="edu-timeline-dot"></div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <span className="badge bg-primary me-2">{ev.acao}</span>
                      <strong>{ev.usuario_nome}</strong>{' '}
                      <span className="badge bg-light text-secondary border">
                        {ev.usuario_perfil}
                      </span>
                    </div>
                    <small className="text-muted">
                      <i className="bi bi-calendar3 me-1"></i>
                      {ev.data_hora}
                    </small>
                  </div>

                  {ev.status_posterior && (
                    <div className="small text-secondary mb-1">
                      Transição de Estado:{' '}
                      <code>{ev.status_anterior || 'INICIAL'}</code> →{' '}
                      <code>{ev.status_posterior}</code>
                    </div>
                  )}

                  {ev.justificativa && (
                    <div className="small fst-italic text-dark mb-2">
                      "{ev.justificativa}"
                    </div>
                  )}

                  <div className="row g-2">
                    {ev.estado_anterior && (
                      <div className="col-md-6">
                        <div className="edu-diff-box">
                          <div className="fw-bold text-danger mb-1">Estado Anterior:</div>
                          {ev.estado_anterior.media !== undefined && (
                            <div>Média: {ev.estado_anterior.media}</div>
                          )}
                          {ev.estado_anterior.descricao && (
                            <div className="text-truncate" title={ev.estado_anterior.descricao}>
                              Descrição: {ev.estado_anterior.descricao}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {ev.estado_posterior && (
                      <div className="col-md-6">
                        <div className="edu-diff-box">
                          <div className="fw-bold text-success mb-1">Estado Posterior:</div>
                          {ev.estado_posterior.media !== undefined && (
                            <div>Média: {ev.estado_posterior.media}</div>
                          )}
                          {ev.estado_posterior.descricao && (
                            <div className="text-truncate" title={ev.estado_posterior.descricao}>
                              Descrição: {ev.estado_posterior.descricao}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
