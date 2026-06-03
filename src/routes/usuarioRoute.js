import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController.js";
import { authUsuario, permitirCargos, verificarPosse } from "../middlewares/authMiddleware.js";

const router = Router();

router.post('/login', UsuarioController.login);

router.get("/", 
  authUsuario, 
  permitirCargos("gestor"), 
  UsuarioController.getUsuarios
);

router.get("/:id", 
  authUsuario, 
  permitirCargos("gestor"), 
  UsuarioController.getUsuarioById
);

router.post("/", 
  authUsuario, 
  permitirCargos("gestor"), 
  UsuarioController.createUsuario
);

router.put("/:id", 
  authUsuario, 
  permitirCargos("gestor", "pizzaiolo", "entregador"), 
  verificarPosse,
  UsuarioController.updateUsuario
);

router.put("/:id/alterar-senha", 
  authUsuario, 
  permitirCargos("gestor", "pizzaiolo", "entregador"), 
  verificarPosse,
  UsuarioController.updateSenha
);

router.delete("/:id", 
  authUsuario, 
  permitirCargos("gestor"), 
  UsuarioController.deleteUsuario
);

export default router;