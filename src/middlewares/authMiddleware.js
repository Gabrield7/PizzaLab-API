import jwt from "jsonwebtoken";

export function authUsuario(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Acesso negado. Token de acesso não fornecido" });
  }

  // O header vem no formato: "Bearer TOKEN_STRING"
  const partes = authHeader.split(" ");
  if (partes.length !== 2 || partes[0] !== "Bearer") {
    return res.status(401).json({ error: "Acesso negado. Credenciais de autenticação inválidas ou mal formatadas" });
  }

  const token = partes[1];

  try {
    // Valida o token com a chave secreta
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    
    // Injeta os dados do usuário decodificados dentro da requisição
    req.usuarioLogado = {
      id: decodificado.id,
      cargo: decodificado.cargo ?? decodificado.role
    };

    return next(); // Continua para o próximo middleware ou rota
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

export function permitirCargos(...cargosPermitidos) {
  return (req, res, next) => {
    // Verifica se o middleware de autenticação já injetou os dados do usuário na requisição
    if (!req.usuarioLogado) {
      return res.status(500).json({ error: "Erro interno: Falha na validação de identidade" });
    }

    const { cargo } = req.usuarioLogado;

    // Verifica se o cargo do usuário está incluso nos cargos permitidos para a rota
    if (!cargosPermitidos.includes(cargo)) {
      return res.status(403).json({ 
        error: `Acesso negado. Cheque a informação com alguém autorizado` 
      });
    }

    return next(); // Continua para o próximo middleware ou rota
  };
}
// Permite acesso se o usuário for gestor ou se for o próprio dono do recurso (comparando o ID do token com o ID da URL)
export function gestorOuProprioUsuario(req, res, next) {
  const { id: logadoId, cargo } = req.usuarioLogado;

  if (!req.params.id) {
    return res.status(500).json({ error: "Erro interno: configuração inválida de rota" });
  }

  if (cargo === "gestor" || logadoId === req.params.id) {
    return next();
  }

  return res.status(403).json({
    error: "Acesso negado. Você não possui permissão para acessar ou modificar este recurso"
  });
}

// Bloqueia qualquer acesso em que o usuário logado não seja o dono do recurso
export function apenasProprioUsuario(req, res, next) {
  if (!req.params.id) {
    return res.status(500).json({ error: "Erro interno: configuração inválida de rota" });
  }

  const { id: logadoId } = req.usuarioLogado;

  if (logadoId === req.params.id) return next();

  return res.status(403).json({
    error: "Acesso negado. Cada usuário pode alterar apenas sua própria senha"
  });
}

// export function verificarPosse(req, res, next) {
//   const idUrl = req.params.id; // O ID que está na rota
//   const { id: logadoId, cargo: logadoCargo } = req.usuarioLogado; // Quem está logado

//   if (!req.params.id) {
//     console.error("'verificarPosse' aplicado em rota sem parâmetro :id");
//     return res.status(500).json({ error: "Erro interno: configuração inválida de rota" });
//   }
//   // Usuário comum só pode acessar ou modificar seus próprios dados
//   // O ID da URL deve bater com o ID do token
//   if (logadoId === req.params.id) return next();

//   // Se não for o gestor e o ID não bater, o acesso é sumariamente bloqueado
//   return res.status(403).json({ 
//     error: "Acesso negado. Você não possui permissão para acessar ou modificar este recurso" 
//   });
// }
