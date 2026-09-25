# KFKA - Estrutura de Dados - Entrega 1

## Listagem de Alunos com Paginação

Aplicação simples em C# Console para simular a paginação de uma lista de alunos.

### O que foi utilizado

- C# / .NET 8
- SQLite
- `List<Aluno>` para armazenar os alunos carregados do banco
- Paginação de 5 alunos por página

### Como funciona

1. O programa cria o banco SQLite na primeira execução.
2. A tabela `Alunos` é criada e recebe 20 alunos fictícios.
3. O programa consulta os alunos no banco.
4. Os registros são colocados em uma `List<Aluno>`.
5. A lista é dividida em páginas de 5 alunos.
6. O usuário pode avançar ou voltar entre as páginas.

### Como executar

Abra a pasta `AlunoPaginacao` no Visual Studio ou em um terminal com o .NET 8 instalado e execute:

```bash
dotnet restore
dotnet run
```

### Estrutura do projeto

- `Program.cs` - menu e paginação.
- `Models/Aluno.cs` - classe do aluno.
- `Data/AlunoRepository.cs` - busca os alunos no SQLite.
- `Data/DatabaseInitializer.cs` - cria e popula o banco.
- `schema.sql` - script SQL da tabela e dos dados.

### Estrutura de Dados aplicada

A principal estrutura utilizada é a `List<Aluno>`. Depois que os dados são lidos do SQLite, eles ficam armazenados na lista para que o programa possa trabalhar com os registros.

Para mostrar somente os alunos da página atual foi utilizado `GetRange()`:

```csharp
int inicio = (paginaAtual - 1) * tamanhoPagina;
List<Aluno> alunosDaPagina = alunos.GetRange(inicio, quantidade);
```

Assim, com 5 registros por página, a primeira página mostra os alunos de 1 a 5, a segunda de 6 a 10 e assim por diante.
