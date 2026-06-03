import { nanoid } from "nanoid";
// Função para salvar os ingredientes de um produto
export async function salvarIngredientes(tx, produtoId, ingredientes) {
  // Valida se a lista de ingredientes é um array válido
  if (ingredientes === undefined || !Array.isArray(ingredientes)) return;

  // Remove os vínculos antigos entre o produto e os ingredientes
  await tx.produtoIngrediente.deleteMany({
    where: { produto_id: produtoId }
  });

  if (ingredientes.length > 0) {
    const idsEnviados = ingredientes.map(item => item.id);

    // Busca no banco apenas os IDs que combinam com os enviados
    const existentes = await tx.ingrediente.findMany({
      where: { id: { in: idsEnviados } },
      select: { id: true }
    });

    // Se o banco achou menos ingredientes do que o usuário mandou, tem ID inválido!
    if (existentes.length !== idsEnviados.length) {
      const erro = new Error("Um ou mais ingredientes informados não existem no sistema");
      erro.status = 400;
      throw erro;
    }
  }

  // Cria os novos vínculos entre o produto e os ingredientes, se houver ingredientes para salvar
  if (ingredientes.length > 0) {
    await tx.produtoIngrediente.createMany({
      data: ingredientes.map(item => ({
        id: nanoid(12),
        produto_id: produtoId,
        ingrediente_id: item.id,
        quantidade: item.quantidade // Mantém o peso padrão fixo que combinamos
      }))
    });
  }
}