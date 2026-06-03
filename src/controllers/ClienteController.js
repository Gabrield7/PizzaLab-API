import { prisma } from '../config/database.js';
import jwt from 'jsonwebtoken';

export class ClienteController {
  static async sendCodigoVerificacao(req, res, next) {
    try {
      const { telefone } = req.body;
      
      if (!telefone) return res.status(400).json({ error: "Número de telefone não fornecido" });

      const telefoneLimpo = telefone.replace(/\D/g, "");
      const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const expiracao = Date.now() + 300 * 1000; // 5 minutos

      // Token de uso único para validar o código posteriormente
      const tokenTemporario = jwt.sign(
        { telefone: telefoneLimpo, codigoOTP, expiracao },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      const resposta = { message: "Código enviado!", token_temporario: tokenTemporario };
      if (process.env.NODE_ENV !== "production") resposta.codigo_teste = codigoOTP;

      return res.status(200).json(resposta);
    } catch (error) {
      next(error);
    }
  }
 
  static async validateCodigo(req, res, next) {
    try {
      const { codigo, tokenTemporario } = req.body;

      if (!codigo || !tokenTemporario) {
        return res.status(400).json({ error: "Código e/ou token não fornecidos" });
      }

      // Decodifica os dados do token temporário
      const dadosTemporarios = jwt.verify(tokenTemporario, process.env.JWT_SECRET);

      if (Date.now() > dadosTemporarios.expiracao) { // Verifica se o token expirou
        return res.status(401).json({ error: "Código de verificação expirado" });
      }

      if (dadosTemporarios.codigoOTP !== codigo) { // Verifica se o código OTP é válido
        return res.status(401).json({ error: "Código de verificação inválido" });
      }

      // 
      const cliente = await prisma.cliente.findUnique({
        where: { telefone: dadosTemporarios.telefone },
        include: { endereco: { where: { ativo: true } } }
      });

      // Gera um token de acesso para o cliente
      const tokenAcesso = jwt.sign(
        { telefone: dadosTemporarios.telefone, role: "cliente" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      if (!cliente) {
        return res.status(200).json({
          existe: false,
          message: "Telefone validado. Por favor, informe seus dados para o primeiro pedido",
          token: tokenAcesso,
          telefone: dadosTemporarios.telefone
        });
      }

      // Se o cliente JÁ EXISTE, devolvemos os dados dele para o front preencher a tela
      return res.status(200).json({
        existe: true,
        message: "Autenticado com sucesso!",
        token: tokenAcesso,
        cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone },
        enderecos: cliente.endereco
      });
    } catch (error) {
      next(error);
    }
  }

  static async disableEndereco(req, res, next) {
    try {
      const { id } = req.params;
      const clienteIdLogado = req.usuarioLogado.id;

      // 
      const endereco = await prisma.endereco.findFirst({ 
        where: { 
          id: id,
          cliente_id: clienteIdLogado
        } 
      });

      if (!endereco?.ativo) {
        return res.status(404).json({ 
          message: `Endereço não encontrado ou inativo` 
        });
      }

      await prisma.endereco.updateMany({ 
        where: { 
          id: id, 
          cliente_id: clienteIdLogado 
        }, 
        data: { 
          ativo: false 
        } 
      });

      return res.status(200).json({ 
        message: 'Endereço desativado com sucesso' 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
}
