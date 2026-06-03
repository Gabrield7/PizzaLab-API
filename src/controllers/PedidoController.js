import { prisma } from '../config/database.js';
import { nanoid } from 'nanoid';
import { 
  calculaTotal, 
  calculaTaxaEntrega,
  validaItens,
  validarTransicaoStatus,
  validarPermissaoTransicao,
  registraCliente, 
  registraEndereco 
} from '../utils/PedidoUtils.js';
import { pedido_status } from "@prisma/client";
export class PedidosController {
  static async getPedidosParaPainel(req, res, next) { // Listar pedidos no painel, com filtros baseados no cargo do usuário logado
    try {
      const { cargo: usuarioCargo } = req.usuarioLogado;

      const queryConfig = { // Configuração base da consulta, sem filtros iniciais
        where: {},
        include: { itens_pedido: { include: { produto: true } }},
        orderBy: { data_pedido: "asc" } 
      };

      // Aplicação de filtros com base no cargo do usuário para limitar os pedidos visíveis
      switch (usuarioCargo) {
        case "gestor":
          queryConfig.orderBy = { data_pedido: "desc" };
          break;

        case "pizzaiolo":
          queryConfig.where.status = { in: ["pendente", "preparo", "pronto"] };
          break;

        case "entregador":
          queryConfig.where.status = { in: ["pronto", "rota", "entregue"] };
          break;

        default:
          return res.status(403).json({ error: "Cargo não reconhecido pelo painel." });
      }

      const pedidos = await prisma.pedido.findMany(queryConfig);

      if (pedidos.length === 0) {
        return res.status(404).json({ message: "Nenhum pedido encontrado" });
      }

      return res.status(200).json({pedidos});

    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
  
  static async createPedido(req, res, next) {
    try {
      const {
        telefone,
        nome,
        logradouro,
        numero,
        bairro,
        cidade,
        cep,
        complemento,
        observacoes,
        itens
      } = req.body;

      // Validação básica dos dados obrigatórios do checkout
      if (!telefone || !nome || !logradouro || !bairro || !numero || itens?.length === 0) {
        return res.status(400).json({ error: "Dados obrigatórios do pedido estão ausentes" });
      }

      const pedidoId = nanoid(12);
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const taxaEntrega = calculaTaxaEntrega(bairro);

      const novoPedido = await prisma.$transaction(async (tx) => {
        // Valida os itens do pedido e calcula o total
        const itensValidados = await validaItens(tx, itens); 
        const { itensMapeados, totalGeral } = calculaTotal(itensValidados, taxaEntrega, pedidoId);
        // console.log("taxaEntrega:", taxaEntrega);

        // console.log(
        //   JSON.stringify(itensMapeados, null, 2)
        // );

        // console.log("totalGeral:", totalGeral);
        // Registro invisível do cliente e endereço
        const cliente = await registraCliente(tx, nome, telefoneLimpo);
        const endereco = await registraEndereco(tx, cliente.id, logradouro, numero, bairro, cidade, cep, complemento);

        const pedidoCriado = await tx.pedido.create({
          data: {
            id: pedidoId,
            cliente_id: cliente.id,
            endereco_id: endereco.id,
            // Snapshots - preservam os dados no momento da compra
            cliente_nome: nome,
            cliente_telefone: telefoneLimpo,

            entrega_logradouro: logradouro,
            entrega_numero: numero,
            entrega_bairro: bairro,
            entrega_cidade: cidade,
            entrega_cep: cep,
            entrega_complemento: complemento,

            status: "pendente",
            taxa_entrega: taxaEntrega,
            valor_total: totalGeral,
            observacoes
          }
        });

        // Grava os itens em lote no banco
        await tx.itemPedido.createMany({ data: itensMapeados });

        return pedidoCriado;
      });

      return res.status(201).json({
        message: "Pedido gerado com sucesso no PizzaLab!",
        pedido: novoPedido
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { novo_status } = req.body;
      const { cargo } = req.usuarioLogado;
 
      const pedido = await prisma.pedido.findUnique({ where: { id } });
 
      if (!pedido) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }
 
      // Lança erro com status HTTP se a transição ou permissão for inválida
      validarTransicaoStatus(pedido.status, novo_status);
      validarPermissaoTransicao(novo_status, cargo);

      console.log(pedido_status);
 
      const pedidoAtualizado = await prisma.pedido.update({
        where: { id },
        data: { status: novo_status }
      });
 
      return res.status(200).json({
        message: `Status do pedido atualizado para '${novo_status}' com sucesso!`,
        pedido: pedidoAtualizado
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
}

