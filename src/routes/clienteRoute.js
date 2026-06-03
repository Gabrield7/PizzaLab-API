import { Router } from 'express';
import { ClienteController } from '../controllers/ClienteController.js';
import { authUsuario } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/enviar-otp', ClienteController.sendCodigoVerificacao);
router.post('/validar-otp', ClienteController.validateCodigo);
router.patch('/enderecos/:id/desativar', authUsuario, ClienteController.disableEndereco);

export default router;