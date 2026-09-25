using Microsoft.Data.Sqlite;
using AlunoPaginacao;

namespace AlunoPaginacao.Data;

public static class Database
{
    private const string conexao = "Data Source=kfka.db";

    public static void Inicializar()
    {
        using SqliteConnection connection = new SqliteConnection(conexao);
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS Alunos (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Nome TEXT NOT NULL,
                Turma TEXT NOT NULL
            )";
        command.ExecuteNonQuery();

        command.CommandText = "SELECT COUNT(*) FROM Alunos";
        long quantidade = (long)command.ExecuteScalar()!;

        if (quantidade > 0)
        {
            return;
        }

        string[] nomes =
        {
            "Ana Beatriz Souza", "Bruno Henrique Lima", "Carolina Mendes",
            "Daniel Oliveira", "Eduarda Martins", "Felipe Santos",
            "Gabriela Ferreira", "Henrique Costa", "Isabela Rodrigues",
            "João Pedro Alves", "Karina Barbosa", "Lucas Almeida",
            "Mariana Castro", "Nicolas Ribeiro", "Olivia Moreira",
            "Paulo Viana", "Rafaela Nunes", "Samuel Carvalho",
            "Thais Gomes", "Vinicius Rocha"
        };

        for (int i = 0; i < nomes.Length; i++)
        {
            string turma = i < 5 ? "8º A" :
                           i < 10 ? "8º B" :
                           i < 15 ? "9º A" : "9º B";

            command.CommandText = "INSERT INTO Alunos (Nome, Turma) VALUES ($nome, $turma)";
            command.Parameters.Clear();
            command.Parameters.AddWithValue("$nome", nomes[i]);
            command.Parameters.AddWithValue("$turma", turma);
            command.ExecuteNonQuery();
        }
    }
}
