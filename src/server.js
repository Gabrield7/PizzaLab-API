import express from 'express';
import routes from './routes/index.js';
import { authErros } from './middlewares/authErros.js';
import { seedGestor } from '../prisma/seed.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

app.use(routes);

app.use(authErros);

// Roda o seed antes de abrir o servidor
await seedGestor();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});



