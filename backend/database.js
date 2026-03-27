function getDb() {
  const ambienteAtual = CONFIG.AMBIENTE;
  const idPlanilha = CONFIG.BANCO_DE_DADOS[ambienteAtual];

  if (!idPlanilha) {
    throw new Error(`ID do banco de dados não encontrado para o ambiente: ${ambienteAtual}`);
  }

  // Abre e retorna a planilha correspondente ao ambiente
  return SpreadsheetApp.openById(idPlanilha);
}