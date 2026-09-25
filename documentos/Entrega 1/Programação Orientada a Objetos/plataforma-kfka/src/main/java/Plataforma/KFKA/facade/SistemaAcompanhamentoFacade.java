package Plataforma.KFKA.facade;

import Plataforma.KFKA.model.Acompanhamento;
import Plataforma.KFKA.model.Usuario;
import Plataforma.KFKA.model.Responsavel;
import Plataforma.KFKA.model.Professor;

public class SistemaAcompanhamentoFacade {

    // O Professor registra o acompanhamento por aluno e disciplina
    public Acompanhamento registrarAcompanhamento(Usuario usuario, Long idAluno, String disciplina, double media) {
        // verifica se o utilizador genérico é, de facto, um Professor
        if (!usuario.obterPerfil().equals("PROFESSOR")) {
            throw new SecurityException("Apenas professores podem registar acompanhamentos.");
        }

        System.out.println("Acompanhamento do aluno ID " + idAluno + " registado como rascunho pelo professor: " + usuario.getNome());
        return new Acompanhamento(idAluno, disciplina, media);
    }

    // o Administrador revê, altera ou publica a anotação
    public void publicarAcompanhamento(Usuario usuario, Acompanhamento acompanhamento) {
        if (!usuario.obterPerfil().equals("ADMINISTRADOR")) {
            throw new SecurityException("Apenas administradores podem publicar relatórios.");
        }

        acompanhamento.setStatus("Publicado");
        System.out.println("O acompanhamento de " + acompanhamento.getDisciplina() + " referente ao aluno ID " + acompanhamento.getIdAluno() + " foi publicado aos responsáveis.");
    }

    // o Responsável visualiza somente os alunos aos quais está vinculado
    public void consultarRelatorio(Usuario usuario, Acompanhamento acompanhamento) {
        if (!usuario.obterPerfil().equals("RESPONSAVEL")) {
            throw new SecurityException("Acesso restrito a pais e responsáveis.");
        }

        // Transforma o 'Usuario' genérico em 'Responsavel para aceder aos métodos específicos dele
        Responsavel paiOuMae = (Responsavel) usuario;

        // Verifica a regra de negócio do vínculo
        if (!paiOuMae.possuiVinculoComAluno(acompanhamento.getIdAluno())) {
            System.out.println("ACESSO NEGADO: Você não possui vínculo com o aluno ID " + acompanhamento.getIdAluno());
            return; // Interrompe a execução aqui
        }

        if (!acompanhamento.getStatus().equals("Publicado")) {
            System.out.println("Relatório do aluno ID " + acompanhamento.getIdAluno() + " ainda não foi publicado.");
        } else {
            System.out.println("Exibindo relatório completo de " + acompanhamento.getDisciplina() + " do aluno ID " + acompanhamento.getIdAluno());
            System.out.println("Nota: " + acompanhamento.getMedia());
            System.out.println("Tags: " + acompanhamento.getTags());
        }
    }
}