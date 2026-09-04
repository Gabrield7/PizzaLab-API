import { Router } from "express";
import { PedidosController } from "../controllers/PedidoController.js";
import { authUsuario, permitirCargos } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", PedidosController.createPedido);
router.get('/painel', authUsuario, PedidosController.getPedidosParaPainel);

router.patch('/:id/status', 
  authUsuario,
  permitirCargos("gestor", "pizzaiolo", "entregador"), 
  PedidosController.updateStatus
);

export default router;