const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('edubimestre_token');
}

export function setAuthSession(token, usuario) {
  localStorage.setItem('edubimestre_token', token);
  localStorage.setItem('edubimestre_usuario', JSON.stringify(usuario));
}

export function clearAuthSession() {
  localStorage.removeItem('edubimestre_token');
  localStorage.removeItem('edubimestre_usuario');
}

export function getStoredUsuario() {
  try {
    const raw = localStorage.getItem('edubimestre_usuario');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let erroMsg = 'Erro ao processar requisição.';
    try {
      const data = await response.json();
      erroMsg = data.erro || erroMsg;
    } catch {
      // ignora erro de parse
    }
    throw new Error(erroMsg);
  }

  return response.json();
}

export async function baixarRelatorioExcel({ ano_letivo = 2026, bimestre = '', status = '' } = {}) {
  const token = getToken();
  const params = new URLSearchParams();
  if (ano_letivo) params.set('ano_letivo', ano_letivo);
  if (bimestre) params.set('bimestre', bimestre);
  if (status) params.set('status', status);

  const response = await fetch(`${API_BASE}/admin/relatorios/exportar-excel?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Falha ao exportar relatório para Excel.');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_Escolar_EduLL-Kfka_${ano_letivo}${bimestre ? `_Bim${bimestre}` : ''}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
