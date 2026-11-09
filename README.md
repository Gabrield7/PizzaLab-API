# 🍕 PizzaLab — Backend

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![CI](https://github.com/Gabrield7/PizzaLab-API/actions/workflows/ci.yml/badge.svg)

API REST para gerenciamento operacional de pizzaria. Controla pedidos, estoque de ingredientes, produtos e usuários internos, com autenticação via JWT e controle de acesso por cargo.

Projeto final da disciplina de Desenvolvimento Web Back-end (UERN), depois reaproveitado na atividade de computação em nuvem, onde foi implantado em duas modalidades: PaaS e IaaS.

---

## Demonstração

| Modalidade | Frontend | API |
| ---------- | -------- | --- |
| **PaaS** (Vercel + Render + TiDB) | [pizzalab-frontend-liart.vercel.app](https://pizzalab-frontend-liart.vercel.app) | [pizzalab-api-bvmp.onrender.com](https://pizzalab-api-bvmp.onrender.com) |
| **IaaS** (AWS EC2) | [http://54.20.100.52](http://54.20.100.52) | `http://54.20.100.52:3000` |

- Repositório do frontend: **[PizzaLab-Frontend](https://github.com/Gabrield7/PizzaLab-Frontend)**
- O frontend consome apenas produtos e pedidos. Os demais módulos (estoque, funcionários, painel) fazem parte da API, mas não têm interface neste momento.

---

## Tecnologias

- **Node.js** + **Express 5**
- **Prisma ORM** + **MySQL**
- **JWT** (jsonwebtoken): autenticação
- **bcryptjs**: hash de senhas
- **nanoid**: geração de IDs
- **cors**: liberação de origens para o frontend

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

| Ferramenta | Versão mínima |
| ---------- | ------------- |
| Node.js    | 18.x          |
| npm        | 9.x           |
| MySQL      | 8.x           |
| Git        | qualquer      |

---

## Executando localmente

### 1. Clone o repositório

```bash
git clone https://github.com/Gabrield7/PizzaLab-API.git
cd PizzaLab-API
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Edite o `.env` com as suas configurações:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/pizzalab"
JWT_SECRET="sua_chave_secreta_aqui"
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

| Variável       | Obrigatória | Descrição |
| -------------- | ----------- | --------- |
| `DATABASE_URL` | Sim | String de conexão do MySQL. |
| `JWT_SECRET`   | Sim | Chave usada para assinar os tokens JWT. |
| `NODE_ENV`     | Não | Em `development`, o endpoint de envio de OTP devolve o código na própria resposta, o que dispensa integração com SMS nos testes. |
| `PORT`         | Não | Porta da API. Padrão: `3000`. |
| `FRONTEND_URL` | Sim, em produção | Origem do frontend autorizada pelo CORS. Deve ser **exatamente** a origem que o navegador envia, **sem barra no final** (ex: `https://meu-front.vercel.app`). `http://localhost:5173` já é liberado por padrão. |

### 4. Crie o banco de dados

Acesse o MySQL e crie o banco antes de rodar as migrações:

```sql
CREATE DATABASE pizzalab;
```

### 5. Execute as migrações

```bash
npx prisma migrate deploy
```

> Em desenvolvimento, `npx prisma migrate dev` aplica as migrações pendentes e também gera uma nova migration quando você altera o `schema.prisma`.

### 6. Inicie a aplicação

```bash
npm run dev
```

A API estará disponível em **http://localhost:3000**.

Na primeira execução, o seed cria automaticamente um usuário gestor com as credenciais abaixo.

| Campo  | Valor padrão          |
| ------ | --------------------- |
| E-mail | gestor@pizzalab.com   |
| Senha  | gestor@123            |

> **Importante:** essas credenciais servem apenas para desenvolvimento e testes. Em qualquer ambiente acessível pela internet, troque a senha logo após o primeiro acesso, já que o gestor tem permissão de escrita sobre produtos e ingredientes.

### 7. Popule o cardápio (opcional)

Produtos e ingredientes só podem ser criados por um gestor autenticado. Para cadastrar o catálogo inicial (27 ingredientes e 12 produtos) de uma vez, use o script de carga, apontando para a API desejada:

```bash
BASE_URL=http://localhost:3000 GESTOR_EMAIL=gestor@pizzalab.com GESTOR_SENHA=gestor@123 node scripts/seed-produtos.mjs
```

> **Observação** O script é idempotente: se algo falhar no meio, basta rodá-lo de novo. O que já existe (conferido pelo nome) é reaproveitado, não duplicado.

---

## Estrutura do projeto

```
PizzaLab-API/
├── prisma/
│   ├── schema.prisma       # Modelagem das entidades
│   ├── migrations/         # Histórico de migrações
│   └── seed.js             # Cria o gestor padrão na inicialização
├── scripts/
│   └── seed-produtos.mjs   # Carga do catálogo inicial via API
└── src/
    ├── server.js           # Ponto de entrada da aplicação
    ├── config/
    │   └── database.js     # Instância do Prisma Client
    ├── routes/             # Definição das rotas por módulo
    ├── controllers/        # Lógica de negócio e respostas HTTP
    ├── middlewares/        # Autenticação JWT e tratamento de erros
    └── utils/              # Funções auxiliares (pedidos, receitas)
```

---

## Módulos da API

| Prefixo         | Descrição                                              |
| --------------- | ------------------------------------------------------ |
| `/usuarios`     | Autenticação e gerenciamento de funcionários           |
| `/clientes`     | Fluxo de autenticação OTP por telefone                 |
| `/produtos`     | Cardápio (leitura pública; escrita restrita ao gestor) |
| `/ingredientes` | Controle de estoque (restrito a gestor e pizzaiolo)    |
| `/pedidos`      | Criação (pública) e acompanhamento/atualização de status (restrito a funcionários) |

### Principais endpoints

| Método | Rota | Acesso | Descrição |
| ------ | ---- | ------ | --------- |
| `GET` | `/` | Público | Verificação de funcionamento |
| `POST` | `/usuarios/login` | Público | Login de funcionário (retorna JWT) |
| `GET` | `/produtos` | Público | Lista o cardápio |
| `GET` | `/produtos/:id` | Público | Detalha um produto |
| `POST` / `PUT` / `DELETE` | `/produtos`, `/produtos/:id` | Gestor | Gerencia o cardápio |
| `POST` | `/pedidos` | Público | Cria um pedido (checkout sem login) |
| `GET` | `/pedidos/painel` | Funcionário autenticado | Painel de pedidos |
| `PATCH` | `/pedidos/:id/status` | Gestor, pizzaiolo, entregador | Avança ou cancela o status |

O acesso detalhado de cada rota de `/usuarios`, `/clientes` e `/ingredientes` está na coleção do Postman (veja abaixo).

### Criando um pedido

`POST /pedidos` não exige autenticação. O cliente e o endereço são registrados automaticamente a partir dos dados enviados.

```json
{
  "nome": "Maria Silva",
  "telefone": "(84) 99999-9999",
  "logradouro": "Rua das Flores",
  "numero": "123",
  "bairro": "Centro",
  "complemento": "Apto 2",
  "observacoes": "Sem cebola",
  "itens": [
    { "produto_id": "eup6SWzs0d8h", "quantidade": 2 }
  ]
}
```

Campos obrigatórios: `nome`, `telefone`, `logradouro`, `numero`, `bairro` e `itens` (com ao menos um item). `cidade`, `cep`, `complemento` e `observacoes` são opcionais.

O pedido nasce com status `pendente` e segue este fluxo:

```
pendente → preparo → pronto → rota → entregue
```

Em qualquer ponto anterior à entrega ele pode ir para `cancelado`.

---

## Autenticação

Rotas protegidas exigem o token JWT no cabeçalho:

```
Authorization: Bearer <token>
```

O token é obtido via `POST /usuarios/login` (funcionários) ou via fluxo OTP em `POST /clientes/validar-otp` (clientes). Tokens de funcionários expiram em **8 horas**; tokens de clientes, em **1 hora**.

---

## Implantação

O mesmo projeto foi publicado de duas formas, cada uma com seu próprio banco de dados.

**PaaS**
- Frontend: Vercel
- API: Render (Web Service)
- Banco: TiDB Cloud Serverless (compatível com o protocolo MySQL)
- Variáveis configuradas no painel de cada serviço: `DATABASE_URL`, `JWT_SECRET` e `FRONTEND_URL` no Render; `VITE_API_URL` na Vercel.

**IaaS**
- Instância AWS EC2 (Ubuntu 24.04 LTS, `t2.micro`) com IP elástico
- MySQL instalado na própria instância
- API mantida ativa com PM2
- Frontend compilado e servido pelo Nginx na porta 80
- Portas liberadas no grupo de segurança: 22 (apenas o IP do administrador), 80 e 3000

Os passos completos de cada implantação estão descritos no relatório da atividade.

---

## Decisões e limitações conhecidas

- **Frete grátis provisório.** `calculaTaxaEntrega` (em `src/utils/PedidoUtils.js`) retorna sempre `0`. A tabela de taxas por bairro continua no código, comentada, e pode ser reativada.
- **`POST /pedidos` é público.** O checkout do frontend não exige login, então a rota não passa pelo middleware de autenticação. As rotas de painel e de mudança de status continuam protegidas.
- **Não há rota pública para o cliente consultar o status do pedido.** No frontend, a tela de acompanhamento simula o avanço de status a cada 5 segundos. O status real só é alterado por funcionários via `PATCH /pedidos/:id/status`.
- **IDs de pedido não são sequenciais.** São strings geradas com `nanoid` (12 caracteres).
- **Valores monetários chegam como string no JSON** (campos `Decimal` do Prisma). O cliente da API deve convertê-los para número.

---

## Testando com Postman

A coleção completa de requisições está disponível para importação:

🔗 [Abrir coleção no Postman](https://gabrieldantas503-8118206.postman.co/workspace/Gabriel-Dantas's-Workspace~b38d6ce1-27ac-4317-8d40-c5f6ad2ef053/collection/55137038-780c2df9-725a-4182-942b-e4e6c7df81de?action=share&source=copy-link&creator=55137038)

> É necessário ter uma conta no Postman para fazer o fork da coleção.
> Após importar, configure a variável `baseUrl` da coleção como `http://localhost:3000` (ou a URL de uma das implantações acima).

---

## Autor

**Gabriel Dantas**: [@Gabrield7](https://github.com/Gabrield7)