# 🍕 PizzaLab — Backend

API REST para gerenciamento operacional de pizzaria. Controla pedidos, estoque de ingredientes, produtos e usuários internos, com autenticação via JWT e controle de acesso por cargo.

---

## Tecnologias

- **Node.js** + **Express 5**
- **Prisma ORM** + **MySQL**
- **JWT** (jsonwebtoken) — autenticação
- **bcryptjs** — hash de senhas
- **nanoid** — geração de IDs

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

| Ferramenta | Versão mínima |
|------------|---------------|
| Node.js    | 18.x          |
| npm        | 9.x           |
| MySQL      | 8.x           |
| Git        | qualquer      |

---

## Executando localmente

### 1. Clone o repositório

```bash
git clone <https://github.com/Gabrield7/PizzaLab-API>
cd pizzalab-api
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
```

> **NODE_ENV:** em `development`, o endpoint de envio de OTP retorna o código gerado diretamente na resposta, facilitando os testes sem necessidade de integração com SMS.

### 4. Crie o banco de dados

Acesse o MySQL e crie o banco antes de rodar as migrações:

```sql
CREATE DATABASE pizzalab;
```

### 5. Execute as migrações

```bash
npx prisma migrate deploy
```

> Em ambiente de desenvolvimento, você também pode usar `npx prisma migrate dev`, que recria o banco com as migrações mais recentes e permite nomear cada migration.

### 6. Inicie a aplicação

```bash
npm run dev
```

A API estará disponível em **http://localhost:3000**.

Na primeira execução, o seed cria automaticamente um usuário gestor com as credenciais abaixo. Recomenda-se alterar a senha após o primeiro acesso.

| Campo  | Valor padrão          |
|--------|-----------------------|
| E-mail | gestor@pizzalab.com   |
| Senha  | gestor@123            |

---

## Estrutura do projeto

```
pizzalab-backend/
├── prisma/
│   ├── schema.prisma       # Modelagem das entidades
│   ├── migrations/         # Histórico de migrações
│   └── seed.js             # Cria o gestor padrão na inicialização
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

| Prefixo          | Descrição                                              |
|------------------|--------------------------------------------------------|
| `/usuarios`      | Autenticação e gerenciamento de funcionários           |
| `/clientes`      | Fluxo de autenticação OTP por telefone                 |
| `/produtos`      | Cardápio (leitura pública; escrita restrita ao gestor) |
| `/ingredientes`  | Controle de estoque (restrito a gestor e pizzaiolo)    |
| `/pedidos`       | Criação e atualização de status de pedidos             |


---

## Autenticação

Rotas protegidas exigem o token JWT no cabeçalho:

```
Authorization: Bearer <token>
```

O token é obtido via `POST /usuarios/login` (funcionários) ou via fluxo OTP em `POST /clientes/validar-otp` (clientes). Tokens de funcionários expiram em **8 horas**; tokens de clientes, em **1 hora**.

## Testando com Postman

A coleção completa de requisições está disponível para importação:

🔗 [Abrir coleção no Postman](https://gabrieldantas503-8118206.postman.co/workspace/Gabriel-Dantas's-Workspace~b38d6ce1-27ac-4317-8d40-c5f6ad2ef053/collection/55137038-780c2df9-725a-4182-942b-e4e6c7df81de?action=share&source=copy-link&creator=55137038)

> É necessário ter uma conta no Postman para fazer o fork da coleção.
> Após importar, configure a variável `baseUrl` da coleção como `http://localhost:3000`.