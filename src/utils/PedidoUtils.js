import { nanoid } from 'nanoid';

// Função para registrar ou recuperar um cliente com base no telefone
export async function registraCliente(tx, nome, telefone) {
  return await tx.cliente.upsert({
    where: { telefone },
    update: { nome }, // Se existir, atualiza o nome caso tenha mudado
    create: { id: nanoid(12), nome, telefone }
  });
}

// Função para registrar ou recuperar um endereço com base nos dados fornecidos
export async function registraEndereco(tx, clienteId, logradouro, numero, bairro, cidade, cep, complemento) {
  const existente = await tx.endereco.findFirst({
    where: { cliente_id: clienteId, logradouro, numero, ativo: true }
  });

  if (existente) return existente;
  
  return tx.endereco.create({
    data: { id: nanoid(12), cliente_id: clienteId, logradouro, numero, bairro, cidade, cep, complemento }
  });
}

export async function validaItens(tx, itens) {
  if (!Array.isArray(itens)) {
    const error = new Error("O carrinho de itens deve ser uma lista (array)");
    error.statusCode = 400;
    throw error;
  }
  
  for (const item of itens) {
    if (!item.produto_id || typeof item.produto_id !== 'string') {
      const error = new Error("'produto_id' ausente ou inválido em um dos itens do pedido");
      error.statusCode = 400;
      throw error;
    }
    
    // Garante que a quantidade existe, é um número e é maior que zero
    if (!item.quantidade || typeof item.quantidade !== 'number' || item.quantidade <= 0) {
      const error = new Error(`Quantidade inválida para o produto ${item.produto_id}`);
      error.statusCode = 400;
      throw error;
    }
  }

  const idsProdutos = itens.map(item => item.produto_id);
  
  // Busca no banco apenas os produtos que o usuário está tentando comprar
  const produtosNoBanco = await tx.produto.findMany({
    where: { id: { in: idsProdutos } }
  });

  // Se a quantidade de produtos achados for diferente da quantidade enviada, tem ID fantasma/falso no carrinho!
  if (produtosNoBanco.length !== itens.length) {
    const error = new Error("Um ou mais produtos selecionados não existem no cardápio");
    error.statusCode = 400;
    throw error;
  }

  // Retorna os itens validados e preenchidos com os dados do produto
  return itens.map(item => {
    const produtoBanco = produtosNoBanco.find(p => p.id === item.produto_id);
    
    return {
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      nome: produtoBanco.nome,              
      descricao: produtoBanco.descricao,    
      preco_unitario: Number(produtoBanco.preco_unitario) 
    };
  });
}
// Função para calcular o total do pedido com base nos itens e taxa de entrega
export function calculaTotal(itens, taxa = 5, pedidoId) {
  const itensMapeados = itens.map(item => ({
    id: nanoid(12),
    pedido_id: pedidoId,
    produto_id: item.produto_id || null,
    nome_snapshot: item.nome,
    descricao_snapshot: item.descricao || null,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    subtotal: item.quantidade * item.preco_unitario
  }));
 
  const totalGeral = itensMapeados.reduce((acc, item) => acc + item.subtotal, Number(taxa));
 
  return { itensMapeados, totalGeral };
}

// Função para calcular a taxa de entrega com base no bairro do cliente
export function calculaTaxaEntrega(bairro) {
  const taxaBase = 5.00; // Taxa base para bairros não listados
  if (!bairro) return taxaBase;
 
  const bairroFormatado = bairro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
 
  const tabela = {
    "santo antonio":          0.00,
    "nova betania":           3.00,
    "centro":                 4.00,
    "lto do vale":            6.00,
    "maria auxiliadora":      5.50,
    "padre jose cruza":       6.50,
    "boa vista":              7.00,
    "presidente costa silva": 8.00,
    "zona rural":            15.00
  };
 
  return tabela[bairroFormatado] ?? taxaBase;
}

// Fluxo de status do pedido
export const fluxoStatus = {
  pendente:   ["preparo", "cancelado"],
  preparo: ["pronto",    "cancelado"],
  pronto:     ["rota"],
  rota:    ["entregue"],
  entregue:   [],
  cancelado:  []
};

// Cargos autorizados para cada transição de status
export const cargosPorTransicao = {
  preparo: ["pizzaiolo", "gestor"],
  pronto:     ["pizzaiolo", "gestor"],
  rota:    ["entregador", "gestor"],
  entregue:   ["entregador", "gestor"],
  cancelado:  ["gestor"]
};

// Função para validar se a transição de status é permitida
export function validarTransicaoStatus(statusAtual, novoStatus) {
  const permitidos = fluxoStatus[statusAtual];

  if (!permitidos) {
    const erro = new Error(`Status atual '${statusAtual}' não reconhecido`);
    erro.status = 400;
    throw erro;
  }

  if (!permitidos.includes(novoStatus)) {
    const erro = new Error(`Transição inválida: pedido com status '${statusAtual}' não pode ir para '${novoStatus}'`);
    erro.status = 400;
    throw erro;
  }
}

// Função para validar se o usuário tem permissão para realizar a transição de status
export function validarPermissaoTransicao(novoStatus, cargo) {
  const autorizados = cargosPorTransicao[novoStatus];

  if (!autorizados) {
    const erro = new Error(`Status destino '${novoStatus}' não possui regra de permissão definida`);
    erro.status = 400;
    throw erro;
  }

  if (!autorizados.includes(cargo)) {
    const erro = new Error(`Você não tem permissão para atualizar o status do pedido para '${novoStatus}'`);
    erro.status = 403;
    throw erro;
  }
}