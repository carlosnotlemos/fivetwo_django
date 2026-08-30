// Arquivo: backend/models/custos.js

// 1. CREATE (Criar)
function salvarCusto(dados) {
  const sheet = getDb().getSheetByName("Custos");
  
  const idCusto = "CST-" + new Date().getTime();
  const dataLancamento = dados.data || new Date().toLocaleDateString('pt-BR');
  const valor = parseFloat(dados.valor) || 0;
  const descricao = dados.descricao || "";

  sheet.appendRow([idCusto, dados.produto, dados.tipoCusto, valor, dataLancamento, descricao]);

  return { sucesso: true, mensagem: "Custo cadastrado com sucesso!" };
}

// 2. READ (Ler/Listar)
function getCustos() {
  const sheet = getDb().getSheetByName("Custos");
  if (!sheet) return [];
  if (sheet.getLastRow() < 2) return [];
  // Retorna [ID do Custo, Produto, Tipo de Custo, Valor (R$), Data, Descrição]
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getDisplayValues();
}

// 3. UPDATE (Atualizar)
function atualizarCusto(dados) {
  const sheet = getDb().getSheetByName("Custos");
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dados.idCusto) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { sucesso: false, mensagem: "Erro: Lançamento de custo não encontrado." };

  const valor = parseFloat(dados.valor) || 0;
  const dataLancamento = dados.data || new Date().toLocaleDateString('pt-BR');
  const descricao = dados.descricao || "";

  sheet.getRange(rowIndex, 1, 1, 6).setValues([[dados.idCusto, dados.produto, dados.tipoCusto, valor, dataLancamento, descricao]]);
  return { sucesso: true, mensagem: "Custo atualizado com sucesso!" };
}

// 4. DELETE (Excluir)
function excluirCusto(idCusto) {
  const sheet = getDb().getSheetByName("Custos");
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idCusto) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { sucesso: false, mensagem: "Erro: Lançamento de custo não encontrado." };

  sheet.deleteRow(rowIndex);
  return { sucesso: true, mensagem: "Lançamento de custo excluído com sucesso!" };
}

// 5. BUSINESS INTELLIGENCE (Rentabilidade por Produto)
function getRentabilidadeProdutos() {
  const ss = getDb();
  const sheetProdutos = ss.getSheetByName("Produtos");
  const sheetItens = ss.getSheetByName("Compra_Itens");
  const sheetCustos = ss.getSheetByName("Custos");

  if (!sheetProdutos || sheetProdutos.getLastRow() < 2) return [];

  const parseDbNum = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let str = val.toString().trim();
    if (!str) return 0;
    if (str.indexOf(',') !== -1) {
      str = str.replace(/\./g, '').replace(',', '.');
    }
    str = str.replace(/[^\d.-]/g, '');
    return parseFloat(str) || 0;
  };

  // 1. Carrega todos os produtos
  const produtos = sheetProdutos.getRange(2, 1, sheetProdutos.getLastRow() - 1, 2).getValues(); // [Nome, Preço Base]

  // 2. Carrega todos os itens de compra e agrupa faturamento bruto por produto
  const faturamentoPorProduto = {};
  const quantidadeVendidaPorProduto = {};
  produtos.forEach(p => { 
    faturamentoPorProduto[p[0]] = 0; 
    quantidadeVendidaPorProduto[p[0]] = 0;
  });

  if (sheetItens && sheetItens.getLastRow() > 1) {
    const itens = sheetItens.getRange(2, 1, sheetItens.getLastRow() - 1, 5).getValues();
    itens.forEach(it => {
      const prodNome = it[1] || it[0];
      const qtd = parseDbNum(it[3] ?? it[2]);
      const subtotal = parseDbNum(it[4] ?? it[3]);
      if (faturamentoPorProduto[prodNome] !== undefined) {
        faturamentoPorProduto[prodNome] += subtotal;
        quantidadeVendidaPorProduto[prodNome] += qtd;
      }
    });
  }

  // 3. Carrega todos os custos e agrupa custos totais por produto
  const custosPorProduto = {};
  produtos.forEach(p => { custosPorProduto[p[0]] = 0; });

  if (sheetCustos && sheetCustos.getLastRow() > 1) {
    const custos = sheetCustos.getRange(2, 2, sheetCustos.getLastRow() - 1, 3).getValues(); // [Produto, Tipo, Valor]
    custos.forEach(c => {
      const prodNome = c[0];
      const valor = parseDbNum(c[2]);
      if (custosPorProduto[prodNome] !== undefined) {
        custosPorProduto[prodNome] += valor;
      }
    });
  }

  // 4. Monta o demonstrativo final
  return produtos.map(p => {
    const nome = p[0];
    const bruto = faturamentoPorProduto[nome] || 0;
    const qtdVendida = quantidadeVendidaPorProduto[nome] || 0;
    const custoUnitarioTotal = custosPorProduto[nome] || 0;
    const custoTotal = custoUnitarioTotal * qtdVendida;
    const liquido = bruto - custoTotal;
    const margem = bruto > 0 ? (liquido / bruto) * 100 : 0;
    return {
      nome: nome,
      bruto: bruto,
      custo: custoTotal,
      liquido: liquido,
      margem: margem
    };
  });
}
