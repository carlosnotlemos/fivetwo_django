function getCampanhas() {
  const ss = getDb();
  const sheet = ss.getSheetByName("Campanhas");
  if (!sheet) return [];
  
  if (sheet.getLastRow() < 2) return [];
  
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
}

function salvarCampanha(dados) {
  const ss = getDb();
  const sheet = ss.getSheetByName("Campanhas");
  
  // Verifica duplicidade pelo ID da campanha
  const ids = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), 1).getValues().flat();
  if (ids.includes(dados.nome)) {
    return { sucesso: false, mensagem: "Já existe uma campanha com este ID." };
  }
  
  sheet.appendRow([dados.nome, dados.assunto, dados.conteudo]);
  return { sucesso: true, mensagem: "Campanha salva com sucesso!" };
}

function atualizarCampanha(dados) {
  const ss = getDb();
  const sheet = ss.getSheetByName("Campanhas");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == dados.originalNome) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[dados.nome, dados.assunto, dados.conteudo]]);
      return { sucesso: true, mensagem: "Campanha atualizada com sucesso!" };
    }
  }
  
  return { sucesso: false, mensagem: "Campanha não encontrada para atualização." };
}

function excluirCampanha(nome) {
  const ss = getDb();
  const sheet = ss.getSheetByName("Campanhas");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == nome) {
      sheet.deleteRow(i + 1);
      return { sucesso: true, mensagem: "Campanha excluída com sucesso!" };
    }
  }
  
  return { sucesso: false, mensagem: "Campanha não encontrada para exclusão." };
}
