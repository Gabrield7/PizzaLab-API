export default {
  // Ambiente de execução: Node puro (sem navegador)
  testEnvironment: "node",

  // Desliga a transformação com Babel. O projeto já usa ESM (import/export),
  // então o código roda como está, sem conversão.
  transform: {},
};