function normalizarRegistrosEstoque(registros) {
  return (registros || [])
    .filter(row => row && (String(row[0] || "").trim() !== "" || String(row[1] || "").trim() !== ""))
    .map(row => [String(row[0] || "").trim(), parseInt(row[1], 10) || 0])
    .filter(row => row[0] !== "");
}

function getEstoque() {
  const sheet = getDb().getSheetByName("Estoque");
  if (!sheet || sheet.getLastRow() < 2) return [];

  const dados = sheet.getDataRange().getValues();
  return normalizarRegistrosEstoque(dados.slice(1)).map(([produto, quantidade]) => [produto, quantidade]);
}

function ajustarEstoquePorItens(itens, operacao) {
  const sheet = getDb().getSheetByName("Estoque");
  if (!sheet || sheet.getLastRow() < 2) {
    return { sucesso: false, mensagem: "Erro: a aba de estoque ainda não foi cadastrada." };
  }

  const registros = normalizarRegistrosEstoque(sheet.getDataRange().getValues().slice(1));
  const itensSemEstoque = [];

  itens.forEach(item => {
    const produto = String(item.produto || "").trim();
    const quantidade = parseInt(item.quantidade, 10) || 0;

    if (!produto || quantidade <= 0) return;

    const indice = registros.findIndex(row => String(row[0]).trim() === produto);

    if (indice === -1) {
      itensSemEstoque.push(`${produto}`);
      return;
    }

    const estoqueAtual = parseInt(registros[indice][1], 10) || 0;
    const proximoEstoque = estoqueAtual + (operacao * quantidade);

    if (operacao < 0 && proximoEstoque < 0) {
      itensSemEstoque.push(`${produto} (disponível: ${estoqueAtual})`);
      return;
    }

    registros[indice][1] = proximoEstoque;
  });

  if (itensSemEstoque.length > 0) {
    return { sucesso: false, mensagem: `Estoque insuficiente para: ${itensSemEstoque.join(', ')}.` };
  }

  if (registros.length > 0) {
    sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), Math.max(sheet.getLastColumn(), 2)).clearContent();
    sheet.getRange(2, 1, registros.length, 2).setValues(registros);
  }

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
  const quantidade = parseInt(dados.quantidade, 10) || 0;

  if (!produto) return { sucesso: false, mensagem: "Erro: selecione um produto." };
  if (quantidade < 0) return { sucesso: false, mensagem: "Erro: a quantidade não pode ser negativa." };

  if (!sheet) {
    return { sucesso: false, mensagem: "Erro: a aba de estoque não foi configurada." };
  }

  const registros = normalizarRegistrosEstoque(sheet.getDataRange().getValues().slice(1));
  const indice = registros.findIndex(row => String(row[0]).trim() === produto);

  if (indice !== -1) {
    const estoqueAtual = parseInt(registros[indice][1], 10) || 0;
    sheet.getRange(indice + 2, 2).setValue(estoqueAtual + quantidade);
    return { sucesso: true, mensagem: `Estoque atualizado para ${produto}.` };
  }

  sheet.appendRow([produto, quantidade]);
  return { sucesso: true, mensagem: `Item de estoque adicionado para ${produto}.` };
}

function atualizarEstoqueItem(dados) {
  const sheet = getDb().getSheetByName("Estoque");
  const produtoOriginal = String(dados.produtoOriginal || "").trim();
  const produto = String(dados.produto || "").trim();
  const quantidade = parseInt(dados.quantidade, 10) || 0;

  if (!produto) return { sucesso: false, mensagem: "Erro: produto é obrigatório." };
  if (quantidade < 0) return { sucesso: false, mensagem: "Erro: a quantidade não pode ser negativa." };

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === produtoOriginal) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { sucesso: false, mensagem: "Erro: item de estoque não encontrado." };

  sheet.getRange(rowIndex, 1, 1, 2).setValues([[produto, quantidade]]);
  return { sucesso: true, mensagem: `Item de estoque atualizado para ${produto}.` };
}

function excluirEstoqueItem(produto) {
  const sheet = getDb().getSheetByName("Estoque");
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(produto).trim()) {
      sheet.deleteRow(i + 1);
      return { sucesso: true, mensagem: `Item de estoque removido para ${produto}.` };
    }
  }

  return { sucesso: false, mensagem: "Erro: item de estoque não encontrado para exclusão." };
}
