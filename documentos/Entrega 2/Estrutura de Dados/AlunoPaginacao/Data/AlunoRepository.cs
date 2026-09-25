using Microsoft.Data.Sqlite;
using AlunoPaginacao;

namespace AlunoPaginacao.Data;

public class AlunoRepository
{
    private const string conexao = "Data Source=kfka.db";

    public List<Aluno> ListarAlunos()
    {
        List<Aluno> alunos = new List<Aluno>();

        using SqliteConnection connection = new SqliteConnection(conexao);
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "SELECT Id, Nome, Turma FROM Alunos ORDER BY Id";

        using SqliteDataReader reader = command.ExecuteReader();

        while (reader.Read())
        {
            Aluno aluno = new Aluno();
            aluno.Id = reader.GetInt32(0);
            aluno.Nome = reader.GetString(1);
            aluno.Turma = reader.GetString(2);

            alunos.Add(aluno);
        }

        return alunos;
    }
}
