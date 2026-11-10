using System;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;

class Launcher
{
    static int Main()
    {
        Console.Title = "EduLL-Kfka - Acompanhamento Academico Bimestral";
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        Directory.SetCurrentDirectory(dir);

        Console.WriteLine("====================================================================");
        Console.WriteLine(" EduLL-Kfka - Inicializador Windows");
        Console.WriteLine("====================================================================");

        if (!File.Exists(Path.Combine(dir, "iniciar-desktop.js")))
        {
            Console.WriteLine("[ERRO] iniciar-desktop.js nao encontrado. Mantenha o .exe na pasta do projeto.");
            return Pause(1);
        }

        string versao = Run("node", "--version", true);
        if (versao == null)
        {
            Console.WriteLine("[ERRO] Node.js nao encontrado. Instale o Node.js v22 ou superior em https://nodejs.org e execute novamente.");
            Process.Start(new ProcessStartInfo("https://nodejs.org") { UseShellExecute = true });
            return Pause(1);
        }
        Match m = Regex.Match(versao, @"v(\d+)");
        if (m.Success && int.Parse(m.Groups[1].Value) < 22)
        {
            Console.WriteLine("[ERRO] Node.js " + versao.Trim() + " e muito antigo (modulo node:sqlite exige v22+). Atualize em https://nodejs.org");
            return Pause(1);
        }

        Console.WriteLine("Node.js " + versao.Trim() + " detectado. Iniciando (a 1a execucao instala dependencias e compila a interface)...");
        var psi = new ProcessStartInfo("node", "\"" + Path.Combine(dir, "iniciar-desktop.js") + "\"")
        {
            UseShellExecute = false,
            WorkingDirectory = dir
        };
        psi.EnvironmentVariables["NODE_NO_WARNINGS"] = "1";
        using (Process p = Process.Start(psi))
        {
            p.WaitForExit();
            if (p.ExitCode != 0) return Pause(p.ExitCode);
            return p.ExitCode;
        }
    }

    static string Run(string file, string args, bool capture)
    {
        try
        {
            var psi = new ProcessStartInfo(file, args)
            {
                UseShellExecute = false,
                RedirectStandardOutput = capture,
                CreateNoWindow = true
            };
            using (Process p = Process.Start(psi))
            {
                string o = p.StandardOutput.ReadToEnd();
                p.WaitForExit();
                return p.ExitCode == 0 ? o : null;
            }
        }
        catch { return null; }
    }

    static int Pause(int code)
    {
        Console.WriteLine("Pressione qualquer tecla para sair...");
        Console.ReadKey(true);
        return code;
    }
}
