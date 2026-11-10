import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@escola.edu.br');
  const [senha, setSenha] = useState('123456');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [perfisDemo, setPerfisDemo] = useState([]);

  useEffect(() => {
    apiRequest('/auth/perfis-demo')
      .then((res) => setPerfisDemo(res.usuarios || []))
      .catch(() => {});
  }, []);

  async function realizarLogin(emailLogin, senhaLogin) {
    setErro('');
    setCarregando(true);
    try {
      const dados = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailLogin, senha: senhaLogin }),
      });
      onLoginSuccess(dados.token, dados.usuario);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    realizarLogin(email, senha);
  }

  const badgePerfil = (perfil) => {
    if (perfil === 'ADMIN') return { cor: 'primary', icone: 'bi-shield-lock-fill', label: 'Administrador Escolar' };
    if (perfil === 'PROFESSOR') return { cor: 'success', icone: 'bi-mortarboard-fill', label: 'Professor(a)' };
    return { cor: 'info', icone: 'bi-people-fill', label: 'Pai / Responsável' };
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center py-5" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)' }}>
      <div className="container">
        <div className="row g-4 align-items-stretch">
          {/* Coluna Esquerda: Apresentação e Login */}
          <div className="col-lg-5">
            <div className="edu-card p-4 p-md-5 h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="edu-kpi-icon bg-primary text-white">
                    <i className="bi bi-journal-bookmark-fill"></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-0 text-dark">EduLL-Kfka</h4>
                    <small className="text-muted">Ensino Fundamental • Acompanhamento Bimestral</small>
                  </div>
                </div>

                <h5 className="fw-bold mb-2">Acesso ao Portal Acadêmico</h5>
                <p className="text-secondary small mb-4">
                  Plataforma integrada de comunicação e gestão pedagógica entre Administração Escolar, Corpo Docente e Famílias.
                </p>

                {erro && (
                  <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>{erro}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">E-mail Institucional ou Familiar</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@escola.edu.br"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold">Senha de Acesso</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-key"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 fw-bold"
                    disabled={carregando}
                  >
                    {carregando ? (
                      <span><span className="spinner-border spinner-border-sm me-2"></span>Autenticando...</span>
                    ) : (
                      <span><i className="bi bi-box-arrow-in-right me-2"></i>Entrar no Sistema</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center small text-muted">
                <span><i className="bi bi-check2-circle text-success me-1"></i>RBAC + JWT Ativo</span>
                <a href="/api/docs" target="_blank" rel="noreferrer" className="text-decoration-none fw-semibold">
                  <i className="bi bi-file-earmark-code me-1"></i>Swagger OpenAPI
                </a>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Acesso Rápido de Demonstração por Módulo */}
          <div className="col-lg-7">
            <div className="edu-card p-4 p-md-5 h-100 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="badge bg-primary-subtle text-primary mb-1">AMBIENTE DE AVALIAÇÃO — PI ADS.2</span>
                  <h5 className="fw-bold mb-0">Acesso Rápido por Módulo (1 Clique)</h5>
                </div>
                <span className="badge bg-light text-secondary border">Senha padrão: 123456</span>
              </div>
              <p className="text-secondary small mb-3">
                Clique em qualquer perfil abaixo para entrar diretamente no módulo correspondente e testar o fluxo completo (Rascunho → Envio → Revisão/Rastreabilidade → Devolução ou Publicação → PDF e Ciência dos Pais):
              </p>

              <div className="row g-3">
                {perfisDemo.map((u) => {
                  const info = badgePerfil(u.perfil);
                  return (
                    <div className="col-md-6" key={u.id}>
                      <div
                        className="p-3 rounded-3 border edu-card-hover h-100 d-flex flex-column justify-content-between"
                        style={{ cursor: 'pointer', backgroundColor: '#f8fafc' }}
                        onClick={() => {
                          setEmail(u.email);
                          setSenha('123456');
                          realizarLogin(u.email, '123456');
                        }}
                      >
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={`badge bg-${info.cor}`}>
                              <i className={`bi ${info.icone} me-1`}></i>
                              {info.label}
                            </span>
                            <i className="bi bi-arrow-right-circle text-primary"></i>
                          </div>
                          <div className="fw-bold text-dark">{u.nome}</div>
                          <div className="small text-muted text-truncate">{u.email}</div>
                        </div>
                        <div className="mt-2 pt-2 border-top small text-secondary">
                          {u.perfil === 'ADMIN' && 'Gestão escolar, revisão rastreável, publicação e Excel'}
                          {u.perfil === 'PROFESSOR' && (u.formacao_especialidade || 'Registro bimestral, médias e tags')}
                          {u.perfil === 'RESPONSAVEL' && `${u.parentesco_padrao || 'Responsável'} • Consulta publicados, PDF e ciência`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
