// Arquivo: backend/models/vendas.js

// 1. CREATE (Criar) - Movido de Codigo.js e melhorado
function salvarCompra(dados) {
  const ss = getDb();
  const sheetCompras = ss.getSheetByName("Compras");
  const sheetItens = ss.getSheetByName("Compra_Itens");

  if (!dados.itens || dados.itens.length === 0) {
    return { sucesso: false, mensagem: "Erro: O carrinho está vazio." };
  }

  const idPedido = "PED-" + new Date().getTime();
  const dataCompra = new Date().toLocaleDateString('pt-BR');

  const resultadoEstoque = debitarEstoquePorVenda(
    dados.itens,
    idPedido,
    `Venda realizada (${dados.emailCliente || 'Cliente Balcão'})`
  );
  if (!resultadoEstoque.sucesso) {
    return { sucesso: false, mensagem: resultadoEstoque.mensagem };
  }

  let valorTotalPedido = 0;
  const linhasItens = dados.itens.map(item => {
    valorTotalPedido += item.valorTotal;
    return [idPedido, item.produto, item.quantidade, item.valorTotal];
  });

  // Salva o valor BRUTO (soma dos itens + acréscimo/desconto avulso).
  // Os custos são armazenados separadamente na aba Custos e deduzidos
  // apenas na exibição do dashboard, preservando o valor original da venda.
  valorTotalPedido += parseFloat(dados.acrescimo) || 0; // Acréscimo/desconto avulso

  // Busca o nome do cliente pelo e-mail ou nome na aba Clientes
  const sheetClientes = ss.getSheetByName("Clientes");
  let nomeCliente = "";
  let emailClienteSalvar = dados.emailCliente || "";
  if (sheetClientes && sheetClientes.getLastRow() > 1) {
    const clientes = sheetClientes.getRange(2, 1, sheetClientes.getLastRow() - 1, 2).getValues();
    // Busca por e-mail ou por nome (caso o e-mail esteja em branco e venha o nome do select)
    const cliente = clientes.find(c => c[1] === dados.emailCliente || c[0] === dados.emailCliente);
    if (cliente) {
      nomeCliente = cliente[0];
      emailClienteSalvar = cliente[1] || ""; // Salva o e-mail se houver, senão em branco
    }
  }

  // Salva o registro mestre na aba Compras
  const metodoPagamento = dados.metodoPagamento || "Pix";
  const descricaoVenda = dados.descricaoVenda || "";
  sheetCompras.appendRow([idPedido, dataCompra, emailClienteSalvar, valorTotalPedido, nomeCliente, metodoPagamento, descricaoVenda]);

  // Salva os itens na aba Compra_Itens
  const startRow = sheetItens.getLastRow() + 1;
  sheetItens.getRange(startRow, 1, linhasItens.length, 4).setValues(linhasItens);

  // Salva os custos opcionais lançados junto com a venda
  if (dados.custos && dados.custos.length > 0) {
    const sheetCustos = ss.getSheetByName("Custos");
    if (sheetCustos) {
      const dataVenda = new Date().toLocaleDateString('pt-BR');

      dados.custos.forEach(c => {
        const idCusto = "CST-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        sheetCustos.appendRow([
          idCusto,
          idPedido,       // Associado à venda, não ao produto
          c.tipo,
          parseFloat(c.valor),
          dataVenda,
          c.desc || ""
        ]);
      });
    }
  }

  return { sucesso: true, mensagem: `Pedido ${idPedido} registrado com sucesso!` };
}

// 2. READ (Ler/Listar)
function getVendas() {
  const sheet = getDb().getSheetByName("Compras");
  if (sheet.getLastRow() < 2) return [];
  // Retorna [ID Pedido, Data, Cliente Email, Valor Total, Nome do Cliente, Método, Descrição]
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getDisplayValues();
}

function getItensVenda(idPedido) {
  const sheet = getDb().getSheetByName("Compra_Itens");
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  // Filtra itens pelo ID do Pedido e retorna [Produto, Quantidade, Subtotal]
  return data.filter(row => row[0] === idPedido).map(row => [row[1], row[2], row[3]]);
}

// 4. DELETE (Excluir)
function excluirVenda(idPedido) {
  const ss = getDb();
  const sheetCompras = ss.getSheetByName("Compras");
  const sheetItens = ss.getSheetByName("Compra_Itens");

  const itensDaVenda = getItensVenda(idPedido).map(item => ({
    produto: item[0],
    quantidade: Number(item[1] || 0)
  }));

  const restaurado = restaurarEstoquePorVenda(
    itensDaVenda,
    idPedido,
    `Estorno por cancelamento/exclusão do pedido ${idPedido}`,
    "Estorno (Cancelamento Venda)"
  );
  if (!restaurado.sucesso) {
    return { sucesso: false, mensagem: restaurado.mensagem };
  }

  // 1. Remover da aba Compras
  const dataCompras = sheetCompras.getDataRange().getValues();
  for (let i = 1; i < dataCompras.length; i++) {
    if (dataCompras[i][0] === idPedido) {
      sheetCompras.deleteRow(i + 1);
      break;
    }
  }

  // 2. Remover da aba Compra_Itens (pode haver múltiplas linhas)
  // Fazemos de baixo para cima para não perder a referência dos índices ao excluir
  const dataItens = sheetItens.getDataRange().getValues();
  for (let i = dataItens.length - 1; i >= 1; i--) {
    if (dataItens[i][0] === idPedido) {
      sheetItens.deleteRow(i + 1);
    }
  }

  // 3. Remover da aba Custos (pode haver múltiplos custos)
  const sheetCustos = ss.getSheetByName("Custos");
  if (sheetCustos && sheetCustos.getLastRow() > 1) {
    const dataCustos = sheetCustos.getDataRange().getValues();
    for (let i = dataCustos.length - 1; i >= 1; i--) {
      if (dataCustos[i][1] === idPedido) { // Segunda coluna é o idPedido
        sheetCustos.deleteRow(i + 1);
      }
    }
  }

  return { sucesso: true, mensagem: "Venda, itens e custos associados removidos com sucesso." };
}

