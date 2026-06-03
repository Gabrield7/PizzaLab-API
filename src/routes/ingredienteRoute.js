import { Router } from "express";
import { IngredienteController } from "../controllers/IngredienteController.js";
import { authUsuario, permitirCargos } from "../middlewares/authMiddleware.js";

const router = Router();

router.get('/', 
  authUsuario,
  permitirCargos("gestor", "pizzaiolo"),
  IngredienteController.getIngredientes
);

router.get('/:id', 
  authUsuario,
  permitirCargos("gestor", "pizzaiolo"),
  IngredienteController.getIngredientesById
);

router.post('/', 
  authUsuario,
  permitirCargos("gestor"),
  IngredienteController.createIngrediente
);

router.put('/:id', 
  authUsuario,
  permitirCargos("gestor"),
  IngredienteController.updateIngrediente
);

router.delete('/:id', 
  authUsuario,
  permitirCargos("gestor"),
  IngredienteController.deleteIngrediente
);

export default router;