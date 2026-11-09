import { describe, test, expect, jest } from "@jest/globals";
import { validaItens } from "./PedidoUtils.js";

// Cria um "tx" falso: um objeto que imita o cliente do Prisma.
// jest.fn() cria uma função espiã, que registra como foi chamada,
// e mockResolvedValue define o que ela devolve (como uma Promise).
function criaTxFalso(produtosNoBanco) {
  return {
    produto: {
      findMany: jest.fn().mockResolvedValue(produtosNoBanco),
    },
  };
}

const produtoMargherita = {
  id: "prod-1",
  nome: "Margherita",
  descricao: "Molho e queijo",
  preco_unitario: "40.00", // o Prisma devolve Decimal como string
};

const produtoGuarana = {
  id: "prod-2",
  nome: "Guarana",
  descricao: null,
  preco_unitario: "8.50",
};

describe("validaItens: entrada inválida (nem chega ao banco)", () => {
  test("rejeita quando itens não é uma lista", async () => {
    const tx = criaTxFalso([]);

    await expect(validaItens(tx, "pizza")).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.produto.findMany).not.toHaveBeenCalled();
  });

  test("rejeita item sem produto_id", async () => {
    const tx = criaTxFalso([]);

    await expect(validaItens(tx, [{ quantidade: 1 }])).rejects.toThrow(/produto_id/);
    expect(tx.produto.findMany).not.toHaveBeenCalled();
  });

  test("rejeita produto_id que não é texto", async () => {
    const tx = criaTxFalso([]);

    await expect(validaItens(tx, [{ produto_id: 123, quantidade: 1 }])).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test.each([
    ["zero", 0],
    ["negativa", -2],
    ["texto", "2"],
    ["ausente", undefined],
  ])("rejeita quantidade %s", async (_descricao, quantidade) => {
    const tx = criaTxFalso([]);

    await expect(
      validaItens(tx, [{ produto_id: "prod-1", quantidade }])
    ).rejects.toThrow(/Quantidade inválida/);
    expect(tx.produto.findMany).not.toHaveBeenCalled();
  });
});

describe("validaItens: consulta ao banco", () => {
  test("rejeita quando algum produto não existe no cardápio", async () => {
    // O banco só conhece 1 dos 2 produtos pedidos
    const tx = criaTxFalso([produtoMargherita]);
    const itens = [
      { produto_id: "prod-1", quantidade: 1 },
      { produto_id: "fantasma", quantidade: 1 },
    ];

    await expect(validaItens(tx, itens)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/não existem no cardápio/),
    });
  });

  test("busca no banco apenas os ids enviados no pedido", async () => {
    const tx = criaTxFalso([produtoMargherita]);

    await validaItens(tx, [{ produto_id: "prod-1", quantidade: 1 }]);

    expect(tx.produto.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["prod-1"] } },
    });
  });

  test("devolve os itens preenchidos com os dados do banco", async () => {
    const tx = criaTxFalso([produtoGuarana, produtoMargherita]); // ordem diferente do pedido
    const itens = [
      { produto_id: "prod-1", quantidade: 2 },
      { produto_id: "prod-2", quantidade: 1 },
    ];

    const resultado = await validaItens(tx, itens);

    expect(resultado).toEqual([
      {
        produto_id: "prod-1",
        quantidade: 2,
        nome: "Margherita",
        descricao: "Molho e queijo",
        preco_unitario: 40, // convertido de string para número
      },
      {
        produto_id: "prod-2",
        quantidade: 1,
        nome: "Guarana",
        descricao: null,
        preco_unitario: 8.5,
      },
    ]);
  });
});