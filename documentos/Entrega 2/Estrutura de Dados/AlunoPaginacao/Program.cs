using AlunoPaginacao.Data;

Console.OutputEncoding = System.Text.Encoding.UTF8;

Database.Inicializar();

AlunoRepository repositorio = new AlunoRepository();
List<Aluno> alunos = repositorio.ListarAlunos();

int tamanhoPagina = 5;
int paginaAtual = 1;
int totalPaginas = (int)Math.Ceiling(alunos.Count / (double)tamanhoPagina);

while (true)
{
    Console.Clear();
    Console.WriteLine("========================================");
    Console.WriteLine("       KFKA - LISTAGEM DE ALUNOS");
    Console.WriteLine("========================================");
    Console.WriteLine($"Página {paginaAtual} de {totalPaginas}");
    Console.WriteLine();
    Console.WriteLine("ID  Nome                       Turma");
    Console.WriteLine("----------------------------------------");

    int inicio = (paginaAtual - 1) * tamanhoPagina;
    int quantidade = Math.Min(tamanhoPagina, alunos.Count - inicio);

    List<Aluno> alunosDaPagina = alunos.GetRange(inicio, quantidade);

    foreach (Aluno aluno in alunosDaPagina)
    {
        Console.WriteLine($"{aluno.Id,-3} {aluno.Nome,-26} {aluno.Turma}");
    }

    Console.WriteLine();
    Console.WriteLine("1 - Próxima página");
    Console.WriteLine("2 - Página anterior");
    Console.WriteLine("0 - Sair");
    Console.Write("Escolha: ");

    string opcao = Console.ReadLine() ?? "";

    if (opcao == "1" && paginaAtual < totalPaginas)
    {
        paginaAtual++;
    }
    else if (opcao == "2" && paginaAtual > 1)
    {
        paginaAtual--;
    }
    else if (opcao == "0")
    {
        break;
    }
}
