import React, { useState, useEffect } from 'react';
import {
  getStoredUsuario,
  setAuthSession,
  clearAuthSession,
  apiRequest,
} from './services/api';
import LoginView from './components/LoginView';
import AdminModule from './components/AdminModule';
import ProfessorModule from './components/ProfessorModule';
import ResponsavelModule from './components/ResponsavelModule';

export default function App() {
  const [usuario, setUsuario] = useState(() => getStoredUsuario());
  const [perfisDemo, setPerfisDemo] = useState([]);

  useEffect(() => {
    apiRequest('/auth/perfis-demo')
      .then((res) => setPerfisDemo(res.usuarios || []))
      .catch(() => {});
  }, []);

  function handleLoginSuccess(token, userObj) {
    setAuthSession(token, userObj);
    setUsuario(userObj);
  }

  function handleLogout() {
    clearAuthSession();
    setUsuario(null);
  }

  async function trocarPerfilRapido(emailAlvo) {
    try {
      const dados = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailAlvo, senha: '123456' }),
      });
      handleLoginSuccess(dados.token, dados.usuario);
    } catch {
      handleLogout();
    }
  }

  if (!usuario) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const labelModulo =
    usuario.perfil === 'ADMIN'
      ? 'Módulo Administrador Escolar'
      : usuario.perfil === 'PROFESSOR'
      ? 'Módulo do Professor'
      : 'Módulo Pai / Responsável';

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Barra Superior Institucional */}
      <nav className="navbar navbar-expand-lg navbar-dark edu-navbar py-2 px-3">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-white text-primary fw-bold"
              style={{ width: '38px', height: '38px' }}
            >
              <i className="bi bi-journal-bookmark-fill fs-5"></i>
            </div>
            <div>
              <div className="fw-bold text-white lh-1">
                EduLL-Kfka <span className="badge bg-warning text-dark ms-1">EF</span>
              </div>
              <small className="text-white-50" style={{ fontSize: '0.76rem' }}>
                {labelModulo}
              </small>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-lg-0">
            {/* Seletor rápido de perfil para avaliação do PI ADS.2 */}
            {perfisDemo.length > 0 && (
              <div className="d-flex align-items-center gap-1 bg-white bg-opacity-10 rounded-3 px-2 py-1">
                <small className="text-white-50 me-1 d-none d-md-inline">
                  <i className="bi bi-arrow-left-right me-1"></i>Alternar Visão:
                </small>
                <select
                  className="form-select form-select-sm bg-dark text-white border-secondary"
                  style={{ width: 'auto', fontSize: '0.78rem' }}
                  value={usuario.email}
                  onChange={(e) => trocarPerfilRapido(e.target.value)}
                >
                  {perfisDemo.map((p) => (
                    <option key={p.id} value={p.email}>
                      [{p.perfil}] {p.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-light btn-sm"
              title="Abrir Documentação OpenAPI / Swagger"
            >
              <i className="bi bi-code-slash me-1"></i>
              <span className="d-none d-sm-inline">API Docs</span>
            </a>

            <div className="text-end text-white ms-2 d-none d-md-block">
              <div className="small fw-bold lh-1">{usuario.nome}</div>
              <small className="text-white-50" style={{ fontSize: '0.72rem' }}>
                {usuario.email}
              </small>
            </div>

            <button
              className="btn btn-light btn-sm fw-semibold text-danger ms-1"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* Renderização Polimórfica do Módulo por Perfil */}
      <main className="flex-grow-1">
        {usuario.perfil === 'ADMIN' && <AdminModule />}
        {usuario.perfil === 'PROFESSOR' && <ProfessorModule />}
        {usuario.perfil === 'RESPONSAVEL' && <ResponsavelModule />}
      </main>

      <footer className="bg-white border-top py-3 mt-4">
        <div className="container-fluid px-md-4 d-flex flex-wrap justify-content-between align-items-center small text-muted">
          <span>
            <strong>EduLL-Kfka</strong> • Sistema de Acompanhamento Acadêmico Bimestral do Ensino Fundamental (PI ADS.2)
          </span>
          <span>
            POO + Estruturas de Dados (Fila, Pilha, Grafo, Árvore) + React + Node.js/Express + SQLite
          </span>
        </div>
      </footer>
    </div>
  );
}
