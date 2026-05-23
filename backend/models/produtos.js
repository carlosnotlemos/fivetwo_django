// Arquivo: backend/models/produtos.js

// 1. CREATE (Criar)
function salvarProduto(dados) {
  const sheet = getDb().getSheetByName("Produtos");
  
  // Verifica se o produto já existe pelo nome
  const nomes = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
  if (nomes.includes(dados.nome)) return { sucesso: false, mensagem: "Erro: Produto já catalogado." };

  sheet.appendRow([dados.nome, dados.preco, dados.descricao]);

  return { sucesso: true, mensagem: "Produto catalogado com sucesso!" };
}

// 2. READ (Ler/Listar)
function getProdutos() {
  const sheet = getDb().getSheetByName("Produtos");
  if (sheet.getLastRow() < 2) return [];
  // Retorna [Nome, Preço, Descrição]
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
}

// 3. UPDATE (Atualizar)
function atualizarProduto(dados) {
  const sheet = getDb().getSheetByName("Produtos");
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dados.nomeOriginal) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { sucesso: false, mensagem: "Erro: Produto não encontrado." };

  // Se o nome mudou, verifica se o novo nome já está em uso
  if (dados.nome !== dados.nomeOriginal) {
    const nomes = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    if (nomes.includes(dados.nome)) return { sucesso: false, mensagem: "Erro: Já existe outro produto com este nome." };
  }

  sheet.getRange(rowIndex, 1, 1, 3).setValues([[dados.nome, dados.preco, dados.descricao]]);
  return { sucesso: true, mensagem: "Produto atualizado com sucesso!" };
}

// 4. DELETE (Excluir)
function excluirProduto(nome) {
  const sheet = getDb().getSheetByName("Produtos");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    // Procura a linha que tem o nome exato
    if (data[i][0] === nome) {
      sheet.deleteRow(i + 1);
      return { sucesso: true, mensagem: "Produto removido do catálogo." };
    }
  }

  return { sucesso: false, mensagem: "Erro: Produto não encontrado para exclusão." };
}
