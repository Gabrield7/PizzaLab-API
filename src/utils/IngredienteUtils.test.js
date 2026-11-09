import { describe, test, expect } from "@jest/globals";
import {
  calcularStatusEstoque,
  filtrarPorStatus,
  ordenarIngredientes,
} from "./IngredienteUtils.js";

describe("calcularStatusEstoque", () => {
  // Regras: atual <= 50% do mínimo = critico | atual < mínimo = baixo | senão normal
  test.each([
    [20, 10, "normal"], // bem acima do mínimo
    [10, 10, "normal"], // exatamente no mínimo ainda é normal
    [9.99, 10, "baixo"], // logo abaixo do mínimo
    [5.01, 10, "baixo"], // logo acima de 50%
    [5, 10, "critico"], // exatamente 50% já é crítico
    [0, 10, "critico"], // estoque zerado
  ])("estoque %s com mínimo %s = %s", (atual, minimo, esperado) => {
    expect(calcularStatusEstoque(atual, minimo)).toBe(esperado);
  });

  test("considera normal quando o mínimo é 0 ou não foi definido", () => {
    expect(calcularStatusEstoque(0, 0)).toBe("normal");
    expect(calcularStatusEstoque(3, undefined)).toBe("normal");
  });

  test("trata estoque atual ausente como 0", () => {
    expect(calcularStatusEstoque(null, 10)).toBe("critico");
    expect(calcularStatusEstoque(undefined, 10)).toBe("critico");
  });

  test("aceita valores como string (campos Decimal chegam assim do Prisma)", () => {
    expect(calcularStatusEstoque("3", "10")).toBe("critico");
    expect(calcularStatusEstoque("8", "10")).toBe("baixo");
  });
});

describe("filtrarPorStatus", () => {
  const ingredientes = [
    { nome: "Mussarela", status: "normal" },
    { nome: "Calabresa", status: "critico" },
    { nome: "Tomate", status: "baixo" },
    { nome: "Oregano", status: "critico" },
  ];

  test("devolve a mesma lista quando nenhum status é informado", () => {
    expect(filtrarPorStatus(ingredientes, undefined)).toBe(ingredientes);
  });

  test("devolve só os ingredientes do status pedido", () => {
    const resultado = filtrarPorStatus(ingredientes, "critico");

    expect(resultado).toHaveLength(2);
    expect(resultado.map((i) => i.nome)).toEqual(["Calabresa", "Oregano"]);
  });

  test("ignora maiúsculas e minúsculas no status pedido", () => {
    expect(filtrarPorStatus(ingredientes, "BAIXO")).toHaveLength(1);
  });

  test("devolve lista vazia quando nenhum ingrediente tem o status", () => {
    expect(filtrarPorStatus(ingredientes, "inexistente")).toEqual([]);
  });
});

describe("ordenarIngredientes", () => {
  const ingredientes = [
    { nome: "Mussarela", quantidade: 30 },
    { nome: "Calabresa", quantidade: 5 },
    { nome: "Tomate" }, // sem quantidade: conta como 0
  ];

  test("ordena por nome em ordem crescente (padrão)", () => {
    const resultado = ordenarIngredientes(ingredientes, "nome");

    expect(resultado.map((i) => i.nome)).toEqual(["Calabresa", "Mussarela", "Tomate"]);
  });

  test("ordena por nome em ordem decrescente", () => {
    const resultado = ordenarIngredientes(ingredientes, "nome", "desc");

    expect(resultado.map((i) => i.nome)).toEqual(["Tomate", "Mussarela", "Calabresa"]);
  });

  test("ordena por coluna numérica, tratando valor ausente como 0", () => {
    const crescente = ordenarIngredientes(ingredientes, "quantidade", "asc");
    const decrescente = ordenarIngredientes(ingredientes, "quantidade", "desc");

    expect(crescente.map((i) => i.nome)).toEqual(["Tomate", "Calabresa", "Mussarela"]);
    expect(decrescente.map((i) => i.nome)).toEqual(["Mussarela", "Calabresa", "Tomate"]);
  });

  test("não altera a lista original", () => {
    ordenarIngredientes(ingredientes, "nome", "desc");

    expect(ingredientes.map((i) => i.nome)).toEqual(["Mussarela", "Calabresa", "Tomate"]);
  });
});