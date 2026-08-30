function getEstoque() {
  const sheet = getDb().getSheetByName("Estoque");
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
}

function ajustarEstoquePorItens(itens, operacao) {
  const sheet = getDb().getSheetByName("Estoque");
  if (!sheet || sheet.getLastRow() < 2) {
    return { sucesso: false, mensagem: "Erro: a aba de estoque ainda não foi cadastrada." };
  }

  const registros = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const itensSemEstoque = [];

  itens.forEach(item => {
    const produto = String(item.produto || "").trim();
    const tamanho = String(item.tamanho || "").trim();
    const quantidade = parseInt(item.quantidade, 10) || 0;

    if (!produto || !tamanho || quantidade <= 0) return;

    const indice = registros.findIndex(row => {
      return String(row[0]).trim() === produto && String(row[1]).trim().toLowerCase() === tamanho.toLowerCase();
    });

    if (indice === -1) {
      itensSemEstoque.push(`${produto} / ${tamanho}`);
      return;
    }

    const estoqueAtual = parseInt(registros[indice][2], 10) || 0;
    const proximoEstoque = estoqueAtual + (operacao * quantidade);

    if (operacao < 0 && proximoEstoque < 0) {
      itensSemEstoque.push(`${produto} / ${tamanho} (disponível: ${estoqueAtual})`);
      return;
    }

    registros[indice][2] = proximoEstoque;
  });

  if (itensSemEstoque.length > 0) {
    return { sucesso: false, mensagem: `Estoque insuficiente para: ${itensSemEstoque.join(', ')}.` };
  }

  sheet.getRange(2, 1, registros.length, 3).setValues(registros);
  return { sucesso: true, mensagem: "Estoque atualizado com sucesso." };
}

function debitarEstoquePorVenda(itens) {
  return ajustarEstoquePorItens(itens, -1);
}

function restaurarEstoquePorVenda(itens) {
  return ajustarEstoquePorItens(itens, 1);
}

function salvarEstoqueItem(dados) {
  const sheet = getDb().getSheetByName("Estoque");
  const produto = String(dados.produto || "").trim();
  const tamanho = String(dados.tamanho || "").trim();
  const quantidade = parseInt(dados.quantidade, 10) || 0;

  if (!produto) return { sucesso: false, mensagem: "Erro: selecione um produto." };
  if (!tamanho) return { sucesso: false, mensagem: "Erro: informe o tamanho." };
  if (quantidade < 0) return { sucesso: false, mensagem: "Erro: a quantidade não pode ser negativa." };

  if (!sheet) {
    return { sucesso: false, mensagem: "Erro: a aba de estoque não foi configurada." };
  }

  const registros = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 3).getValues();
  const indice = registros.findIndex(row => {
    return String(row[0]).trim() === produto && String(row[1]).trim().toLowerCase() === tamanho.toLowerCase();
  });

  if (indice !== -1) {
    const estoqueAtual = parseInt(registros[indice][2], 10) || 0;
    sheet.getRange(indice + 2, 3).setValue(estoqueAtual + quantidade);
    return { sucesso: true, mensagem: `Estoque atualizado para ${produto} / ${tamanho}.` };
  }

  sheet.appendRow([produto, tamanho, quantidade]);
  return { sucesso: true, mensagem: `Item de estoque adicionado para ${produto} / ${tamanho}.` };
}

function atualizarEstoqueItem(dados) {
  const sheet = getDb().getSheetByName("Estoque");
  const produtoOriginal = String(dados.produtoOriginal || "").trim();
  const tamanhoOriginal = String(dados.tamanhoOriginal || "").trim();
  const produto = String(dados.produto || "").trim();
  const tamanho = String(dados.tamanho || "").trim();
  const quantidade = parseInt(dados.quantidade, 10) || 0;

  if (!produto || !tamanho) return { sucesso: false, mensagem: "Erro: produto e tamanho são obrigatórios." };
  if (quantidade < 0) return { sucesso: false, mensagem: "Erro: a quantidade não pode ser negativa." };

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === produtoOriginal && String(data[i][1]).trim().toLowerCase() === tamanhoOriginal.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { sucesso: false, mensagem: "Erro: item de estoque não encontrado." };

  sheet.getRange(rowIndex, 1, 1, 3).setValues([[produto, tamanho, quantidade]]);
  return { sucesso: true, mensagem: `Item de estoque atualizado para ${produto} / ${tamanho}.` };
}

function excluirEstoqueItem(produto, tamanho) {
  const sheet = getDb().getSheetByName("Estoque");
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(produto).trim() && String(data[i][1]).trim().toLowerCase() === String(tamanho).trim().toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { sucesso: true, mensagem: `Item de estoque removido para ${produto} / ${tamanho}.` };
    }
  }

  return { sucesso: false, mensagem: "Erro: item de estoque não encontrado para exclusão." };
}
