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

function getHistoricoEstoque() {
  const sheet = getDb().getSheetByName("Estoque_Historico");
  if (!sheet || sheet.getLastRow() < 2) return [];

  // Pega todas as movimentações da linha 2 em diante (8 colunas)
  const dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues();
  // Retorna os mais recentes no topo
  return dados.reverse();
}

function registrarMovimentacaoEstoque(mov) {
  registrarMovimentacoesEstoque([mov]);
}

function registrarMovimentacoesEstoque(movimentacoes) {
  if (!movimentacoes || movimentacoes.length === 0) return;
  const ss = getDb();
  let sheet = ss.getSheetByName("Estoque_Historico");
  if (!sheet) {
    sheet = ss.insertSheet("Estoque_Historico");
    sheet.appendRow(["Data/Hora", "Produto", "Tipo de Movimentação", "Quantidade", "Saldo Anterior", "Saldo Posterior", "Referência", "Observação"]);
    sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }

  const dataHora = new Date().toLocaleString('pt-BR');
  const linhas = movimentacoes.map(m => [
    m.dataHora || dataHora,
    String(m.produto || '').trim(),
    String(m.tipo || 'Ajuste').trim(),
    Number(m.quantidade || 0),
    Number(m.saldoAnterior !== undefined ? m.saldoAnterior : 0),
    Number(m.saldoPosterior !== undefined ? m.saldoPosterior : 0),
    String(m.referencia || '').trim(),
    String(m.observacao || '').trim()
  ]);

  sheet.getRange(sheet.getLastRow() + 1, 1, linhas.length, 8).setValues(linhas);
}

function ajustarEstoquePorItens(itens, operacao, referencia, observacao, tipoCustomizado) {
  const sheet = getDb().getSheetByName("Estoque");
  if (!sheet || sheet.getLastRow() < 2) {
    return { sucesso: false, mensagem: "Erro: a aba de estoque ainda não foi cadastrada." };
  }

  const registros = normalizarRegistrosEstoque(sheet.getDataRange().getValues().slice(1));
  const itensSemEstoque = [];
  const movimentacoesHistorico = [];

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
    const delta = operacao * quantidade;
    const proximoEstoque = estoqueAtual + delta;

    if (operacao < 0 && proximoEstoque < 0) {
      itensSemEstoque.push(`${produto} (disponível: ${estoqueAtual})`);
      return;
    }

    registros[indice][1] = proximoEstoque;

    const tipoOperacao = tipoCustomizado || (operacao < 0 ? "Saída (Venda)" : "Estorno (Venda)");
    movimentacoesHistorico.push({
      produto: produto,
      tipo: tipoOperacao,
      quantidade: delta,
      saldoAnterior: estoqueAtual,
      saldoPosterior: proximoEstoque,
      referencia: referencia || "",
      observacao: observacao || (operacao < 0 ? `Débito de ${quantidade} un.` : `Estorno de ${quantidade} un.`)
    });
  });

  if (itensSemEstoque.length > 0) {
    return { sucesso: false, mensagem: `Estoque insuficiente para: ${itensSemEstoque.join(', ')}.` };
  }

  if (registros.length > 0) {
    sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), Math.max(sheet.getLastColumn(), 2)).clearContent();
    sheet.getRange(2, 1, registros.length, 2).setValues(registros);
  }

  if (movimentacoesHistorico.length > 0) {
    registrarMovimentacoesEstoque(movimentacoesHistorico);
  }

  return { sucesso: true, mensagem: "Estoque atualizado com sucesso." };
}

function debitarEstoquePorVenda(itens, referencia, observacao) {
  return ajustarEstoquePorItens(itens, -1, referencia, observacao, "Saída (Venda)");
}

function restaurarEstoquePorVenda(itens, referencia, observacao, tipo) {
  return ajustarEstoquePorItens(itens, 1, referencia, observacao, tipo || "Estorno (Venda)");
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
    const novoSaldo = estoqueAtual + quantidade;
    sheet.getRange(indice + 2, 2).setValue(novoSaldo);

    registrarMovimentacaoEstoque({
      produto: produto,
      tipo: "Entrada / Reposição",
      quantidade: quantidade,
      saldoAnterior: estoqueAtual,
      saldoPosterior: novoSaldo,
      referencia: "Entrada Manual",
      observacao: dados.observacao || "Adição manual de estoque"
    });

    return { sucesso: true, mensagem: `Estoque atualizado para ${produto}.` };
  }

  sheet.appendRow([produto, quantidade]);
  registrarMovimentacaoEstoque({
    produto: produto,
    tipo: "Entrada Inicial",
    quantidade: quantidade,
    saldoAnterior: 0,
    saldoPosterior: quantidade,
    referencia: "Cadastro Inicial",
    observacao: dados.observacao || "Primeiro cadastro do item no estoque"
  });

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

  const saldoAnterior = parseInt(data[rowIndex - 1][1], 10) || 0;
  sheet.getRange(rowIndex, 1, 1, 2).setValues([[produto, quantidade]]);

  const delta = quantidade - saldoAnterior;
  registrarMovimentacaoEstoque({
    produto: produto,
    tipo: "Ajuste Manual",
    quantidade: delta,
    saldoAnterior: saldoAnterior,
    saldoPosterior: quantidade,
    referencia: "Edição Manual",
    observacao: dados.observacao || (produto !== produtoOriginal ? `Renomeado de '${produtoOriginal}' e saldo ajustado de ${saldoAnterior} para ${quantidade}` : `Balanço ajustado de ${saldoAnterior} para ${quantidade}`)
  });

  return { sucesso: true, mensagem: `Item de estoque atualizado para ${produto}.` };
}

function excluirEstoqueItem(produto) {
  const sheet = getDb().getSheetByName("Estoque");
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(produto).trim()) {
      const saldoAnterior = parseInt(data[i][1], 10) || 0;
      sheet.deleteRow(i + 1);

      registrarMovimentacaoEstoque({
        produto: produto,
        tipo: "Exclusão de Cadastro",
        quantidade: -saldoAnterior,
        saldoAnterior: saldoAnterior,
        saldoPosterior: 0,
        referencia: "Exclusão Manual",
        observacao: "Item excluído do cadastro de estoque (saldo zerado)"
      });

      return { sucesso: true, mensagem: `Item de estoque removido para ${produto}.` };
    }
  }

  return { sucesso: false, mensagem: "Erro: item de estoque não encontrado para exclusão." };
}
