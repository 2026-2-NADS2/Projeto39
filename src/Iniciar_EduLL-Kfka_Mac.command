#!/bin/zsh
# ==============================================================================
# EduLL-Kfka — Inicializador de 1 Clique para macOS (.command)
# Basta dar duplo clique neste arquivo no Finder para abrir a aplicação!
# ==============================================================================

export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js não encontrado" message "Instale o Node.js (v22+) em https://nodejs.org para executar o EduLL-Kfka." as critical'
  exit 1
fi

node "$DIR/iniciar-desktop.js"
