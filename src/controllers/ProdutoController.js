import { prisma } from "../config/database.js";
import { nanoid } from "nanoid";
import { salvarIngredientes } from "../utils/ReceitaUtils.js";

export class ProdutoController {
  static async getProdutos(req, res, next) {
    try {
      const { categoria, ordem, campo } = req.query;
 
      const queryConfig = {
        where: { ativo: true },
        orderBy: {}
      };
 
      if (categoria) {
        queryConfig.where.categoria = categoria;
      }
 
      // Permite retornar os ingredientes associados ao produto
      queryConfig.include = {
        produto_ingrediente: {
          include: { ingrediente: true }
        }
      };
 
      const camposPermitidos = ["nome", "preco_unitario"];
      const campoOrdenacao = camposPermitidos.includes(campo) ? campo : "nome";
      const direcaoOrdenacao = ordem === "desc" ? "desc" : "asc";
 
      queryConfig.orderBy[campoOrdenacao] = direcaoOrdenacao;
 
      const produtos = await prisma.produto.findMany(queryConfig);
 
      if (produtos.length === 0) {
        return res.status(404).json({ message: "Nenhum produto cadastrado no momento." });
      }
 
      return res.status(200).json({ 
        message: "Produtos listados com sucesso!",
        produtos 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async getProdutosById(req, res, next) {
    try {
      const { id } = req.params; // Obter o ID do produto a partir dos parâmetros da rota

      // Buscar o produto no banco de dados pelo ID
      const produto = await prisma.produto.findUnique({ 
        where: { id: id },
        include: {
          produto_ingrediente: {
            include: { ingrediente: true }
          }
        }
      });

      if (!produto) { // Erro caso o produto não seja encontrado
        return res.status(404).json({ message: `Produto com ID ${id} não cadastrado` });
      }

      // Retorno dos dados para o cliente
      return res.status(200).json({ 
        message: `Produto encontrado com sucesso!`, 
        produto 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async createProduto(req, res, next) {
    try {
      const { nome, preco, descricao, categoria, imagem, ingredientes } = req.body;

      if (!nome || !preco || !descricao || !categoria) { // Verificação de campos obrigatórios
        return res.status(400).json({ error: "Campos obrigatórios ausentes" });
      }

      // Valida se a lista de ingredientes é um array válido
      if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
        return res.status(400).json({ error: "O campo ingredientes deve ser uma lista e conter ao menos um item" });
      }
      // Inicia transação para garantir que a criação do produto e o salvamento dos ingredientes sejam atômicos
      const novoProduto = await prisma.$transaction(async (tx) => {
        const produto = await tx.produto.create({
          data: {
            id: nanoid(12),
            nome,
            preco_unitario: preco ?? 0,
            descricao,
            categoria,
            imagem_url: imagem || null,
            ativo: true
          }
        });

        // Salva os ingredientes associados ao produto
        await salvarIngredientes(tx, produto.id, ingredientes);

        return produto;
      });

      return res.status(201).json({ // Retorno dos dados para o cliente
        message: "Produto criado com sucesso!",
        produto: novoProduto
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async updateProduto(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, preco, descricao, categoria, imagem, ativo, ingredientes } = req.body;

      // Verificar se o produto existe
      const produto = await prisma.produto.findUnique({ where: { id } });

      if (!produto) {
        return res.status(404).json({ message: `Produto com ID ${id} não encontrado` });
      }

      // Atualizar o produto no banco de dados
      const dadosParaAtualizar = {};

      if (nome !== undefined) dadosParaAtualizar.nome = nome;
      if (preco !== undefined) dadosParaAtualizar.preco_unitario = preco;
      if (descricao !== undefined) dadosParaAtualizar.descricao = descricao;
      if (categoria !== undefined) dadosParaAtualizar.categoria = categoria;
      if (imagem !== undefined) dadosParaAtualizar.imagem_url = imagem || null;
      if (ativo !== undefined) dadosParaAtualizar.ativo = ativo;

      const produtoAtualizado = await prisma.$transaction(async (tx) => {
        // Atualiza os dados normais do produto
        const atualizado = await tx.produto.update({
          where: { id },
          data: dadosParaAtualizar
        });
        
        if (ingredientes !== undefined) {
          if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
            throw new Error("O campo ingredientes deve ser uma lista válida");
          }

          await salvarIngredientes(tx, id, ingredientes);
        }

        return atualizado;
      });

      return res.status(200).json({ 
        message: `Produto ${id} atualizado com sucesso!`, 
        produto: produtoAtualizado 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async deleteProduto(req, res, next) {
    try {
      const { id } = req.params;

      // Verificar se o produto existe
      const produto = await prisma.produto.findUnique({ where: { id } });

      if (!produto) { // Erro caso o produto não seja encontrado
        return res.status(404).json({ message: `Produto com ID ${id} não encontrado` });
      }

      await prisma.produto.update({ // Desativa o produto no banco de dados
        where: { id },
        data: { ativo: false }
      });

      return res.status(200).json({ // Retorno dos dados para o cliente
        message: `Produto ${produto.nome} desativado com sucesso!`, 
      });

    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
}
  
