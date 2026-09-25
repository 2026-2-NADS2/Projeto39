package Plataforma.KFKA.model;

public class Administrador extends Usuario {

    public Administrador(Long id, String nome, String email) {
        super(id, nome, email);
    }

    @Override
    public String obterPerfil() {
        return "ADMINISTRADOR";
    }
}