package Plataforma.KFKA.model;

public class Professor extends Usuario {

    public Professor(Long id, String nome, String email) {
        super(id, nome, email);
    }

    @Override
    public String obterPerfil() {
        return "PROFESSOR";
    }
}