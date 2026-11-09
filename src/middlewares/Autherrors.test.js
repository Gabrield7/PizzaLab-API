import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { authErros } from "./authErros.js";

function criaRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("authErros", () => {
  let res;
  let espiaConsoleError;

  beforeEach(() => {
    res = criaRes();
    // O middleware registra erros no console. Silenciamos para manter a saída dos testes limpa.
    espiaConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    espiaConsoleError.mockRestore();
  });

  test("usa o 'status' do erro e a mensagem dele na resposta", () => {
    const erro = new Error("Transição inválida");
    erro.status = 400;

    authErros(erro, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Transição inválida" });
  });

  test("também entende o campo 'statusCode' (usado em validaItens)", () => {
    const erro = new Error("Quantidade inválida");
    erro.statusCode = 422;

    authErros(erro, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: "Quantidade inválida" });
  });

  test("converte erro de validação do Prisma (código P2xxx) em 400 genérico", () => {
    const erro = new Error("Unique constraint failed");
    erro.code = "P2002";

    authErros(erro, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro de consistência de dados no banco." });
  });

  test("responde 500 para erro inesperado sem expor a mensagem original", () => {
    const erro = new Error("senha do banco: 12345");

    authErros(erro, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/Erro interno no servidor/) });
    // Confere que o detalhe interno não vazou para o cliente
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.error).not.toMatch(/senha do banco/);
  });

  test("registra no console os erros inesperados", () => {
    authErros(new Error("falha qualquer"), {}, res, jest.fn());

    expect(espiaConsoleError).toHaveBeenCalled();
  });
});