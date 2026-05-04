# Sistema de Gestão de Pedidos de Venda

Um sistema production-ready completo de gestão de pedidos implementado em **SQL Server 2022** com **API REST** em Node.js/Express. Demonstra boas práticas de engenharia de software incluindo transações atômicas, validações robustas, integridade referencial e cobertura de testes automatizados.

## Visão Geral

Sistema implementa fluxo completo de gestão de vendas:

- **Cadastro de clientes** com validação de CPF/CNPJ único
- **Catálogo de produtos** com controle de estoque
- **Pedidos integrados**: criação de pedido + itens em transação atômica
- **Integração de estoque automática** ao concluir pedidos
- **Auditoria completa** de movimentações com histórico

**Stack Técnico:**

- Banco: SQL Server 2022 (Docker)
- API: Node.js 24 + Express 5.x
- Testes: Jest + Supertest (23 testes integrados)
- Orquestração: Docker Compose
- Documentação: Swagger/OpenAPI 3.0

## Quickstart

### Pré-requisitos

- Docker e Docker Compose
- Node.js 18+ (opcional, para rodar testes localmente)

### 1. Iniciar Sistema

```bash
docker-compose up -d
```

Aguarde ~40 segundos. Serviços disponíveis:

- **API Swagger**: http://localhost:3000/api-docs
- **Adminer (DB Manager)**: http://localhost:8080
- **SQL Server**: localhost:1433

### 2. Executar Suite de Testes

```bash
cd api
npm install
npm test
```

Executa 23 testes integrados automaticamente. Veja [`api/tests/README.md`](api/tests/README.md).

### 3. Testar API

**Via Swagger UI** (recomendado): http://localhost:3000/api-docs

**Via curl:**

```bash
# Criar pedido com itens (fluxo integrado)
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "id_cliente": 1,
    "itens": [
      {"id_produto": 1, "quantidade": 5, "valor_unitario": 50.00},
      {"id_produto": 2, "quantidade": 3, "valor_unitario": 30.00}
    ]
  }'

# Concluir pedido (atualiza estoque automaticamente)
curl -X POST http://localhost:3000/pedidos/2/concluir

# Listar itens do pedido
curl -X GET http://localhost:3000/pedidos/2/itens
```

## API REST

### Clientes

```
GET    /clientes              → Lista todos
GET    /clientes/{id}         → Obtém específico
POST   /clientes              → Cria novo
PUT    /clientes/{id}         → Atualiza
DELETE /clientes/{id}         → Remove
```

**Validações:**

- Nome obrigatório
- CPF/CNPJ único
- Não permite deletar com pedidos ativos

### Produtos

```
GET    /produtos              → Lista todos
GET    /produtos/{id}         → Obtém específico
POST   /produtos              → Cria novo
PUT    /produtos/{id}         → Atualiza
DELETE /produtos/{id}         → Remove
```

**Validações:**

- Nome obrigatório
- Preço > 0
- Estoque >= 0
- Não permite deletar com itens em pedidos

### Pedidos (Integrado com Itens)

```
GET    /pedidos               → Lista todos
GET    /pedidos/{id}          → Obtém específico
POST   /pedidos               → Cria com itens (atômico!)
POST   /pedidos/{id}/concluir → Conclui e atualiza estoque
```

**Fluxo Integrado de Pedidos:**

```json
POST /pedidos
{
  "id_cliente": 1,
  "itens": [
    {
      "id_produto": 1,
      "quantidade": 5,
      "valor_unitario": 50.00
    },
    {
      "id_produto": 2,
      "quantidade": 3,
      "valor_unitario": 30.00
    }
  ]
}
```

**Características:**

- ✅ Transação atômica: tudo cria ou nada cria
- ✅ Validação em cascata: cliente, produtos, referências
- ✅ Rollback automático: falha em item deleta pedido inteiro
- ✅ Resposta descritiva: informa quantidade de itens inseridos

### Itens do Pedido

```
GET    /itens                 → Lista todos
GET    /itens/{id}            → Obtém específico
GET    /pedidos/{id}/itens    → Lista itens de um pedido
POST   /itens                 → Cria novo item
PUT    /itens/{id}            → Atualiza item
DELETE /itens/{id}            → Remove item
```

## Banco de Dados

### Esquema Relacional

```
Cliente (1) ────→ (N) PedidoVenda
                    ↓
                    (N) ItemPedido ←──→ (N) Produto
                    ↓
            MovimentacaoEstoque
```

