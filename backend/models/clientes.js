// Arquivo: backend/clientes.js

// 1. CREATE (Criar)
function salvarCliente(dados) {
  if (!validarEmail(dados.email)) return { sucesso: false, mensagem: "Erro: E-mail inválido." };

  const sheet = getDb().getSheetByName("Clientes");
  const emails = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();

  if (emails.includes(dados.email)) return { sucesso: false, mensagem: "Erro: E-mail já cadastrado." };

  const hoje = new Date().toLocaleDateString('pt-BR');
  sheet.appendRow([dados.nome, dados.email, dados.telefone, hoje]);

  return { sucesso: true, mensagem: "Cliente cadastrado com sucesso!" };
}

// 2. READ (Ler/Listar)
function getClientes() {
  const sheet = getDb().getSheetByName("Clientes");
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getDisplayValues();
}

// 3. UPDATE (Atualizar)
function atualizarCliente(dados) {
  if (!validarEmail(dados.email)) return { sucesso: false, mensagem: "Erro: E-mail inválido." };

  const sheet = getDb().getSheetByName("Clientes");
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === dados.emailOriginal) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return { sucesso: false, mensagem: "Erro: Cliente não encontrado." };

  if (dados.email !== dados.emailOriginal) {
    const emails = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    if (emails.includes(dados.email)) return { sucesso: false, mensagem: "Erro: E-mail já em uso." };
  }

  sheet.getRange(rowIndex, 1, 1, 3).setValues([[dados.nome, dados.email, dados.telefone]]);
  return { sucesso: true, mensagem: "Cliente atualizado com sucesso!" };
}

// 4. DELETE (Excluir)
function excluirCliente(email) {
  const sheet = getDb().getSheetByName("Clientes");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    // Procura a linha que tem o e-mail exato
    if (data[i][1] === email) {
      sheet.deleteRow(i + 1); // Exclui a linha fisicamente da folha de cálculo
      return { sucesso: true, mensagem: "Cliente removido da base." };
    }
  }

  return { sucesso: false, mensagem: "Erro: Cliente não encontrado para exclusão." };
}