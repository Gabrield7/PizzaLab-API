import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

export async function seedGestor() {
  const email = "gestor@pizzalab.com";

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });

  if (jaExiste) {
    console.log("Gestor já cadastrado. Seed ignorado.");
    return;
  }

  const senhaTemporaria = "gestor@123";
  const senhaCriptografada = await bcrypt.hash(senhaTemporaria, 10);

  await prisma.usuario.create({
    data: {
      id: nanoid(12),
      nome: "Administrador",
      email,
      senha: senhaCriptografada,
      cargo: "gestor"
    }
  });
}