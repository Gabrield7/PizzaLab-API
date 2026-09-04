import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { authErros } from './middlewares/authErros.js';
import { seedGestor } from '../prisma/seed.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Origens autorizadas a chamar a API — o front na Vercel entra aqui.
// FRONTEND_URL vem do .env; localhost fica liberado pro desenvolvimento.
const origensPermitidas = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);

app.use(cors({ origin: origensPermitidas }));
app.use(express.json());

app.use(routes);

app.use(authErros);

// Roda o seed antes de abrir o servidor
await seedGestor();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});