package Plataforma.KFKA.model;

import java.util.ArrayList;
import java.util.List;

public class Acompanhamento {
    private Long idAluno;
    private String disciplina;
    private double media;
    private String status;
    private List<String> tags; // tags por acompanhamento

    public Acompanhamento(Long idAluno, String disciplina, double media) {
        this.idAluno = idAluno;
        this.disciplina = disciplina;
        setMedia(media); // setter para aplicar a regra de validação imediatamente
        this.status = "Rascunho";
        this.tags = new ArrayList<>();
    }

    // metodo que adiciona tag
    public void adicionarTag(String tag) {
        this.tags.add(tag);
    }

    public List<String> getTags() { return tags; }

    public double getMedia() { return media; }

    // protege a media o atributo de dados inválidos
    public void setMedia(double media) {
        if (media < 0.0 || media > 10.0) {
            throw new IllegalArgumentException("Erro de Validação: A média deve estar entre 0.0 e 10.0.");
        }
        this.media = media;
    }

    // Getters e Setters
    public Long getIdAluno() { return idAluno; }
    public void setIdAluno(Long idAluno) { this.idAluno = idAluno; }
    public String getDisciplina() { return disciplina; }
    public void setDisciplina(String disciplina) { this.disciplina = disciplina; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}