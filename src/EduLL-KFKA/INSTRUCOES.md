# EduLL-Kfka — Sistema Integrado de Acompanhamento Acadêmico Bimestral (Ensino Fundamental)

**Projeto Integrador — Análise e Desenvolvimento de Sistemas (PI ADS.2)**

Aplicação web responsiva, segura e integrada para registrar, revisar, publicar e acompanhar informações acadêmicas bimestrais de alunos do Ensino Fundamental, fortalecendo a comunicação entre **Administração Escolar**, **Professores** e **Pais/Responsáveis**.

---

## 1. Como Executar Fácil em Qualquer Desktop (macOS, Windows, Linux ou Docker)

Foram criados inicializadores nativos de **duplo clique** para cada sistema operacional que instalam dependências automaticamente (se necessário), compilam o frontend, sobem o servidor integrado e abrem a janela do **EduLL-Kfka** automaticamente:

### 🍎 No macOS (Duplo Clique no Finder)
- **Opção 1 (Aplicativo Nativo macOS)**: Dê duplo clique no aplicativo **`EduLL-Kfka.app`** (você também pode arrastá-lo para o Dock ou para a Área de Trabalho).
- **Opção 2 (Script de Comando macOS)**: Dê duplo clique no arquivo [`Iniciar_EduLL-Kfka_Mac.command`](./Iniciar_EduLL-Kfka_Mac.command).

### 🪟 No Windows (Duplo Clique no Explorer)
- Dê duplo clique no arquivo [`Iniciar_EduLL-Kfka_Windows.bat`](./Iniciar_EduLL-Kfka_Windows.bat).

### 🐧 No Linux
- Execute [`./Iniciar_EduLL-Kfka_Linux.sh`](./Iniciar_EduLL-Kfka_Linux.sh).

### 💻 Inicializador Universal via Terminal (Qualquer SO)
```bash
npm run desktop
# ou diretamente:
node iniciar-desktop.js
```

### 🐳 Via Docker Desktop (Windows / macOS / Linux — Sem instalar Node localmente)
```bash
docker compose up --build
```

Acesse também diretamente no navegador:
- **Portal Web (3 Módulos)**: http://localhost:3001
- **Documentação OpenAPI / Swagger**: http://localhost:3001/api/docs

---

## 2. Arquitetura e Unidades Curriculares Integradas

- **Programação Orientada a Objetos (POO)**:
  - Implementada em [`backend/src/domain/Entities.js`](./backend/src/domain/Entities.js) com Abstração, Encapsulamento (campos privados `#`), Herança e Polimorfismo (`Usuario` $\rightarrow$ `Administrador`, `Professor`, `Responsavel`), Factory Pattern (`FabricaUsuario`), além das entidades ricas `PeriodoBimestral` e `AcompanhamentoBimestral` (máquina de estados `RASCUNHO` $\rightarrow$ `ENVIADO` $\rightarrow$ `DEVOLVIDO` / `PUBLICADO`).
- **Estrutura de Dados**:
  - Implementada em [`backend/src/structures/DataStructures.js`](./backend/src/structures/DataStructures.js):
    1. `FilaRevisao` (**Fila Encadeada FIFO**): organiza os acompanhamentos enviados pelos professores por ordem de chegada para revisão administrativa.
    2. `PilhaHistorico` (**Pilha Encadeada LIFO**): estrutura a trilha de auditoria e rastreabilidade cronológica reversa (estado anterior e estado posterior).
    3. `GrafoVinculosEscolares` (**Tabela Hash + Conjunto de Adjacência**): valida em tempo constante $O(1)$ os vínculos `Professor × Disciplina × Turma × Aluno` e `Responsável × Aluno`.
    4. `NoArvoreCurricular` (**Árvore Hierárquica N-ária**): organiza a Matriz Curricular (`Escola` $\rightarrow$ `Áreas de Conhecimento` $\rightarrow$ `Disciplinas`).
- **Banco de Dados Relacional (SQLite)**:
  - Modelagem DDL normalizada em [`backend/src/database/schema.sql`](./backend/src/database/schema.sql) com integridade referencial, restrições de unicidade (`UNIQUE (aluno_id, turma_id, disciplina_id, bimestre, ano_letivo)`), vínculos $N:N$ (`responsavel_aluno`, `acompanhamento_tags`) e auditoria (`historico_acompanhamento`).

---

## 3. Credenciais de Demonstração (Senha padrão: `123456`)

Na tela inicial de login (e na barra superior do sistema), você pode alternar entre os perfis com **1 clique**:

| Módulo / Perfil | Nome | E-mail | Papel no Fluxo |
| :--- | :--- | :--- | :--- |
| **Administrador** | Dra. Helena Vasconcelos | `admin@escola.edu.br` | Cadastros, períodos dos 4 bimestres, revisão rastreável, devolução, publicação e Excel |
| **Professor** | Prof. Carlos Eduardo Mendes | `carlos.mendes@escola.edu.br` | Matemática e Ciências (6ºA, 5ºA, 7ºB) — possui registros Publicados, Enviados, Devolvidos e Rascunhos |
| **Professor** | Profa. Mariana Alves Costa | `mariana.costa@escola.edu.br` | Língua Portuguesa, História e Geografia |
| **Pai/Responsável** | Roberto Almeida Silva | `roberto.silva@familia.com` | Pai vinculado a 2 alunos (Lucas Silva no 6ºA e Beatriz Silva no 5ºA) |
| **Mãe/Responsável** | Patrícia Almeida Silva | `patricia.silva@familia.com` | Mãe vinculada a Lucas Silva e Beatriz Silva |
| **Mãe/Responsável** | Fernanda Oliveira Santos | `fernanda.oliveira@familia.com` | Mãe vinculada a Gabriel Oliveira (6ºA) e Sofia Oliveira (7ºB) |
