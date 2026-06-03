import { prisma } from "../config/database.js";
import { nanoid } from "nanoid";
import { 
  calcularStatusEstoque, 
  filtrarPorStatus, 
  ordenarIngredientes 
} from "../utils/IngredienteUtils.js";

export class IngredienteController {
  static async getIngredientes(req, res, next) {
    try {
      // Obter os parâmetros da query string
      const { status, ordem, campo } = req.query; 

      // Buscar os ingredientes no banco de dados
      const ingredientes = await prisma.ingrediente.findMany();
      
      // Adiciona o status de estoque a cada ingrediente
      const ingredientesComStatus = ingredientes.map(ing => ({
        ...ing,
        status: calcularStatusEstoque(ing.quantidade_atual, ing.estoque_minimo)
      }));

      // Aplica o filtro de status
      const ingredientesFiltrados = filtrarPorStatus(ingredientesComStatus, status);

      // Valida a coluna e aplica a ordenação
      const camposPermitidos = ['nome', 'quantidade_atual', 'estoque_minimo', 'preco_unitario'];
      const colunaValida = camposPermitidos.includes(campo) ? campo : 'nome';
      
      const resultadoFinal = ordenarIngredientes(ingredientesFiltrados, colunaValida, ordem);

      // Verifica se a lista final está vazia após os filtros e ordenação
      if (resultadoFinal.length === 0) { 
        return res.status(404).json({ message: "Nenhum ingrediente encontrado para essa busca." });
      }

      return res.status(200).json({  // Retorno dos dados para o cliente
        message: "Ingredientes listados com sucesso!",
        ingredientes: resultadoFinal 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async getIngredientesById(req, res, next) {
    try {
      const { id } = req.params; // Obter o ID do ingrediente a partir dos parâmetros da rota

      // Buscar o ingrediente no banco de dados pelo ID
      const ingrediente = await prisma.ingrediente.findUnique({ 
        where: { id: id }
      });

      if (!ingrediente) { // Erro caso o ingrediente não seja encontrado
        return res.status(404).json({ message: `Ingrediente com ID ${id} não encontrado` });
      }

      // Adiciona o status de estoque ao ingrediente encontrado
      const ingredienteComStatus = {
        ...ingrediente,
        status: calcularStatusEstoque(ingrediente.quantidade_atual, ingrediente.estoque_minimo)
      };

      return res.status(200).json({ 
        message: "Ingrediente encontrado com sucesso!",
        ingrediente: ingredienteComStatus 
      }); // Retorno dos dados para o cliente
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async createIngrediente(req, res, next) {
    try {
      const { nome, quantidade_atual, unidade_medida, estoque_minimo, preco_unitario } = req.body;

      if (!nome) { // Verificação de campos obrigatórios
        return res.status(400).json({ message: "O campo nome é obrigatório." });
      }

      // Criação do novo ingrediente no banco de dados
      const novoIngrediente = await prisma.ingrediente.create({
        data: {
          id: nanoid(12),
          nome,
          quantidade_atual: quantidade_atual ?? 0,
          unidade_medida: unidade_medida || "un",
          estoque_minimo: estoque_minimo ?? 0,
          preco_unitario: preco_unitario ?? 0
        }
      });

      return res.status(201).json({ // Retorno dos dados para o cliente
        message: "Ingrediente criado com sucesso!",
        ingrediente: novoIngrediente
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async updateIngrediente(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, quantidade_atual, estoque_minimo, preco_unitario, unidade_medida } = req.body;

      // Verificar se o ingrediente existe
      const ingrediente = await prisma.ingrediente.findUnique({ where: { id } });

      if (!ingrediente) {
        return res.status(404).json({ message: `Ingrediente com ID ${id} não encontrado` });
      }

      // Filtrar os campos que foram enviados no corpo da requisição
      const dadosParaAtualizar = {};
      if (nome !== undefined) dadosParaAtualizar.nome = nome;
      if (quantidade_atual !== undefined) dadosParaAtualizar.quantidade_atual = quantidade_atual;
      if (estoque_minimo !== undefined) dadosParaAtualizar.estoque_minimo = estoque_minimo;
      if (preco_unitario !== undefined) dadosParaAtualizar.preco_unitario = preco_unitario;
      if (unidade_medida !== undefined) dadosParaAtualizar.unidade_medida = unidade_medida;

      // Atualizar o ingrediente com os dados filtrados
      const ingredienteAtualizado = await prisma.ingrediente.update({
        where: { id },
        data: dadosParaAtualizar
      });

      return res.status(200).json({ // Retorno dos dados para o cliente
        message: "Ingrediente atualizado com sucesso!",
        ingrediente: ingredienteAtualizado
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async deleteIngrediente(req, res, next) {
    try {
      const { id } = req.params;

      // Verificar se o ingrediente existe
      const ingrediente = await prisma.ingrediente.findUnique({ where: { id } });

      if (!ingrediente) { // Erro caso o ingrediente não seja encontrado
        return res.status(404).json({ message: `Ingrediente com ID ${id} não encontrado` });
      }

      // Verificar se o ingrediente está sendo usado em algum produto
      const emUso = await prisma.produtoIngrediente.findFirst({
        where: { ingrediente_id: id }
      });

      if (emUso) {
        return res.status(400).json({ 
          message: "Este ingrediente não pode ser deletado porque está sendo usado em uma ou mais receitas" 
        });
      }

      // Deletar o ingrediente do banco de dados
      await prisma.ingrediente.delete({ where: { id } });

      return res.status(200).json({ // Retorno dos dados para o cliente
        message: `Ingrediente ${ingrediente.nome} deletado com sucesso!` 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
}