function atualizarCompra(dados) {
  const ss = getDb();
  const sheetCompras = ss.getSheetByName("Compras");
  const sheetItens = ss.getSheetByName("Compra_Itens");
  const sheetCustos = ss.getSheetByName("Custos");

  const idPedido = dados.idPedido;
  if (!idPedido) {
    return { sucesso: false, mensagem: "Erro: ID do pedido inválido." };
  }

  if (!dados.itens || dados.itens.length === 0) {
    return { sucesso: false, mensagem: "Erro: O carrinho está vazio." };
  }

  const itensAnteriores = getItensVenda(idPedido).map(item => ({
    produto: item[0],
    quantidade: Number(item[1] || 0)
  }));

  const restaurado = restaurarEstoquePorVenda(
    itensAnteriores,
    idPedido,
    `Estorno para edição do pedido ${idPedido}`,
    "Estorno (Edição Venda)"
  );
  if (!restaurado.sucesso) {
    return { sucesso: false, mensagem: restaurado.mensagem };
  }

  const estoqueResultado = debitarEstoquePorVenda(
    dados.itens,
    idPedido,
    `Re-débito com novos itens na edição do pedido ${idPedido}`
  );
  if (!estoqueResultado.sucesso) {
    return { sucesso: false, mensagem: estoqueResultado.mensagem };
  }

  // 1. Calcula o total de itens (valor BRUTO — custos são armazenados
  // separadamente e deduzidos apenas no dashboard)
  let valorTotalPedido = 0;
  const linhasItens = dados.itens.map(item => {
    valorTotalPedido += item.valorTotal;
    return [idPedido, item.produto, item.quantidade, item.valorTotal];
  });

  // 2. Aplica apenas acréscimo/desconto avulso ao total bruto
  valorTotalPedido += parseFloat(dados.acrescimo) || 0; // Acréscimo/desconto avulso

  // 3. Busca o nome do cliente pelo e-mail ou nome na aba Clientes
  const sheetClientes = ss.getSheetByName("Clientes");
  let nomeCliente = "";
  let emailClienteSalvar = dados.emailCliente || "";
  if (sheetClientes && sheetClientes.getLastRow() > 1) {
    const clientes = sheetClientes.getRange(2, 1, sheetClientes.getLastRow() - 1, 2).getValues();
    const cliente = clientes.find(c => c[1] === dados.emailCliente || c[0] === dados.emailCliente);
    if (cliente) {
      nomeCliente = cliente[0];
      emailClienteSalvar = cliente[1] || "";
    }
  }

  // 4. Atualiza o registro mestre na aba Compras
  const dataCompras = sheetCompras.getDataRange().getValues();
  let rowIndexCompra = -1;
  for (let i = 1; i < dataCompras.length; i++) {
    if (dataCompras[i][0] === idPedido) {
      rowIndexCompra = i + 1;
      break;
    }
  }

  if (rowIndexCompra === -1) {
    return { sucesso: false, mensagem: "Erro: Registro da compra não encontrado." };
  }

  const metodoPagamento = dados.metodoPagamento || "Pix";
  const descricaoVenda = dados.descricaoVenda || "";
  const dataCompra = dataCompras[rowIndexCompra - 1][1] || new Date().toLocaleDateString('pt-BR'); // Mantém a data original

  // Atualiza as colunas na aba Compras: [ID do Pedido, Data, E-mail do Cliente, Valor Total do Pedido, Nome do Cliente, Método, Descrição]
  sheetCompras.getRange(rowIndexCompra, 1, 1, 7).setValues([[idPedido, dataCompra, emailClienteSalvar, valorTotalPedido, nomeCliente, metodoPagamento, descricaoVenda]]);

  // 5. Atualiza os itens na aba Compra_Itens (Deleta os antigos e insere os novos)
  const dataItens = sheetItens.getDataRange().getValues();
  for (let i = dataItens.length - 1; i >= 1; i--) {
    if (dataItens[i][0] === idPedido) {
      sheetItens.deleteRow(i + 1);
    }
  }
  const startRow = sheetItens.getLastRow() + 1;
  sheetItens.getRange(startRow, 1, linhasItens.length, 4).setValues(linhasItens);

  // 6. Atualiza os custos na aba Custos (Deleta os antigos e insere os novos)
  if (sheetCustos) {
    const dataCustos = sheetCustos.getDataRange().getValues();
    for (let i = dataCustos.length - 1; i >= 1; i--) {
      if (dataCustos[i][1] === idPedido) {
        sheetCustos.deleteRow(i + 1);
      }
    }

    if (dados.custos && dados.custos.length > 0) {
      const dataVenda = dataCompra; // Usa a mesma data da compra original
      dados.custos.forEach(c => {
        const idCusto = "CST-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        sheetCustos.appendRow([
          idCusto,
          idPedido,
          c.tipo,
          parseFloat(c.valor),
          dataVenda,
          c.desc || ""
        ]);
      });
    }
  }

  return { sucesso: true, mensagem: `Pedido ${idPedido} atualizado com sucesso!` };
}
