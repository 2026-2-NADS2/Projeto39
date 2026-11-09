import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Gera o PDF de um Relatório Bimestral Individual (por disciplina)
 */
export function gerarRelatorioIndividualPDF(ac, responsavelNome = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cabeçalho Institucional
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA DE ENSINO FUNDAMENTAL MONTEIRO LOBATO', 14, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Relatório de Acompanhamento Acadêmico Bimestral - ${ac.bimestre}º Bimestre / ${ac.ano_letivo}`,
    14,
    22
  );
  doc.setFontSize(9);
  doc.text(`Documento emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 29);

  // Quadro de Identificação do Aluno
  doc.setTextColor(15, 23, 42);
  autoTable(doc, {
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    head: [['Dados do Aluno e Componente Curricular', 'Informações Acadêmicas']],
    body: [
      [`Aluno(a): ${ac.aluno_nome}`, `Matrícula: ${ac.aluno_matricula}`],
      [`Turma: ${ac.turma_nome}`, `Série/Ano: ${ac.aluno_serie || ac.turma_serie}`],
      [`Área de Conhecimento: ${ac.area_nome}`, `Disciplina: ${ac.disciplina_nome}`],
      [`Professor(a): ${ac.professor_nome}`, `Bimestre: ${ac.bimestre}º Bimestre (${ac.ano_letivo})`],
      [
        `Média Bimestral: ${Number(ac.media).toFixed(1)} / 10,0`,
        `Frequência no Bimestre: ${ac.frequencia_percentual}%`,
      ],
    ],
  });

  let yPos = doc.lastAutoTable.finalY + 10;

  // Tags de Acompanhamento
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Classificação Pedagógica (Tags de Acompanhamento):', 14, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const tagsTexto =
    ac.tags && ac.tags.length > 0
      ? ac.tags.map((t) => `• ${t.nome} (${t.categoria})`).join('   ')
      : 'Nenhuma tag informada.';
  const linhasTags = doc.splitTextToSize(tagsTexto, 182);
  doc.text(linhasTags, 14, yPos);
  yPos += linhasTags.length * 6 + 6;

  // Parecer Descritivo Qualitativo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Parecer Descritivo Qualitativo do(a) Professor(a):', 14, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const linhasDescricao = doc.splitTextToSize(ac.descricao || '', 182);
  doc.rect(14, yPos - 4, 182, linhasDescricao.length * 6 + 8);
  doc.text(linhasDescricao, 17, yPos + 2);
  yPos += linhasDescricao.length * 6 + 14;

  // Observação da Coordenação/Administração
  if (ac.observacao_coordenacao) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Validação da Coordenação Pedagógica / Administração Escolar:', 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const linhasCoord = doc.splitTextToSize(ac.observacao_coordenacao, 182);
    doc.text(linhasCoord, 14, yPos);
    yPos += linhasCoord.length * 6 + 8;
  }

  // Registro de Ciência da Família
  const interacao = ac.interacoes && ac.interacoes.length > 0 ? ac.interacoes[0] : null;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de Ciência da Família / Responsável Legal:', 14, yPos);
  yPos += 6;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  if (interacao) {
    doc.text(
      `Ciência confirmada digitalmente por ${interacao.responsavel_nome} em ${interacao.data_ciencia}.`,
      14,
      yPos
    );
    yPos += 6;
    if (interacao.observacao_responsavel) {
      const obsFam = doc.splitTextToSize(
        `Observação da Família: "${interacao.observacao_responsavel}"`,
        182
      );
      doc.text(obsFam, 14, yPos);
      yPos += obsFam.length * 5 + 4;
    }
  } else {
    doc.text(
      `Consultado por: ${responsavelNome || 'Responsável Legal'} (Ciência eletrônica pendente de confirmação).`,
      14,
      yPos
    );
    yPos += 8;
  }

  // Rodapé de autenticação
  doc.setDrawColor(148, 163, 184);
  doc.line(14, 272, 196, 272);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `EduLL-Kfka - Relatório Oficial Publicado em ${ac.data_publicacao || ac.atualizado_em} | Código Verificador #ACOMP-${ac.id}-${ac.ano_letivo}`,
    14,
    278
  );

  const nomeArquivo = `Relatorio_${ac.aluno_nome.replace(/\s+/g, '_')}_${ac.disciplina_nome.replace(/\s+/g, '_')}_${ac.bimestre}Bim_${ac.ano_letivo}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Gera o Boletim Consolidado em PDF com todos os acompanhamentos publicados do aluno
 */
export function gerarBoletimConsolidadoPDF(
  aluno,
  relatorios,
  responsavelNome = '',
  filtroBimestre = ''
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA DE ENSINO FUNDAMENTAL MONTEIRO LOBATO', 14, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Boletim e Parecer Acadêmico Consolidado ${filtroBimestre ? `- ${filtroBimestre}º Bimestre` : '- Ano Letivo 2026'}`,
    14,
    22
  );
  doc.setFontSize(9);
  doc.text(
    `Aluno(a): ${aluno.nome} (Matrícula: ${aluno.matricula}) | Turma: ${aluno.turma_nome || aluno.serie_atual}`,
    14,
    29
  );

  const linhasTabela = relatorios.map((r) => [
    `${r.bimestre}º Bim`,
    r.disciplina_nome,
    r.professor_nome,
    Number(r.media).toFixed(1),
    `${r.frequencia_percentual}%`,
    (r.tags || []).map((t) => t.nome).join(', '),
    r.descricao,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Bim.', 'Disciplina', 'Professor(a)', 'Média', 'Freq.', 'Tags', 'Parecer Qualitativo']],
    body: linhasTabela,
    styles: { fontSize: 8.5, cellPadding: 2.5, valign: 'top' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 28 },
      2: { cellWidth: 30 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 32 },
      6: { cellWidth: 49 },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Emitido para o(a) responsável: ${responsavelNome} em ${new Date().toLocaleString('pt-BR')}.`,
    14,
    Math.min(finalY, 280)
  );

  const nomeArq = `Boletim_Consolidado_${aluno.nome.replace(/\s+/g, '_')}_2026.pdf`;
  doc.save(nomeArq);
}
