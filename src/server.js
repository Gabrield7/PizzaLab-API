import express from 'express';
import routes from './routes/index.js';
import { authErros } from './middlewares/authErros.js';
import { seedGestor } from '../prisma/seed.js';

const app = express();

app.use(express.json());

app.use(routes);

app.use(authErros);

// Roda o seed antes de abrir o servidor
await seedGestor();

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});



