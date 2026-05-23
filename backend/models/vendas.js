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

  // Salva o registro mestre na aba Compras
  sheetCompras.appendRow([idPedido, dataCompra, dados.emailCliente, valorTotalPedido]);

  // Salva os itens na aba Compra_Itens
  const startRow = sheetItens.getLastRow() + 1;
  sheetItens.getRange(startRow, 1, linhasItens.length, 4).setValues(linhasItens);

  return { sucesso: true, mensagem: `Pedido ${idPedido} registrado com sucesso!` };
}

// 2. READ (Ler/Listar)
function getVendas() {
  const sheet = getDb().getSheetByName("Compras");
  if (sheet.getLastRow() < 2) return [];
  // Retorna [ID Pedido, Data, Cliente, Valor Total]
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getDisplayValues();
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

  return { sucesso: true, mensagem: "Venda e itens associados removidos com sucesso." };
}