### Tabelas

- **Cliente**: id_cliente (PK), nome, email, cpf_cnpj (UNIQUE), data_cadastro
- **Produto**: id_produto (PK), nome, preco_unitario, estoque_atual
- **PedidoVenda**: id_pedido (PK), id_cliente (FK), status_pedido, data_pedido
- **ItemPedido**: id_item (PK), id_pedido (FK), id_produto (FK), quantidade, valor_unitario
- **MovimentacaoEstoque**: id_movimentacao (PK), id_produto (FK), quantidade, tipo_movimentacao, data_movimentacao

### Stored Procedures

Cada tabela possui procedures CRUD:

- `sp_[tabela]_insert` - Insere com validações
- `sp_[tabela]_update` - Atualiza com validações
- `sp_[tabela]_delete` - Deleta com proteção referencial
- `sp_[tabela]_select` - Consulta com filtros opcionais

**Integração de Estoque:**

- `sp_concluir_venda` - Conclui pedido e atualiza estoque em transação

## Recursos Principais

### Transações Atômicas

- Criação de pedido com itens em uma única operação
- Rollback automático se um item falhar
- Evita pedidos órfãos

### Integridade Referencial

- Foreign keys implementadas no banco
- Validações em procedures
- Protege exclusão de clientes/produtos com pedidos ativos

### Validações Robustas

- Múltiplas camadas (API + banco de dados)
- Mensagens de erro descritivas
- Prevenção de dados inválidos

### Integração de Estoque

- Movimentação automática ao concluir pedido
- Auditoria completa com histórico
- Atualização atômica de quantidades

### Testes Automatizados

- 23 testes integrados (Jest + Supertest)
- Cobertura: CRUD, validações, transações, estoque
- Fácil integração com CI/CD

## Credenciais Padrão

| Componente | Usuário | Senha              | Observações          |
| ---------- | ------- | ------------------ | -------------------- |
| SQL Server | sa      | YourStrong@Pass123 | Admin do banco       |
| Adminer    | -       | -                  | Sem autenticação web |
| API        | -       | -                  | Sem autenticação     |

## Estrutura de Arquivos

```
projeto/
├── api/
│   ├── index.js              # API Express com todos endpoints
│   ├── package.json          # Dependências
│   ├── Dockerfile            # Container da API
│   ├── jest.config.js        # Configuração Jest
│   ├── jest.setup.js         # Setup de ambiente
│   └── tests/
│       ├── index.test.js     # Suite de testes (23 testes)
│       └── README.md         # Documentação dos testes
├── sql/
│   ├── init.sql              # Procedures + tabelas + dados iniciais
│   └── init-db.sh            # Script de inicialização
├── docker-compose.yml        # Orquestração dos containers
├── IMPLEMENTACAO_COMPLETA.md # Detalhes técnicos completos
└── README.md                 # Este arquivo
```

## Desenvolvimento

### Rodar Localmente

```bash
# Iniciar containers
docker-compose up -d

# Aguardar ~40s, depois instalar dependências
cd api && npm install

# Rodar testes
npm test

# Rodar API manualmente (em dev)
npm start
```

### Adicionar Novo Endpoint

1. Criar procedure em `sql/init.sql`
2. Adicionar handler em `api/index.js` com documentação Swagger
3. Adicionar testes em `api/tests/index.test.js`
4. Rebuild e testar: `docker-compose up -d --build`

### Modificar Banco

1. Editar `sql/init.sql`
2. Reset BD: `docker-compose down -v`
3. Reiniciar: `docker-compose up -d`

## Testes

**Executar suite completa:**

```bash
cd api
npm test
```

**Rodar teste específico:**

```bash
npm test -- --testNamePattern="deve criar pedido"
```

**Com cobertura:**

```bash
npm test -- --coverage
```

Veja [`api/tests/README.md`](api/tests/README.md) para documentação detalhada dos testes.

## Parar Sistema

```bash
docker-compose down
```

Para remover volumes (reset completo):

```bash
docker-compose down -v
```

## Referência Técnica

Veja [`IMPLEMENTACAO_COMPLETA.md`](IMPLEMENTACAO_COMPLETA.md) para:

- Detalhes de cada procedure SQL
- Exemplos detalhados de requisições
- Fluxo completo de operações
- Validações implementadas
- Tratamento de erros

## Licença

ISC

## Contato

Para dúvidas ou sugestões, abra uma issue ou pull request.
