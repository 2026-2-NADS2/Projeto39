package Plataforma.KFKA.model;

import java.util.ArrayList;
import java.util.List;

public class Responsavel extends Usuario {

    // Lista para guardar os IDs dos alunos vinculados a este responsável
    private List<Long> alunosVinculados;

    public Responsavel(Long id, String nome, String email) {
        super(id, nome, email);
        this.alunosVinculados = new ArrayList<>();
    }

    // vincula alunos na escola
    public void vincularAluno(Long idAluno) {
        if (!this.alunosVinculados.contains(idAluno)) {
            this.alunosVinculados.add(idAluno);
        }
    }

    // Verifica se o Responsavel esta atribuido àquele aluno
    public boolean possuiVinculoComAluno(Long idAluno) {
        return this.alunosVinculados.contains(idAluno);
    }

    @Override
    public String obterPerfil() {
        return "RESPONSAVEL";
    }
}