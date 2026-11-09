#!/usr/bin/env node
/**
 * ============================================================================
 * EduLL-Kfka — Inicializador Universal de Desktop (macOS, Windows e Linux)
 * ============================================================================
 * - Verifica e instala dependências automaticamente se necessário
 * - Compila o frontend React caso a pasta dist/ não exista
 * - Inicia o servidor integrado EduLL-Kfka na porta 3001
 * - Abre automaticamente a janela da aplicação no Desktop do usuário
 */

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { execSync, exec, spawn } = require('node:child_process');

const ROOT_DIR = __dirname;
const PORT = process.env.PORT || 3001;
const URL_APP = `http://localhost:${PORT}`;

function verificarSeServidorAtivo() {
  return new Promise((resolve) => {
    const req = http.get(`${URL_APP}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function abrirJanelaDesktop(url) {
  const plataforma = process.platform;

  if (plataforma === 'darwin') {
    // No macOS, tenta abrir como janela dedicada de aplicativo no Chrome se existir, ou no navegador padrão
    const chromeMac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(chromeMac)) {
      spawn(chromeMac, [`--app=${url}`], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    exec(`open "${url}"`);
  } else if (plataforma === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

async function iniciar() {
  console.log('====================================================================');
  console.log(' Iniciando EduLL-Kfka — Acompanhamento Acadêmico (Ensino Fundamental)');
  console.log('====================================================================');

  // 1. Garante dependências instaladas
  if (!fs.existsSync(path.join(ROOT_DIR, 'backend', 'node_modules'))) {
    console.log('[1/3] Instalando dependências do backend...');
    execSync('npm --prefix backend install', { cwd: ROOT_DIR, stdio: 'inherit' });
  }
  if (!fs.existsSync(path.join(ROOT_DIR, 'frontend', 'node_modules'))) {
    console.log('[2/3] Instalando dependências do frontend...');
    execSync('npm --prefix frontend install', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // 2. Garante build de produção do frontend
  if (!fs.existsSync(path.join(ROOT_DIR, 'frontend', 'dist', 'index.html'))) {
    console.log('[3/3] Gerando build otimizado da interface EduLL-Kfka...');
    execSync('npm --prefix frontend run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // 3. Verifica se já está rodando na porta 3001
  const jaAtivo = await verificarSeServidorAtivo();
  if (jaAtivo) {
    console.log(`Servidor EduLL-Kfka já está em execução em ${URL_APP}`);
    abrirJanelaDesktop(URL_APP);
    return;
  }

  // 4. Inicia o servidor e abre a janela
  const app = require('./backend/src/server');
  app.listen(PORT, () => {
    console.log(`EduLL-Kfka ativo em: ${URL_APP}`);
    console.log(`Swagger OpenAPI:     ${URL_APP}/api/docs`);
    abrirJanelaDesktop(URL_APP);
  });
}

iniciar().catch((err) => {
  console.error('Erro ao iniciar EduLL-Kfka:', err);
  process.exit(1);
});
