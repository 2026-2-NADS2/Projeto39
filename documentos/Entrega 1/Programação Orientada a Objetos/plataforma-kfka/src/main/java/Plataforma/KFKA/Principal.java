package Plataforma.KFKA;

import Plataforma.KFKA.facade.SistemaAcompanhamentoFacade;
import Plataforma.KFKA.model.Administrador;
import Plataforma.KFKA.model.Acompanhamento;
import Plataforma.KFKA.model.Professor;
import Plataforma.KFKA.model.Responsavel;

public class Principal {
    public static void main(String[] args) {

        SistemaAcompanhamentoFacade sistema = new SistemaAcompanhamentoFacade();

        // Instanciar os atores do sistema (Objetos)
        Professor profMatematica = new Professor(1L, "Carlos Silva", "carlos@fecap.com");
        Administrador adminEscola = new Administrador(2L, "Ana Souza", "ana@fecap.com");
        Responsavel paiAluno = new Responsavel(3L, "Marcos Paulo", "marcos@fecap.com");

        System.out.println("--- INICIANDO FLUXO DA PLATAFORMA KFKA ---");

        // Professor de Matemática regista o acompanhamento do aluno ID 100
        Acompanhamento relatorioMatematica = sistema.registrarAcompanhamento(profMatematica, 100L, "Matemática", 8.5);

        // Tenta aceder antes de estar publicado
        System.out.println("\n[Tentativa de Acesso Não Disponível]");
        sistema.consultarRelatorio(paiAluno, relatorioMatematica);

        // Administrador publica o relatório
        System.out.println("\n[Relatório Publicado]");
        sistema.publicarAcompanhamento(adminEscola, relatorioMatematica);

        // Consulta novamente após a publicação
        System.out.println("\n[Acesso Permitido]");
        sistema.consultarRelatorio(paiAluno, relatorioMatematica);

        System.out.println("\n--- FLUXO CONCLUÍDO ---");
    }
}