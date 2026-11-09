import { describe, test, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import {
  authUsuario,
  permitirCargos,
  gestorOuProprioUsuario,
  apenasProprioUsuario,
} from "./authMiddleware.js";

const SEGREDO = "segredo-de-teste";

// "res" falso: imita res.status(...).json(...) do Express.
// mockReturnValue(res) faz status() devolver o próprio res, permitindo o encadeamento.
function criaRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Variável de ambiente usada pelo middleware para validar tokens.
// Guardamos o valor original para restaurar no final e não afetar outros testes.
let segredoOriginal;
beforeAll(() => {
  segredoOriginal = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SEGREDO;
});
afterAll(() => {
  // Atribuir undefined a process.env viraria a string "undefined", então removemos a chave
  if (segredoOriginal === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = segredoOriginal;
  }
});

describe("authUsuario", () => {
  let res;
  let next;
  let espiaConsoleError;

  beforeEach(() => {
    res = criaRes();
    next = jest.fn();
    // O middleware chama console.error em token inválido. Silenciamos para não poluir a saída.
    espiaConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    espiaConsoleError.mockRestore(); // devolve o console.error original
  });

  test("responde 401 quando não há header Authorization", () => {
    authUsuario({ headers: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/não fornecido/) });
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ["sem o prefixo Bearer", "abc123"],
    ["com prefixo errado", "Token abc123"],
    ["sem o token", "Bearer"],
    ["com partes demais", "Bearer abc def"],
  ])("responde 401 quando o header está mal formatado (%s)", (_descricao, header) => {
    authUsuario({ headers: { authorization: header } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/mal formatadas/) });
    expect(next).not.toHaveBeenCalled();
  });

  test("responde 401 para um token que não é um JWT", () => {
    authUsuario({ headers: { authorization: "Bearer isso-nao-e-um-jwt" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/inválido ou expirado/) });
    expect(next).not.toHaveBeenCalled();
  });

  test("responde 401 para um token assinado com outro segredo", () => {
    const tokenFalso = jwt.sign({ id: "u1", cargo: "gestor" }, "outro-segredo");

    authUsuario({ headers: { authorization: `Bearer ${tokenFalso}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("responde 401 para um token expirado", () => {
    // exp (em segundos) já no passado
    const exp = Math.floor(Date.now() / 1000) - 10;
    const tokenExpirado = jwt.sign({ id: "u1", cargo: "gestor", exp }, SEGREDO);

    authUsuario({ headers: { authorization: `Bearer ${tokenExpirado}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("com token válido, preenche req.usuarioLogado e chama next()", () => {
    const token = jwt.sign({ id: "u1", cargo: "pizzaiolo" }, SEGREDO, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };

    authUsuario(req, res, next);

    expect(req.usuarioLogado).toEqual({ id: "u1", cargo: "pizzaiolo" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("aceita o campo 'role' no lugar de 'cargo' no token", () => {
    const token = jwt.sign({ id: "c1", role: "cliente" }, SEGREDO, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };

    authUsuario(req, res, next);

    expect(req.usuarioLogado).toEqual({ id: "c1", cargo: "cliente" });
  });
});

describe("permitirCargos", () => {
  test("responde 500 quando o usuário não foi identificado antes", () => {
    const res = criaRes();
    const next = jest.fn();

    permitirCargos("gestor")({}, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ["gestor", ["gestor"]],
    ["pizzaiolo", ["gestor", "pizzaiolo"]],
  ])("libera o cargo '%s' quando ele está entre os permitidos", (cargo, permitidos) => {
    const res = criaRes();
    const next = jest.fn();

    permitirCargos(...permitidos)({ usuarioLogado: { id: "u1", cargo } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("responde 403 quando o cargo não está entre os permitidos", () => {
    const res = criaRes();
    const next = jest.fn();

    permitirCargos("gestor", "pizzaiolo")({ usuarioLogado: { id: "u1", cargo: "entregador" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("gestorOuProprioUsuario", () => {
  test("responde 500 quando a rota não tem o parâmetro :id", () => {
    const res = criaRes();
    const next = jest.fn();

    gestorOuProprioUsuario({ usuarioLogado: { id: "u1", cargo: "gestor" }, params: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test("libera o gestor para acessar o recurso de qualquer usuário", () => {
    const next = jest.fn();

    gestorOuProprioUsuario({ usuarioLogado: { id: "g1", cargo: "gestor" }, params: { id: "outro" } }, criaRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("libera um usuário comum para acessar o próprio recurso", () => {
    const next = jest.fn();

    gestorOuProprioUsuario({ usuarioLogado: { id: "u1", cargo: "pizzaiolo" }, params: { id: "u1" } }, criaRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("responde 403 quando um usuário comum tenta acessar o recurso de outro", () => {
    const res = criaRes();
    const next = jest.fn();

    gestorOuProprioUsuario({ usuarioLogado: { id: "u1", cargo: "pizzaiolo" }, params: { id: "u2" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("apenasProprioUsuario", () => {
  test("responde 500 quando a rota não tem o parâmetro :id", () => {
    const res = criaRes();

    apenasProprioUsuario({ usuarioLogado: { id: "u1", cargo: "gestor" }, params: {} }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("libera quando o id do token é o mesmo da URL", () => {
    const next = jest.fn();

    apenasProprioUsuario({ usuarioLogado: { id: "u1", cargo: "pizzaiolo" }, params: { id: "u1" } }, criaRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("responde 403 mesmo para o gestor quando o id é de outro usuário", () => {
    const res = criaRes();
    const next = jest.fn();

    apenasProprioUsuario({ usuarioLogado: { id: "g1", cargo: "gestor" }, params: { id: "u2" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});