# Entregas do PI
### **DECLARAÇÃO DE USO DE INTELIGÊNCIA ARTIFICIAL**

### Desenvolvimento Web Full Stack 

| **Aluno(s) Responsável(veis)** |Daniel Mendonça Sulato, Felipe Okada Coleto, Pedro Henrique Costa Barros Santos e Vitor Ordnois Henrique |
| **Ferramenta utilizada** | Gemini- Antigravity |
| **Versão/modelo** | Final |
| **Disciplina / Trabalho** | Projeto Integrador |
| **Finalidade de uso** | Auxilio no desenvolvimento |
| ***Prompts* principais utilizados** | "Desenvolva em Node.js com Express e React as rotas de backend e a camada de integração do frontend para o fluxo de revisão de acompanhamentos acadêmicos bimestrais do sistema EduLL-Kfka. Implemente um middleware de autenticação JWT e autorização por perfil (ADMIN, PROFESSOR e RESPONSAVEL). Crie os endpoints para que o Professor envie um rascunho para revisão (POST /api/professor/acompanhamentos) e para que o Administrador possa alterar o conteúdo com registro automático de auditoria (PUT /api/admin/acompanhamentos/:id/revisar), devolver para ajustes informando o motivo (POST /api/admin/acompanhamentos/:id/devolver) ou publicar o relatório para a família (POST /api/admin/acompanhamentos/:id/publicar), garantindo que o perfil Responsável visualize exclusivamente os registros com status PUBLICADO." |
| **Trechos ou entregas afetadas** | Aplicação final |


### Banco de Dados

| **Aluno(s) Responsável(veis)** |Daniel Mendonça Sulato, Felipe Okada Coleto, Pedro Henrique Costa Barros Santos e Vitor Ordnois Henrique |
| **Ferramenta utilizada** | Gemini- Antigravity |
| **Versão/modelo** | Final |
| **Disciplina / Trabalho** | Projeto Integrador |
| **Finalidade de uso** | Auxilio no desenvolvimento |
| ***Prompts* principais utilizados** | "Elabore o script SQL (DDL) para SQLite referente ao banco de dados do sistema escolar EduLL-Kfka. O esquema deve contemplar as tabelas usuarios, alunos, turmas, areas_conhecimento, disciplinas, tags, periodos_bimestrais e acompanhamentos. Aplique as seguintes regras de integridade: (1) relacionamento N:N entre responsáveis e alunos (responsavel_aluno), permitindo que um responsável tenha vários filhos vinculados e um aluno possua múltiplos responsáveis autorizados; (2) restrição UNIQUE (aluno_id, turma_id, disciplina_id, bimestre, ano_letivo) na tabela acompanhamentos; (3) relacionamento N:N entre acompanhamentos e múltiplas tags (acompanhamento_tags); e (4) uma tabela historico_acompanhamento para rastreabilidade administrativa contendo chave estrangeira para o usuário autor da ação, data/hora, status anterior, status posterior e snapshots JSON dos estados antes e depois da alteração." |
| **Trechos ou entregas afetadas** | Aplicação final |

### Programação Orientada a Objetos (POO)

| **Aluno(s) Responsável(veis)** |Daniel Mendonça Sulato, Felipe Okada Coleto, Pedro Henrique Costa Barros Santos e Vitor Ordnois Henrique |
| **Ferramenta utilizada** | Gemini- Antigravity |
| **Versão/modelo** | Final |
| **Disciplina / Trabalho** | Projeto Integrador |
| **Finalidade de uso** | Auxilio do desenvolvimento |
| ***Prompts* principais utilizados** | "Modele em JavaScript/Node.js as classes de domínio do sistema EduLL-Kfka aplicando os pilares de Programação Orientada a Objetos. Crie uma classe abstrata Usuario com atributos privados encapsulados (#id, #nome, #email, #perfil, #ativo) e especialize-a por herança nas subclasses Administrador, Professor e Responsavel. Implemente polimorfismo nos métodos obterPermissoes() e podeVisualizarAcompanhamento(acompanhamento, contexto), garantindo que o Responsavel só tenha acesso a registros publicados de alunos vinculados ao seu cadastro. Além disso, implemente a classe AcompanhamentoBimestral contendo a máquina de estados (RASCUNHO → ENVIADO → DEVOLVIDO → PUBLICADO), validações de regra de negócio da média conforme a escala do PeriodoBimestral e um método gerarSnapshotEstado() para auditoria." |
| **Trechos ou entregas afetadas** | Aplicação final |

### Design de Interface Digital

| **Aluno(s) Responsável(veis)** |Daniel Mendonça Sulato, Felipe Okada Coleto, Pedro Henrique Costa Barros Santos e Vitor Ordnois Henrique |
| **Ferramenta utilizada** | Gemini- Antigravity |
| **Versão/modelo** | Final |
| **Disciplina / Trabalho** | Projeto Integrador |
| **Finalidade de uso** | Auxilio no desenvolvimento |
| ***Prompts* principais utilizados** | "Projete uma interface web responsiva utilizando React e Bootstrap 5 para o Portal do Pai/Responsável e o Painel do Professor do sistema escolar EduLL-Kfka. Aplique princípios de Design de Interface Digital (hierarquia visual, contraste acessível, feedback imediato de status e prevenção de erros): utilize badges semânticos com cores distintas para os estados do relatório (Rascunho, Enviado, Devolvido e Publicado), chips interativos selecionáveis para a classificação por múltiplas tags pedagógicas e cards comparativos para alternância rápida entre alunos vinculados ao responsável. Na visão da família, destaque a média bimestral, a frequência e o parecer qualitativo do professor, incluindo botões de ação clara para confirmar ciência eletrônica de leitura e gerar o boletim consolidado em PDF." |
| **Trechos ou entregas afetadas** | Aplicação final |


***Declaro que o uso acima descrito está em conformidade com o GUIA PARA O USO RESPONSÁVEL DE
INTELIGÊNCIA ARTIFICIAL NA FECAP e que o conteúdo final é de minha plena responsabilidade
autoral.***
