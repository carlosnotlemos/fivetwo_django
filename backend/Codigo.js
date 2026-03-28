const BATCH_SIZE = 40; // Limite de e-mails por lote

// Esta função transforma o script em um Web App
function doGet(e) {
  return HtmlService.createTemplateFromFile('frontend/views/Index')
    .evaluate()
    .setTitle('PostlyMail | CRM & Marketing')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📧 E-mail Marketing')
    .addItem('Abrir Painel', 'abrirPainel')
    .addItem('⚙️ Configurar Planilhas (1ª Execução)', 'configurarPlanilhas')
    .addSeparator()
    .addItem('▶️ Processar Fila Manualmente', 'processarFilaEnvio')
    .addItem('⏰ Criar Gatilho de Envio Automático', 'criarGatilhoFila')
    .addToUi();
}

function abrirPainel() {
  const html = HtmlService.createTemplateFromFile('frontend/views/Index').evaluate()
    .setTitle('PostlyMail | Premium')
    .setWidth(800)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, ' ');
}

// 1. Configuração Inicial
function configurarPlanilhas() {
  const ss = getDb();

  const abas = {
    "Clientes": ["Nome", "E-mail", "Telefone", "Data Cadastro"],
    "Produtos": ["Nome do Produto", "Preço Base (R$)", "Descrição"],
    "Compras": ["ID do Pedido", "Data", "E-mail do Cliente", "Valor Total do Pedido (R$)"],
    "Compra_Itens": ["ID do Pedido", "Produto", "Quantidade", "Subtotal (R$)"],
    "Campanhas": ["Nome da Campanha", "Assunto", "Conteúdo HTML"],
    "Envios": ["Data do Envio", "Campanha", "Segmento", "Quantidade"],
    "Fila_Envio": ["E-mail", "Assunto", "Conteúdo", "Campanha", "Status"]
  };

  for (const [nome, cabecalhos] of Object.entries(abas)) {
    let sheet = ss.getSheetByName(nome);
    if (!sheet) {
      sheet = ss.insertSheet(nome);
      sheet.appendRow(cabecalhos);
      sheet.getRange("A1:Z1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
  }
  return "Banco de dados relacional atualizado com sucesso!";
}

// 2. Validação e Salvamento (Clientes foi movido para models/cliente.js)
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}




// 3. Lógica de Envio e Fila

// --- FUNÇÃO PARA ALIMENTAR OS MENUS SUSPENSOS ---
// Busca clientes e produtos para preencher o formulário de compras
function getDadosParaCompra() {
  const ss = getDb();

  const sheetClientes = ss.getSheetByName("Clientes");
  let clientes = [];
  if (sheetClientes.getLastRow() > 1) {
    // Pega Nome e E-mail
    clientes = sheetClientes.getRange(2, 1, sheetClientes.getLastRow() - 1, 2).getValues();
  }

  const sheetProdutos = ss.getSheetByName("Produtos");
  let produtos = [];
  if (sheetProdutos.getLastRow() > 1) {
    // Pega Nome e Preço
    produtos = sheetProdutos.getRange(2, 1, sheetProdutos.getLastRow() - 1, 2).getValues();
  }

  return { clientes: clientes, produtos: produtos };
}

// 4. OTIMIZAÇÃO: Carregamento Único
function getAppState() {
  return {
    clientes: getClientes(),
    produtos: getProdutos(),
    vendas: getVendas(),
    campanhas: getCampanhas(),
    envios: getEnvios()
  };
}

function agendarEnvio(campanhaNome, segmento) {
  const ss = getDb();
  const clientesSheet = ss.getSheetByName("Clientes");
  const comprasSheet = ss.getSheetByName("Compras");
  const campanhasSheet = ss.getSheetByName("Campanhas");
  const filaSheet = ss.getSheetByName("Fila_Envio");
  const enviosSheet = ss.getSheetByName("Envios");

  // 1. Buscar dados da campanha
  if (campanhasSheet.getLastRow() < 2) return { sucesso: false, mensagem: "Nenhuma campanha cadastrada." };

  const campanhas = campanhasSheet.getRange(2, 1, campanhasSheet.getLastRow() - 1, 3).getValues();
  const campanha = campanhas.find(c => c[0] === campanhaNome);
  if (!campanha) return { sucesso: false, mensagem: "Erro: Campanha não encontrada." };

  const assunto = campanha[1];
  const conteudoBase = campanha[2];

  // 2. Buscar clientes e histórico de compras
  if (clientesSheet.getLastRow() < 2) return { sucesso: false, mensagem: "Nenhum cliente cadastrado." };
  const clientes = clientesSheet.getRange(2, 1, clientesSheet.getLastRow() - 1, 4).getValues();

  let historicoCompras = [];
  if (comprasSheet.getLastRow() > 1) {
    // Pega Data, E-mail e Valor das compras (Colunas 2, 3 e 4)
    historicoCompras = comprasSheet.getRange(2, 2, comprasSheet.getLastRow() - 1, 3).getValues();
  }

  let alvos = [];
  const hoje = new Date();

  // 3. Processar a Segmentação
  clientes.forEach(c => {
    const nome = c[0];
    const email = c[1];
    const dataCadastroStr = c[3];

    if (!validarEmail(email)) return;

    // 1. Calcular Dias desde Cadastro
    let dataCadastro = new Date(dataCadastroStr);
    if (isNaN(dataCadastro.getTime()) && typeof dataCadastroStr === 'string' && dataCadastroStr.includes('/')) {
      const p = dataCadastroStr.split('/');
      dataCadastro = new Date(p[2], p[1] - 1, p[0]);
    }
    const diasCadastro = Math.floor((hoje - dataCadastro) / (1000 * 60 * 60 * 24));

    // 2. Calcular Dados de Compra (Recência e Total Gasto)
    const comprasDoCli = historicoCompras.filter(compra => compra[1] === email);
    let totalGasto = 0;
    let diasUltimaCompra = Infinity;

    if (comprasDoCli.length > 0) {
      const datas = comprasDoCli.map(cp => {
        const d = cp[0];
        if (typeof d === 'string' && d.includes('/')) {
          const p = d.split('/');
          return new Date(p[2], p[1] - 1, p[0]);
        }
        return new Date(d);
      }).filter(d => !isNaN(d.getTime()));

      if (datas.length > 0) {
        const ultimaData = new Date(Math.max.apply(null, datas));
        diasUltimaCompra = Math.floor((hoje - ultimaData) / (1000 * 60 * 60 * 24));
      }
      
      totalGasto = comprasDoCli.reduce((acc, curr) => acc + (parseFloat(curr[2]) || 0), 0);
    }

    // 3. Lógica de Segmentação
    let incluir = false;
    switch (segmento) {
      case 'Todos': incluir = true; break;
      case 'Novos': if (diasCadastro <= 7) incluir = true; break;
      case 'Recentes': if (diasUltimaCompra <= 30) incluir = true; break;
      case 'Inativos': if (diasUltimaCompra > 90) incluir = true; break;
      case 'VIP': if (totalGasto >= 500) incluir = true; break;
    }

    if (incluir) {
      // Pega o HTML puro da campanha e substitui as tags dinâmicas
      let templateCompleto = conteudoBase
        .replace(/{{nome}}/g, nome)
        .replace(/{{email}}/g, email);

      alvos.push([email, assunto, templateCompleto, campanhaNome, "Pendente"]);
    }
  });

  if (alvos.length === 0) return { sucesso: false, mensagem: "Nenhum cliente atende aos critérios deste segmento." };

  // 4. Inserir na aba Fila_Envio de uma só vez (muito mais rápido)
  filaSheet.getRange(filaSheet.getLastRow() + 1, 1, alvos.length, 5).setValues(alvos);

  // 5. Registrar log de agendamento na aba Envios
  enviosSheet.appendRow([new Date().toLocaleDateString('pt-BR'), campanhaNome, segmento, alvos.length]);

  return { sucesso: true, mensagem: `Pipeline iniciado! ${alvos.length} e-mails preparados para a segmentação: ${segmento}.` };
}

// 4. Processamento de Lotes
function processarFilaEnvio() {
  const filaSheet = getDb().getSheetByName("Fila_Envio");
  if (filaSheet.getLastRow() < 2) return;

  const dadosFila = filaSheet.getRange(2, 1, filaSheet.getLastRow() - 1, 5).getValues();
  let enviadosNoLote = 0;

  for (let i = 0; i < dadosFila.length; i++) {
    if (enviadosNoLote >= BATCH_SIZE) break;

    const [email, assunto, conteudo, campanha, status] = dadosFila[i];

    if (status === "Pendente") {
      try {
        MailApp.sendEmail({
          to: email,
          subject: assunto,
          htmlBody: conteudo
        });
        // Atualizar status na planilha (i + 2 porque a linha 1 é cabeçalho)
        filaSheet.getRange(i + 2, 5).setValue("Enviado");
        enviadosNoLote++;
      } catch (e) {
        filaSheet.getRange(i + 2, 5).setValue("Erro: " + e.message);
      }
    }
  }
}

// 5. Automatização (Gatilhos)
function criarGatilhoFila() {
  // Limpa gatilhos antigos para evitar duplicidade
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processarFilaEnvio') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Cria um gatilho para rodar a cada 15 minutos
  ScriptApp.newTrigger('processarFilaEnvio')
    .timeBased()
    .everyMinutes(15)
    .create();

  SpreadsheetApp.getUi().alert('Gatilho criado! A fila será processada automaticamente a cada 15 minutos.');
}

// --- MOTOR DE TEMPLATE (INCLUDE) ---
// Permite quebrar o front-end em múltiplos arquivos HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}