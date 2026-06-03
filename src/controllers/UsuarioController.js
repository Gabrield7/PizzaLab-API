import { prisma } from "../config/database.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class UsuarioController {
  static async login(req, res, next) {
    try {
      const { email, senha } = req.body;

      // Validação básica de entrada
      if (!email || !senha) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      }

      const usuario = await prisma.usuario.findUnique({ where: { email } });

      if (!usuario) return res.status(401).json({ error: "E-mail ou senha incorretos" });

      if (!usuario.ativo) {
        return res.status(403).json({ 
          error: "Sua conta está inativa. Por favor, entre em contato com o gerente do PizzaLab." 
        });
      }

      // Valida se a senha digitada bate com a do banco
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Gera o token JWT com o ID e cargo do usuário
      const token = jwt.sign( 
        { id: usuario.id, cargo: usuario.cargo }, 
        process.env.JWT_SECRET, // Assina o token com a chave secreta definida no arquivo .env
        { expiresIn: "8h" } // O token expira em 8 horas
      );

      delete usuario.senha; // evita enviar hash da senha para o cliente

      return res.status(200).json({ // Retorno dos dados para o cliente
        message: "Login efetuado com sucesso!",
        usuario,
        token
      });

    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async getUsuarios(req, res, next) {
    try {
      const { cargo, ordem, campo } = req.query;

      const queryConfig = {
        where: { ativo: true },
        orderBy: {}
      };
 
      if (cargo) {
        queryConfig.where.cargo = cargo;
      }
 
      const camposPermitidos = ["nome", "data_criacao"];
      const campoOrdenacao = camposPermitidos.includes(campo) ? campo : "nome";
      const direcaoOrdenacao = ordem === "desc" ? "desc" : "asc";
 
      queryConfig.orderBy[campoOrdenacao] = direcaoOrdenacao;
 
      const usuarios = await prisma.usuario.findMany(queryConfig);
 
      if (usuarios.length === 0) {
        return res.status(404).json({ message: "Nenhum usuário cadastrado no momento" });
      }
 
      return res.status(200).json({ 
        message: "Usuários listados com sucesso!",
        usuarios 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async getUsuarioById(req, res, next) {
    try {
      const { id } = req.params;

      const usuario = await prisma.usuario.findUnique({
        where: { id: id }
      });

      if (!usuario) {
        return res.status(404).json({ message: `Usuário com ID ${id} não encontrado` });
      }

      return res.status(200).json({ 
        message: `Usuário encontrado com sucesso!`, 
        usuario
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async createUsuario(req, res, next) {
    try {
      const { nome, email, telefone, cargo } = req.body;

      if (!nome || !email || !cargo) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios ausentes' 
        });
      }

      const senhaTemporaria = nanoid(8);
      const SALT_ROUNDS = 10;
      const senhaCriptografada = await bcrypt.hash(senhaTemporaria, SALT_ROUNDS);
      // Sanitiza o telefone se ele tiver sido enviado
      const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

      const novoUsuario = await prisma.usuario.create({
        data: {
          id: nanoid(12),
          nome,
          email,
          senha: senhaCriptografada,
          telefone: telefoneLimpo,
          cargo
        }
      });

      // Retorna para o usuário a "senhaTemporaria" em texto limpo APENAS nesta resposta HTTP, para que ele possa anotar e usar no primeiro acesso. Depois disso, só a senha criptografada ficará salva no banco de dados.
      return res.status(201).json({
        ...novoUsuario,
        senha_temporaria: senhaTemporaria 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async updateUsuario(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, email, telefone, cargo, ativo } = req.body;
      const { cargo: logadoCargo } = req.usuarioLogado;

      // Verificar se o usuário existe
      const usuario = await prisma.usuario.findUnique({ where: { id } });

      if (!usuario) {
        return res.status(404).json({ message: `Usuário com ID ${id} não encontrado` });
      }

      // Atualizar o produto no banco de dados
      const dadosParaAtualizar = {};

      if (nome !== undefined) dadosParaAtualizar.nome = nome;
      if (email !== undefined) dadosParaAtualizar.email = email;
      if (telefone !== undefined) dadosParaAtualizar.telefone = telefone;

      if (logadoCargo === "gestor") {
        if (cargo !== undefined) dadosParaAtualizar.cargo = cargo;
        if (ativo !== undefined) dadosParaAtualizar.ativo = ativo;
      }

      // Salva os dados atualizados do usuário no banco de dados
      const usuarioAtualizado = await prisma.usuario.update({
        where: { id },
        data: dadosParaAtualizar
      });

      return res.status(200).json({ // Retorno dos dados para o cliente
        message: `Usuário ${id} atualizado com sucesso!`, 
        usuario: usuarioAtualizado 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async deleteUsuario(req, res, next) {
    try {
      const { id } = req.params;

      // Verificar se o usuário existe
      const usuario = await prisma.usuario.findUnique({ where: { id } });

      if (!usuario) {
        return res.status(404).json({ message: `Usuário com ID ${id} não encontrado` });
      }

      await prisma.usuario.update({ // Desativa o usuário no banco de dados
        where: { id },
        data: { ativo: false }
      });

      return res.status(200).json({ // Retorno dos dados para o cliente
        message: `Usuário ${usuario.nome} desativado com sucesso!`, 
      });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }

  static async updateSenha(req, res, next) {
    try {
      const { id } = req.params;
      const { senha_atual, nova_senha } = req.body;

      if (!senha_atual || !nova_senha) { // Validação simples para garantir que ambos os campos sejam enviados
        return res.status(400).json({ error: "Informe a senha atual e a nova senha" });
      }
      
      // Busca o usuário para validar a senha atual
      const usuario = await prisma.usuario.findUnique({ where: { id } });

      if (!usuario || !usuario.ativo) {
        return res.status(404).json({ message: "Usuário não encontrado ou inativo" });
      }

      // Valida se a senha atual digitada bate com a do banco
      if (usuario.senha !== senha_atual) {
        return res.status(401).json({ error: "A senha atual digitada está incorreta" });
      }

      const senhaValida = await bcrypt.compare(senha_atual, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "A senha atual digitada está incorreta" });
      }

      // Criptografa a nova senha com o hash do bcrypt
      const saltRounds = 10;
      const novaSenhaCriptografada = await bcrypt.hash(nova_senha, saltRounds);

      await prisma.usuario.update({ // Atualiza para a nova senha
        where: { id },
        data: { senha: novaSenhaCriptografada }
      });

      return res.status(200).json({ message: "Senha alterada com sucesso!" });
    } catch (error) {
      next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
}
