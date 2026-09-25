package Plataforma.KFKA.model;

public abstract class Usuario {
    private Long id;
    private String nome;
    private String email;

    public Usuario(Long id, String nome, String email) {
        this.id = id;
        this.nome = nome;
        this.email = email;
    }

    public abstract String obterPerfil();
    public String getNome() { return nome; }
}