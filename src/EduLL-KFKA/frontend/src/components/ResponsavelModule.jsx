import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import {
  gerarRelatorioIndividualPDF,
  gerarBoletimConsolidadoPDF,
} from '../utils/pdfGenerator';

export default function ResponsavelModule() {
  const [painel, setPainel] = useState(null);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(null);
  const [filtroAno, setFiltroAno] = useState('2026');
  const [filtroBimestre, setFiltroBimestre] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [observacoesInput, setObservacoesInput] = useState({});
  const [mensagem, setMensagem] = useState(null);

  const exibirAlerta = (texto, tipo = 'success') => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem(null), 5000);
  };

  const carregarPainel = useCallback(async () => {
    try {
      const dados = await apiRequest('/responsavel/painel');
      setPainel(dados);
      if (dados.alunos && dados.alunos.length > 0 && !alunoSelecionadoId) {
        setAlunoSelecionadoId(dados.alunos[0].id);
      }
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }, [alunoSelecionadoId]);

  useEffect(() => {
    carregarPainel();
  }, [carregarPainel]);

  if (!painel) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2 text-muted">Carregando portal da família...</p>
      </div>
    );
  }

  const alunoAtual =
    painel.alunos.find((a) => Number(a.id) === Number(alunoSelecionadoId)) || null;

  const relatoriosDoAluno = (painel.relatoriosPublicados || []).filter((r) => {
    if (alunoAtual && Number(r.aluno_id) !== Number(alunoAtual.id)) return false;
    if (filtroAno && String(r.ano_letivo) !== String(filtroAno)) return false;
    if (filtroBimestre && String(r.bimestre) !== String(filtroBimestre)) return false;
    if (filtroDisciplina && String(r.disciplina_id) !== String(filtroDisciplina)) return false;
    return true;
  });

  // Lista única de disciplinas nos relatórios publicados do aluno
  const disciplinasDisponiveis = Array.from(
    new Map(
      (painel.relatoriosPublicados || [])
        .filter((r) => !alunoAtual || Number(r.aluno_id) === Number(alunoAtual.id))
        .map((r) => [r.disciplina_id, { id: r.disciplina_id, nome: r.disciplina_nome }])
    ).values()
  );

  async function registrarCienciaResponsavel(ac) {
    try {
      const obs = observacoesInput[ac.id] || '';
      await apiRequest(`/responsavel/acompanhamentos/${ac.id}/ciencia`, {
        method: 'POST',
        body: JSON.stringify({ observacao_responsavel: obs }),
      });
      exibirAlerta(
        obs
          ? 'Ciência confirmada e observação encaminhada ao professor e à administração escolar!'
          : 'Ciência de leitura registrada com sucesso!'
      );
      carregarPainel();
    } catch (err) {
      exibirAlerta(err.message, 'danger');
    }
  }

  return (
    <div className="container py-4">
      {mensagem && (
        <div className={`alert alert-${mensagem.tipo} alert-dismissible fade show shadow-sm mb-3`}>
          <i className="bi bi-check-circle-fill me-2"></i>
          {mensagem.texto}
          <button type="button" className="btn-close" onClick={() => setMensagem(null)}></button>
        </div>
      )}

      {/* Seletor de Alunos Vinculados ao Cadastro do Responsável */}
      <div className="edu-card p-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div>
            <span className="badge bg-info-subtle text-info border border-info-subtle mb-1">
              MÓDULO PAI / RESPONSÁVEL
            </span>
            <h5 className="fw-bold mb-0">
              Alunos Vinculados ao Cadastro de {painel.responsavel.nome}
            </h5>
            <small className="text-muted">
              Selecione o(a) aluno(a) abaixo para consultar os relatórios bimestrais publicados e emitir o documento em PDF.
            </small>
          </div>
          {alunoAtual && relatoriosDoAluno.length > 0 && (
            <button
              className="btn btn-primary fw-semibold"
              onClick={() =>
                gerarBoletimConsolidadoPDF(
                  alunoAtual,
                  relatoriosDoAluno,
                  painel.responsavel.nome,
                  filtroBimestre
                )
              }
            >
              <i className="bi bi-file-earmark-pdf-fill me-2"></i>
              Baixar Boletim Consolidado em PDF
            </button>
          )}
        </div>

        <div className="row g-3">
          {painel.alunos.map((al) => {
            const ativo = Number(al.id) === Number(alunoSelecionadoId);
            const qtdPub = (painel.relatoriosPublicados || []).filter(
              (r) => Number(r.aluno_id) === Number(al.id)
            ).length;
            return (
              <div className="col-md-6" key={al.id}>
                <div
                  className={`p-3 rounded-3 border edu-card-hover ${
                    ativo ? 'border-primary bg-primary-subtle' : 'bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAlunoSelecionadoId(al.id)}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="badge bg-primary">
                      <i className="bi bi-person-badge me-1"></i>
                      {al.parentesco}
                    </span>
                    <span className="badge bg-success">
                      {qtdPub} relatório(s) publicado(s)
                    </span>
                  </div>
                  <h5 className="fw-bold mb-1 text-dark">{al.nome}</h5>
                  <div className="small text-secondary">
                    Matrícula: <strong>{al.matricula}</strong> • Turma:{' '}
                    <strong>{al.turma_nome || al.serie_atual}</strong> ({al.turno || 'MANHÃ'})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros por Ano Letivo, Bimestre e Disciplina */}
      <div className="edu-card p-3 mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label small fw-semibold mb-1">Ano Letivo</label>
            <select
              className="form-select form-select-sm"
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
            >
              <option value="2026">Ano Letivo 2026</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold mb-1">Bimestre</label>
            <select
              className="form-select form-select-sm"
              value={filtroBimestre}
              onChange={(e) => setFiltroBimestre(e.target.value)}
            >
              <option value="">Todos os Bimestres Publicados</option>
              <option value="1">1º Bimestre</option>
              <option value="2">2º Bimestre</option>
              <option value="3">3º Bimestre</option>
              <option value="4">4º Bimestre</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold mb-1">Disciplina</label>
            <select
              className="form-select form-select-sm"
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
            >
              <option value="">Todas as Disciplinas</option>
              {disciplinasDisponiveis.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Relatórios Publicados */}
      {relatoriosDoAluno.length === 0 ? (
        <div className="edu-card p-5 text-center">
          <i className="bi bi-journal-x fs-1 text-muted"></i>
          <h6 className="fw-bold mt-3">
            Nenhum relatório publicado encontrado para os filtros selecionados
          </h6>
          <p className="text-muted small mb-0">
            Somente acompanhamentos revisados e publicados pela Administração Escolar ficam visíveis neste portal.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {relatoriosDoAluno.map((ac) => {
            const minhaCiencia =
              (ac.interacoes || []).find(
                (i) => Number(i.responsavel_id) === Number(painel.responsavel.id)
              ) ||
              (ac.interacoes && ac.interacoes[0]) ||
              null;

            return (
              <div className="col-12" key={ac.id}>
                <div className="edu-card p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3 pb-3 border-bottom">
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                        <span className="edu-status-badge status-PUBLICADO">
                          <i className="bi bi-patch-check-fill"></i>
                          PUBLICADO OFICIALMENTE
                        </span>
                        <span className="badge bg-dark">
                          {ac.bimestre}º Bimestre / {ac.ano_letivo}
                        </span>
                        <span
                          className="badge"
                          style={{ backgroundColor: ac.area_cor || '#2563eb', color: '#fff' }}
                        >
                          {ac.area_nome}
                        </span>
                      </div>
                      <h4 className="fw-bold mb-1">
                        {ac.disciplina_nome} — {ac.aluno_nome}
                      </h4>
                      <div className="small text-secondary">
                        Professor(a): <strong>{ac.professor_nome}</strong> • Turma:{' '}
                        <strong>{ac.turma_nome}</strong>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                      <div className="text-center px-3 py-2 rounded-3 bg-primary-subtle border border-primary-subtle">
                        <div className="small text-primary fw-semibold">Média Bimestral</div>
                        <div className="fs-4 fw-bold text-primary">
                          {Number(ac.media).toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-3 bg-light border">
                        <div className="small text-muted fw-semibold">Frequência</div>
                        <div className="fs-5 fw-bold text-dark">
                          {ac.frequencia_percentual}%
                        </div>
                      </div>
                      <button
                        className="btn btn-outline-danger fw-semibold"
                        onClick={() => gerarRelatorioIndividualPDF(ac, painel.responsavel.nome)}
                      >
                        <i className="bi bi-file-earmark-pdf-fill me-1"></i>
                        Gerar PDF
                      </button>
                    </div>
                  </div>

                  {/* Parecer Qualitativo */}
                  <div className="p-3 rounded-3 bg-light border mb-3">
                    <div className="small fw-bold text-secondary mb-1">
                      <i className="bi bi-chat-quote-fill text-primary me-1"></i>
                      Descrição Qualitativa do Professor:
                    </div>
                    <p className="mb-0 text-dark" style={{ lineHeight: '1.6' }}>
                      {ac.descricao}
                    </p>
                  </div>

                  {ac.observacao_coordenacao && (
                    <div className="small text-secondary mb-3">
                      <i className="bi bi-shield-check text-primary me-1"></i>
                      <strong>Parecer da Coordenação Escolar:</strong> {ac.observacao_coordenacao}
                    </div>
                  )}

                  {/* Tags de Acompanhamento */}
                  <div className="mb-3">
                    <div className="small fw-semibold text-muted mb-1">
                      Tags de Acompanhamento no Bimestre:
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {(ac.tags || []).map((tg) => (
                        <span
                          key={tg.id}
                          className="edu-tag-chip"
                          style={{
                            backgroundColor: `${tg.cor}18`,
                            color: tg.cor,
                            borderColor: `${tg.cor}45`,
                          }}
                        >
                          <i className="bi bi-tag-fill"></i>
                          {tg.nome}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Registro de Ciência e Encaminhamento de Observação à Escola */}
                  <div className="pt-3 border-top">
                    {minhaCiencia ? (
                      <div className="p-3 rounded-3 bg-success-subtle border border-success-subtle">
                        <div className="d-flex flex-wrap justify-content-between align-items-center">
                          <div className="fw-bold text-success">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            Ciência Confirmada pela Família ({minhaCiencia.responsavel_nome}) em{' '}
                            {minhaCiencia.data_ciencia}
                          </div>
                        </div>
                        {minhaCiencia.observacao_responsavel && (
                          <div className="small text-dark mt-2">
                            <strong>Observação encaminhada à escola:</strong> "
                            {minhaCiencia.observacao_responsavel}"
                          </div>
                        )}
                        {minhaCiencia.resposta_escola && (
                          <div className="p-2 bg-white rounded border small mt-2 text-primary">
                            <i className="bi bi-reply-fill me-1"></i>
                            <strong>
                              Retorno do(a) Professor(a) ({minhaCiencia.respondido_por_nome}):
                            </strong>{' '}
                            "{minhaCiencia.resposta_escola}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="row g-2 align-items-center">
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Opcional: Escreva uma observação ou dúvida para o(a) professor(a) e coordenação..."
                            value={observacoesInput[ac.id] || ''}
                            onChange={(e) =>
                              setObservacoesInput({
                                ...observacoesInput,
                                [ac.id]: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="col-md-4 text-end">
                          <button
                            className="btn btn-success btn-sm w-100 fw-semibold"
                            onClick={() => registrarCienciaResponsavel(ac)}
                          >
                            <i className="bi bi-check2-circle me-1"></i>
                            Registrar Ciência e Enviar Observação
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
