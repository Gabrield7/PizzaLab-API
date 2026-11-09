import { describe, test, expect } from "@jest/globals";
import {
  calculaTotal,
  calculaTaxaEntrega,
  validarTransicaoStatus,
  validarPermissaoTransicao,
} from "../../src/utils/PedidoUtils.js";

// Roda a função e devolve o erro lançado (ou undefined se não lançou nada).
// Serve para conferir propriedades do erro, como o status HTTP.
function capturaErro(fn) {
  try {
    fn();
  } catch (erro) {
    return erro;
  }
}

describe("calculaTotal", () => {
  const itens = [
    { produto_id: "prod-1", nome: "Margherita", descricao: "Molho e queijo", quantidade: 2, preco_unitario: 40 },
    { produto_id: "prod-2", nome: "Guarana", quantidade: 1, preco_unitario: 8.5 },
  ];

  test("calcula o subtotal de cada item (quantidade x preço)", () => {
    const { itensMapeados } = calculaTotal(itens, 0, "pedido-123");

    expect(itensMapeados[0].subtotal).toBe(80);
    expect(itensMapeados[1].subtotal).toBe(8.5);
  });

  test("soma os subtotais e a taxa de entrega no total", () => {
    const { totalGeral } = calculaTotal(itens, 3, "pedido-123");

    expect(totalGeral).toBe(91.5); // 80 + 8.5 + 3
  });

  test("usa taxa de 5 quando a taxa não é informada", () => {
    const { totalGeral } = calculaTotal(itens, undefined, "pedido-123");

    expect(totalGeral).toBe(93.5); // 80 + 8.5 + 5
  });

  test("copia os dados do produto como snapshot e vincula ao pedido", () => {
    const { itensMapeados } = calculaTotal(itens, 0, "pedido-123");

    expect(itensMapeados[0]).toMatchObject({
      pedido_id: "pedido-123",
      produto_id: "prod-1",
      nome_snapshot: "Margherita",
      descricao_snapshot: "Molho e queijo",
      quantidade: 2,
      preco_unitario: 40,
    });
    // Item sem descrição vira null, não undefined
    expect(itensMapeados[1].descricao_snapshot).toBeNull();
  });

  test("gera um id de 12 caracteres para cada item", () => {
    const { itensMapeados } = calculaTotal(itens, 0, "pedido-123");

    expect(itensMapeados[0].id).toHaveLength(12);
    expect(itensMapeados[0].id).not.toBe(itensMapeados[1].id);
  });
});

describe("calculaTaxaEntrega", () => {
  test("retorna 0 (frete grátis provisório) para qualquer bairro", () => {
    expect(calculaTaxaEntrega("Centro")).toBe(0);
    expect(calculaTaxaEntrega("Zona Rural")).toBe(0);
  });

  test("retorna 0 mesmo sem bairro", () => {
    expect(calculaTaxaEntrega(undefined)).toBe(0);
  });
});

describe("validarTransicaoStatus", () => {
  // test.each roda o mesmo teste para cada linha da tabela
  test.each([
    ["pendente", "preparo"],
    ["pendente", "cancelado"],
    ["preparo", "pronto"],
    ["pronto", "rota"],
    ["rota", "entregue"],
  ])("permite a transição %s -> %s", (atual, novo) => {
    expect(() => validarTransicaoStatus(atual, novo)).not.toThrow();
  });

  test.each([
    ["pendente", "pronto"], // pulou uma etapa
    ["pronto", "preparo"], // voltou uma etapa
    ["entregue", "cancelado"], // status final
    ["cancelado", "pendente"], // status final
  ])("bloqueia a transição %s -> %s com erro 400", (atual, novo) => {
    const erro = capturaErro(() => validarTransicaoStatus(atual, novo));

    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(400);
    expect(erro.message).toMatch(/Transição inválida/);
  });

  test("rejeita um status atual desconhecido com erro 400", () => {
    const erro = capturaErro(() => validarTransicaoStatus("inexistente", "preparo"));

    expect(erro.status).toBe(400);
    expect(erro.message).toMatch(/não reconhecido/);
  });
});

describe("validarPermissaoTransicao", () => {
  test.each([
    ["preparo", "pizzaiolo"],
    ["preparo", "gestor"],
    ["rota", "entregador"],
    ["cancelado", "gestor"],
  ])("permite que o status '%s' seja definido por '%s'", (novoStatus, cargo) => {
    expect(() => validarPermissaoTransicao(novoStatus, cargo)).not.toThrow();
  });

  test.each([
    ["preparo", "entregador"],
    ["rota", "pizzaiolo"],
    ["cancelado", "pizzaiolo"],
  ])("bloqueia o status '%s' para o cargo '%s' com erro 403", (novoStatus, cargo) => {
    const erro = capturaErro(() => validarPermissaoTransicao(novoStatus, cargo));

    expect(erro.status).toBe(403);
  });

  test("retorna 400 para um status destino sem regra de permissão", () => {
    // 'pendente' nunca é destino de uma transição, então não tem regra
    const erro = capturaErro(() => validarPermissaoTransicao("pendente", "gestor"));

    expect(erro.status).toBe(400);
    expect(erro.message).toMatch(/não possui regra/);
  });
});