function getEnvios() {
  const ss = getDb();
  const sheet = ss.getSheetByName("Envios");
  if (!sheet) return [];
  
  if (sheet.getLastRow() < 2) return [];
  
  // Colunas: Data, Email, Assunto, Status
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getDisplayValues();
}

function excluirLogEnvio(index) {
  const ss = getDb();
  const sheet = ss.getSheetByName("Envios");
  
  // O index vem do frontend (0-based da lista carregada)
  // Mas como a lista é normalmente invertida no frontend, precisamos ter cuidado.
  // No entanto, para simplificar o CRUD de logs, podemos deletar a linha index + 2
  
  if (sheet.getLastRow() > index + 1) {
    sheet.deleteRow(index + 2);
    return { sucesso: true, mensagem: "Registro de envio excluído." };
  }
  
  return { sucesso: false, mensagem: "Erro ao excluir: Registro não encontrado." };
}
