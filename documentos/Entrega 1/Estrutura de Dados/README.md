# KFKA - Estrutura de Dados - Entrega 1

## Simulação de Listagem de Alunos com Paginação

Aplicação console desenvolvida em C# para a Entrega 1 de Estrutura de Dados do Projeto Interdisciplinar KFKA.

### Requisito atendido
A aplicação simula a listagem paginada de alunos. Os dados são armazenados em um banco relacional SQLite, carregados para uma `List<Aluno>` e exibidos em páginas de 5 registros.

O enunciado solicita uma aplicação simples que simule a paginação de alunos utilizando listas/coleções populadas a partir de banco de dados relacional (ex.: SQLite).

### Estrutura do projeto
- `Program.cs` - menu e lógica da paginação.
- `Models/Aluno.cs` - classe que representa o aluno.
- `Data/DatabaseInitializer.cs` - criação e carga inicial do SQLite.
- `Data/AlunoRepository.cs` - consulta dos alunos no banco e conversão para `List<Aluno>`.
- `schema.sql` - script SQL da tabela e dados fictícios.

### Tecnologias
- C# / .NET 8
- SQLite
- Microsoft.Data.Sqlite
- Aplicação Console

### Como executar
1. Instale o .NET 8 SDK.
2. Abra a pasta `AlunoPaginacao` no Visual Studio ou em um terminal.
3. Execute:

```bash
dotnet restore
dotnet run
```

Na primeira execução, o programa cria o arquivo `kfka.db`, cria a tabela `Alunos` e insere 20 alunos fictícios.

### Paginação
- 5 alunos por página.
- `1` = próxima página.
- `2` = página anterior.
- `0` = sair.

### Estrutura de Dados aplicada
O banco é utilizado como fonte persistente dos registros. Após a consulta SQL, os objetos `Aluno` são armazenados em uma `List<Aluno>`.

Para exibir somente os alunos da página atual, foi utilizado `GetRange()`:

```csharp
int inicio = (paginaAtual - 1) * tamanhoPagina;
List<Aluno> alunosDaPagina = alunos.GetRange(inicio, quantidade);
```

Assim, com 5 registros por página, a primeira página mostra os alunos de 1 a 5, a segunda de 6 a 10 e assim por diante.
