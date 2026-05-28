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

  let valorTotalPedido = 0;
  const linhasItens = dados.itens.map(item => {
    valorTotalPedido += item.valorTotal;
    return [idPedido, item.produto, item.quantidade, item.valorTotal];
  });

  // Calcula a soma de todos os custos vinculados a esta venda e subtrai do total
  let totalCustos = 0;
  if (dados.custos && dados.custos.length > 0) {
    dados.custos.forEach(c => {
      totalCustos += parseFloat(c.valor) || 0;
    });
  }
  valorTotalPedido -= totalCustos;

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
  if (sheet.getLastRow() < 2) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  // Filtra itens pelo ID do Pedido
  return data.filter(row => row[0] === idPedido).map(row => [row[1], row[2], row[3]]);
}

// 4. DELETE (Excluir)
function excluirVenda(idPedido) {
  const ss = getDb();
  const sheetCompras = ss.getSheetByName("Compras");
  const sheetItens = ss.getSheetByName("Compra_Itens");

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
