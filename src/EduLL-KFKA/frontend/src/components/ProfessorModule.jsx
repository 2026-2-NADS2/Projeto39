import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

export default function ProfessorModule() {
  const [abaAtiva, setAbaAtiva] = useState('lancamento');
  const [painel, setPainel] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Estado do formulário de lançamento/edição
  const [atribuicaoSelecionadaIdx, setAtribuicaoSelecionadaIdx] = useState(0);
  const [formAcomp, setFormAcomp] = useState({
    id: null,
    bimestre: 1,
    aluno_id: '',
    media: '8.0',
    frequencia_percentual: '100',
    descricao: '',
    tagsIds: [],
  });

  // Filtros da listagem do professor
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroBimestre, setFiltroBimestre] = useState('');

  // Modal de Histórico e Resposta à Família
  const [modalHistorico, setModalHistorico] = useState(null);
  const [respostasFamilia, setRespostasFamilia] = useState({});

  const exibirAlerta = (texto, tipo = 'success') => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem(null), 5000);
  };

  const carregarPainel = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await apiRequest('/professor/painel');
      setPainel(dados);
      if (dados.atribuicoes && dados.atribuicoes.length > 0) {
        const primeira = dados.atribuicoes[0];
        if (primeira.alunos && primeira.alunos.length > 0 && !formAcomp.aluno_id) {
          setFormAcomp((prev) => ({ ...prev, aluno_id: String(primeira.alunos[0].id) }));
        }
      }
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    } finally {
      setCarregando(false);
    }
  }, [formAcomp.aluno_id]);

  useEffect(() => {
    carregarPainel();
  }, [carregarPainel]);

  if (!painel) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2 text-muted">Carregando módulo do professor...</p>
      </div>
    );
  }

  const atribuicaoAtual = painel.atribuicoes[atribuicaoSelecionadaIdx] || null;
  const periodoSelecionado =
    painel.periodos.find((p) => Number(p.bimestre) === Number(formAcomp.bimestre)) || null;

  const devolvidos = (painel.acompanhamentos || []).filter((ac) => ac.status === 'DEVOLVIDO');
  const rascunhos = (painel.acompanhamentos || []).filter((ac) => ac.status === 'RASCUNHO');

  async function salvarOuEnviar(enviarParaRevisao) {
    if (!atribuicaoAtual) {
      exibirAlerta('Selecione uma turma e disciplina vinculada.', 'warning');
      return;
    }
    try {
      const payload = {
        aluno_id: Number(formAcomp.aluno_id),
        turma_id: Number(atribuicaoAtual.turma_id),
        disciplina_id: Number(atribuicaoAtual.disciplina_id),
        bimestre: Number(formAcomp.bimestre),
        ano_letivo: 2026,
        media: Number(formAcomp.media),
        frequencia_percentual: Number(formAcomp.frequencia_percentual),
        descricao: formAcomp.descricao,
        tagsIds: formAcomp.tagsIds,
        enviarParaRevisao,
      };

      if (formAcomp.id) {
        await apiRequest(`/professor/acompanhamentos/${formAcomp.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        exibirAlerta(
          enviarParaRevisao
            ? 'Acompanhamento atualizado e enviado para revisão administrativa!'
            : 'Rascunho atualizado com sucesso!'
        );
      } else {
        await apiRequest('/professor/acompanhamentos', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        exibirAlerta(
          enviarParaRevisao
            ? 'Acompanhamento registrado e enviado para revisão administrativa!'
            : 'Acompanhamento salvo como rascunho!'
        );
      }

      setFormAcomp({
        id: null,
        bimestre: formAcomp.bimestre,
        aluno_id: atribuicaoAtual.alunos[0] ? String(atribuicaoAtual.alunos[0].id) : '',
        media: '8.0',
        frequencia_percentual: '100',
        descricao: '',
        tagsIds: [],
      });
      carregarPainel();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  function carregarParaEdicao(ac) {
    const idxAtrib = painel.atribuicoes.findIndex(
      (a) =>
        Number(a.turma_id) === Number(ac.turma_id) &&
        Number(a.disciplina_id) === Number(ac.disciplina_id)
    );
    if (idxAtrib >= 0) {
      setAtribuicaoSelecionadaIdx(idxAtrib);
    }
    setFormAcomp({
      id: ac.id,
      bimestre: ac.bimestre,
      aluno_id: String(ac.aluno_id),
      media: String(ac.media),
      frequencia_percentual: String(ac.frequencia_percentual),
      descricao: ac.descricao,
      tagsIds: ac.tagsIds || [],
    });
    setAbaAtiva('lancamento');
  }

  async function abrirHistorico(ac) {
    try {
      const eventos = await apiRequest(`/professor/acompanhamentos/${ac.id}/historico`);
      setModalHistorico({ acompanhamento: ac, eventos });
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  async function enviarRespostaFamilia(interacaoId) {
    const texto = respostasFamilia[interacaoId];
    if (!texto || !texto.trim()) return;
    try {
      await apiRequest(`/professor/interacoes/${interacaoId}/responder`, {
        method: 'POST',
        body: JSON.stringify({ resposta_escola: texto }),
      });
      exibirAlerta('Resposta enviada ao responsável com sucesso!');
      carregarPainel();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  const acompanhamentosFiltrados = (painel.acompanhamentos || []).filter((ac) => {
    if (filtroStatus && ac.status !== filtroStatus) return false;
    if (filtroBimestre && String(ac.bimestre) !== String(filtroBimestre)) return false;
    return true;
  });

  return (
    <div className="container-fluid py-4 px-md-4">
      {mensagem && (
        <div className={`alert alert-${mensagem.tipo} alert-dismissible fade show shadow-sm mb-3`}>
          <i className="bi bi-info-circle-fill me-2"></i>
          {mensagem.texto}
          <button type="button" className="btn-close" onClick={() => setMensagem(null)}></button>
        </div>
      )}

      {/* Alerta de Registros Devolvidos para Ajuste */}
      {devolvidos.length > 0 && (
        <div className="edu-card p-3 mb-4 border-start border-4 border-danger bg-danger-subtle">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h6 className="fw-bold text-danger mb-1">
                <i className="bi bi-exclamation-octagon-fill me-2"></i>
                Atenção: Você possui {devolvidos.length} acompanhamento(s) devolvido(s) pela Administração para ajustes!
              </h6>
              <small className="text-dark">
                Revise as orientações da Coordenação Pedagógica, ajuste o parecer e reenvie para revisão.
              </small>
            </div>
            <button
              className="btn btn-danger btn-sm fw-semibold"
              onClick={() => carregarParaEdicao(devolvidos[0])}
            >
              Tratar Devolução Agora
            </button>
          </div>
        </div>
      )}

      {/* Navegação do Módulo Professor */}
      <div className="edu-card p-2 mb-4">
        <ul className="nav nav-pills edu-nav-pills flex-wrap gap-1">
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'lancamento' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('lancamento')}
            >
              <i className="bi bi-pencil-square me-2"></i>
              {formAcomp.id ? 'Editar Acompanhamento' : 'Registrar Acompanhamento Bimestral'}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'meus_registros' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('meus_registros')}
            >
              <i className="bi bi-list-check me-2"></i>
              Status das Anotações ({painel.acompanhamentos.length})
              {devolvidos.length > 0 && (
                <span className="badge bg-danger ms-2">{devolvidos.length} devolvido(s)</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${abaAtiva === 'turmas_retornos' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('turmas_retornos')}
            >
              <i className="bi bi-chat-heart me-2"></i>
              Minhas Turmas & Retornos dos Pais ({painel.retornosResponsaveis.length})
            </button>
          </li>
        </ul>
      </div>

      {/* =====================================================================
          ABA 1: REGISTRO / EDIÇÃO DE ACOMPANHAMENTO BIMESTRAL
         ===================================================================== */}
      {abaAtiva === 'lancamento' && (
        <div className="row g-4">
          {/* Painel Lateral: Períodos de Digitação e Turmas Vinculadas */}
          <div className="col-lg-4">
            <div className="edu-card p-4 mb-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-calendar-check me-2 text-primary"></i>
                Períodos de Digitação — 2026
              </h6>
              {painel.periodos.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 rounded-3 border mb-2 d-flex justify-content-between align-items-center ${
                    Number(formAcomp.bimestre) === Number(p.bimestre) ? 'border-primary bg-light' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setFormAcomp({ ...formAcomp, bimestre: p.bimestre })}
                >
                  <div>
                    <div className="fw-semibold small">{p.rotulo}</div>
                    <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                      Até {p.data_hora_encerramento.replace('T', ' ')}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      p.esta_aberto ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                    }`}
                  >
                    {p.esta_aberto ? 'Aberto' : 'Encerrado'}
                  </span>
                </div>
              ))}
            </div>

            <div className="edu-card p-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-mortarboard me-2 text-primary"></i>
                Suas Turmas e Disciplinas Vinculadas
              </h6>
              {painel.atribuicoes.map((atrib, idx) => (
                <div
                  key={atrib.vinculo_id}
                  className={`p-3 rounded-3 border mb-2 ${
                    idx === atribuicaoSelecionadaIdx
                      ? 'border-primary bg-primary-subtle'
                      : 'bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setAtribuicaoSelecionadaIdx(idx);
                    if (atrib.alunos && atrib.alunos.length > 0) {
                      setFormAcomp((prev) => ({
                        ...prev,
                        id: null,
                        aluno_id: String(atrib.alunos[0].id),
                      }));
                    }
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">{atrib.disciplina_nome}</span>
                    <span className="small text-muted">{atrib.alunos.length} alunos</span>
                  </div>
                  <div className="fw-bold mt-1">{atrib.turma_nome}</div>
                  <div className="small text-secondary">
                    {atrib.area_nome} • Turno: {atrib.turno}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulário Principal de Acompanhamento Bimestral */}
          <div className="col-lg-8">
            <div className="edu-card p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
                <div>
                  <span className="badge bg-success mb-1">
                    {formAcomp.id
                      ? `EDITANDO REGISTRO #${formAcomp.id}`
                      : 'NOVO ACOMPANHAMENTO BIMESTRAL'}
                  </span>
                  <h5 className="fw-bold mb-0">
                    {atribuicaoAtual
                      ? `${atribuicaoAtual.turma_nome} — ${atribuicaoAtual.disciplina_nome}`
                      : 'Selecione uma turma'}
                  </h5>
                </div>
                {periodoSelecionado && (
                  <span
                    className={`badge ${
                      periodoSelecionado.esta_aberto ? 'bg-success' : 'bg-danger'
                    } p-2`}
                  >
                    {periodoSelecionado.rotulo}:{' '}
                    {periodoSelecionado.esta_aberto ? 'Período Aberto' : 'Período Fechado'}
                  </span>
                )}
              </div>

              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Bimestre Letivo</label>
                  <select
                    className="form-select"
                    value={formAcomp.bimestre}
                    onChange={(e) =>
                      setFormAcomp({ ...formAcomp, bimestre: Number(e.target.value) })
                    }
                    disabled={Boolean(formAcomp.id)}
                  >
                    {painel.periodos.map((p) => (
                      <option key={p.bimestre} value={p.bimestre}>
                        {p.rotulo} ({p.esta_aberto ? 'Aberto' : 'Encerrado'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-8">
                  <label className="form-label small fw-semibold">
                    Aluno(a) Matriculado(a) na Turma
                  </label>
                  <select
                    className="form-select"
                    value={formAcomp.aluno_id}
                    onChange={(e) => setFormAcomp({ ...formAcomp, aluno_id: e.target.value })}
                    disabled={Boolean(formAcomp.id)}
                  >
                    {(atribuicaoAtual?.alunos || []).map((al) => (
                      <option key={al.id} value={al.id}>
                        {al.nome} (Matrícula: {al.matricula})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Média do Bimestre (Escala:{' '}
                    {periodoSelecionado
                      ? `${periodoSelecionado.nota_minima} a ${periodoSelecionado.nota_maxima}`
                      : '0 a 10'}
                    )
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={periodoSelecionado?.nota_minima ?? 0}
                    max={periodoSelecionado?.nota_maxima ?? 10}
                    className="form-control"
                    value={formAcomp.media}
                    onChange={(e) => setFormAcomp({ ...formAcomp, media: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Frequência no Bimestre (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={formAcomp.frequencia_percentual}
                    onChange={(e) =>
                      setFormAcomp({ ...formAcomp, frequencia_percentual: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Descrição Qualitativa do Andamento do Aluno na Disciplina
                  </label>
                  <textarea
                    className="form-control"
                    rows="5"
                    value={formAcomp.descricao}
                    onChange={(e) => setFormAcomp({ ...formAcomp, descricao: e.target.value })}
                    placeholder="Descreva os avanços pedagógicos, participação, entrega de atividades e recomendações para a família..."
                    required
                  ></textarea>
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Selecione Múltiplas Tags de Acompanhamento:
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {painel.tagsAtivas.map((tg) => {
                      const ativa = formAcomp.tagsIds.includes(tg.id);
                      return (
                        <span
                          key={tg.id}
                          className="edu-tag-chip edu-tag-selectable"
                          style={{
                            backgroundColor: ativa ? tg.cor : '#f1f5f9',
                            color: ativa ? '#ffffff' : '#334155',
                            borderColor: tg.cor,
                          }}
                          onClick={() => {
                            const novas = ativa
                              ? formAcomp.tagsIds.filter((id) => id !== tg.id)
                              : [...formAcomp.tagsIds, tg.id];
                            setFormAcomp({ ...formAcomp, tagsIds: novas });
                          }}
                        >
                          <i className={`bi ${ativa ? 'bi-check-circle-fill' : 'bi-plus-circle'}`}></i>
                          {tg.nome}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center mt-4 pt-3 border-top gap-2">
                {formAcomp.id ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setFormAcomp({
                        id: null,
                        bimestre: 1,
                        aluno_id: atribuicaoAtual?.alunos[0]
                          ? String(atribuicaoAtual.alunos[0].id)
                          : '',
                        media: '8.0',
                        frequencia_percentual: '100',
                        descricao: '',
                        tagsIds: [],
                      })
                    }
                  >
                    Cancelar Edição
                  </button>
                ) : (
                  <span className="small text-muted">
                    <i className="bi bi-shield-check me-1"></i>
                    Você pode salvar como rascunho ou encaminhar direto à Administração.
                  </span>
                )}

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold"
                    onClick={() => salvarOuEnviar(false)}
                  >
                    <i className="bi bi-floppy me-1"></i>
                    Salvar como Rascunho
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary fw-semibold"
                    onClick={() => salvarOuEnviar(true)}
                  >
                    <i className="bi bi-send-check me-1"></i>
                    Enviar para Revisão Administrativa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 2: MEUS REGISTROS, STATUS E TRATAMENTO DE DEVOLUÇÕES
         ===================================================================== */}
      {abaAtiva === 'meus_registros' && (
        <div>
          <div className="edu-card p-3 mb-4">
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label small fw-semibold mb-1">Filtrar por Status</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="">Todos os Status</option>
                  <option value="RASCUNHO">RASCUNHO ({rascunhos.length})</option>
                  <option value="DEVOLVIDO">DEVOLVIDO PARA AJUSTES ({devolvidos.length})</option>
                  <option value="ENVIADO">ENVIADO PARA REVISÃO</option>
                  <option value="PUBLICADO">PUBLICADO AOS PAIS</option>
                </select>
              </div>
              <div className="col-md-4">
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
            </div>
          </div>

          <div className="row g-3">
            {acompanhamentosFiltrados.map((ac) => (
              <div className="col-12" key={ac.id}>
                <div className="edu-card p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <span className={`edu-status-badge status-${ac.status} me-2`}>
                        {ac.status}
                      </span>
                      <span className="badge bg-dark me-2">{ac.bimestre}º Bimestre</span>
                      <span className="badge bg-primary-subtle text-primary me-2">
                        {ac.turma_nome}
                      </span>
                      <span className="badge bg-secondary">{ac.disciplina_nome}</span>
                      <h5 className="fw-bold mt-2 mb-0">
                        {ac.aluno_nome} — Média: {Number(ac.media).toFixed(1)}
                      </h5>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => abrirHistorico(ac)}
                      >
                        <i className="bi bi-clock-history me-1"></i>
                        Histórico
                      </button>
                      {(ac.status === 'RASCUNHO' || ac.status === 'DEVOLVIDO') && (
                        <button
                          className="btn btn-primary btn-sm fw-semibold"
                          onClick={() => carregarParaEdicao(ac)}
                        >
                          <i className="bi bi-pencil-square me-1"></i>
                          {ac.status === 'DEVOLVIDO' ? 'Realizar Ajustes e Reenviar' : 'Editar Rascunho'}
                        </button>
                      )}
                    </div>
                  </div>

                  {ac.motivo_devolucao && (
                    <div className="alert alert-danger py-2 small my-2">
                      <i className="bi bi-arrow-return-right me-2"></i>
                      <strong>Orientação da Administração para Ajuste:</strong> {ac.motivo_devolucao}
                    </div>
                  )}

                  <p className="mb-2 text-dark">{ac.descricao}</p>

                  <div className="d-flex flex-wrap gap-1">
                    {(ac.tags || []).map((tg) => (
                      <span
                        key={tg.id}
                        className="edu-tag-chip"
                        style={{ backgroundColor: `${tg.cor}18`, color: tg.cor }}
                      >
                        {tg.nome}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 3: TURMAS VINCULADAS E RETORNOS DOS PAIS/RESPONSÁVEIS
         ===================================================================== */}
      {abaAtiva === 'turmas_retornos' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="edu-card p-4 h-100">
              <h6 className="fw-bold mb-3">
                Confirmações de Ciência e Observações das Famílias
              </h6>
              {painel.retornosResponsaveis.length === 0 ? (
                <p className="text-muted small">
                  Nenhuma observação de responsável registrada até o momento.
                </p>
              ) : (
                painel.retornosResponsaveis.map((ret) => (
                  <div key={ret.id} className="border rounded-3 p-3 mb-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-primary">
                        {ret.aluno_nome} ({ret.disciplina_nome} — {ret.bimestre}º Bim)
                      </span>
                      <span className="badge bg-success">Ciência Confirmada</span>
                    </div>
                    <div className="small text-muted mb-2">
                      Responsável: <strong>{ret.responsavel_nome}</strong> em {ret.data_ciencia}
                    </div>
                    {ret.observacao_responsavel && (
                      <div className="p-2 bg-white rounded border small mb-2">
                        <strong>Mensagem da Família:</strong> "{ret.observacao_responsavel}"
                      </div>
                    )}
                    {ret.resposta_escola ? (
                      <div className="p-2 bg-primary-subtle rounded small text-dark">
                        <strong>Sua Resposta ({ret.data_resposta}):</strong> "{ret.resposta_escola}"
                      </div>
                    ) : (
                      <div className="input-group input-group-sm mt-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Escrever retorno para a família..."
                          value={respostasFamilia[ret.id] || ''}
                          onChange={(e) =>
                            setRespostasFamilia({
                              ...respostasFamilia,
                              [ret.id]: e.target.value,
                            })
                          }
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => enviarRespostaFamilia(ret.id)}
                        >
                          Responder
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="edu-card p-4 h-100">
              <h6 className="fw-bold mb-3">Relação de Alunos por Turma Vinculada</h6>
              {painel.atribuicoes.map((atrib) => (
                <div key={atrib.vinculo_id} className="mb-3 border-bottom pb-3">
                  <div className="fw-bold text-dark mb-1">
                    {atrib.turma_nome} — <span className="text-primary">{atrib.disciplina_nome}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Matrícula</th>
                          <th>Aluno(a)</th>
                          <th>Observações Pedagógicas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atrib.alunos.map((al) => (
                          <tr key={al.id}>
                            <td className="small text-muted">{al.matricula}</td>
                            <td className="small fw-semibold">{al.nome}</td>
                            <td className="small text-secondary">
                              {al.observacoes_pedagogicas || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {modalHistorico && (
        <div className="edu-modal-backdrop" onClick={() => setModalHistorico(null)}>
          <div className="edu-modal-content p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h5 className="fw-bold mb-0">
                Histórico de Rastreabilidade — {modalHistorico.acompanhamento.aluno_nome}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setModalHistorico(null)}
              ></button>
            </div>
            <div className="edu-timeline">
              {modalHistorico.eventos.map((ev) => (
                <div className="edu-timeline-item" key={ev.id}>
                  <div className="edu-timeline-dot"></div>
                  <div className="d-flex justify-content-between">
                    <strong>
                      {ev.acao} — {ev.usuario_nome} ({ev.usuario_perfil})
                    </strong>
                    <small className="text-muted">{ev.data_hora}</small>
                  </div>
                  {ev.justificativa && (
                    <div className="small text-secondary mt-1">"{ev.justificativa}"</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
