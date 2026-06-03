import { Router } from "express";
import { ProdutoController } from "../controllers/ProdutoController.js";
import { authUsuario, permitirCargos } from "../middlewares/authMiddleware.js";

const router = Router();

router.get('/', ProdutoController.getProdutos);
router.get('/:id', ProdutoController.getProdutosById);

router.post('/', 
  authUsuario, 
  permitirCargos("gestor"),
  ProdutoController.createProduto
);

router.put('/:id', 
  authUsuario, 
  permitirCargos("gestor"),
  ProdutoController.updateProduto
);

router.delete('/:id', 
  authUsuario, 
  permitirCargos("gestor"),
  ProdutoController.deleteProduto
);

export default router;