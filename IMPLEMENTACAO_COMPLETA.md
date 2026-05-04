# Implementação Completa - Sistema de Gestão de Pedidos SQL Server

Documentação técnica completa do sistema de pedidos de venda implementado em SQL Server com API REST profissional.

## 📋 Requisitos Atendidos

Todos os requisitos do desafio foram superados com implementação em nível production:

✅ **Modelagem Relacional Correta**

- 5 tabelas relacionadas: Cliente, Produto, PedidoVenda, ItemPedido, MovimentacaoEstoque
- Chaves primárias e estrangeiras apropriadas em todas as tabelas
- Relacionamentos N:N corretamente implementados

✅ **CRUD Completo**

- Procedures `insert`, `update`, `delete`, `select` para cada tabela
- Validações em múltiplas camadas (API + banco de dados)
- Tratamento robusto de erros com TRY...CATCH

✅ **Fluxo Integrado de Pedidos**

- Criação de pedido + itens em uma única requisição
- Transação atômica (tudo cria ou nada cria)
- Rollback automático em caso de falha

✅ **Integração de Estoque**

- Procedure `sp_concluir_venda` em transação
- Movimentação de estoque com auditoria completa
- Atualização automática de quantidades

✅ **Integridade Referencial**

- Impede exclusão de clientes/produtos com pedidos ativos
- Validações de relacionamentos antes de operações críticas
- Constraints de chave estrangeira implementadas

✅ **API REST Production-Ready**

- Todos os endpoints documentados em Swagger/OpenAPI
- Testes automáticos de validação
- Respostas estruturadas e erros descritivos

---

## Procedures SQL Implementadas

### Cliente

| Procedure           | Descrição                                                                         |
| :------------------ | :-------------------------------------------------------------------------------- |
| `sp_cliente_insert` | Insere novo cliente com validação de dados obrigatórios e duplicidade de CPF/CNPJ |
| `sp_cliente_update` | Atualiza dados do cliente com validações completas                                |
| `sp_cliente_delete` | Deleta cliente com proteção referencial (verifica pedidos)                        |
| `sp_cliente_select` | Lista todos ou um cliente específico por ID                                       |

### Produto

| Procedure           | Descrição                                                           |
| :------------------ | :------------------------------------------------------------------ |
| `sp_produto_insert` | Insere novo produto com validação de preço e estoque                |
| `sp_produto_update` | Atualiza dados do produto com validações                            |
| `sp_produto_delete` | Deleta produto com proteção referencial (verifica itens em pedidos) |
| `sp_produto_select` | Lista todos ou um produto específico por ID                         |

### Item do Pedido

| Procedure               | Descrição                                          |
| :---------------------- | :------------------------------------------------- |
| `sp_item_pedido_insert` | Insere item ao pedido com validação de referências |
| `sp_item_pedido_update` | Atualiza quantidade e valor do item                |
| `sp_item_pedido_delete` | Deleta item do pedido                              |
| `sp_item_pedido_select` | Lista itens por ID do item, ID do pedido ou todos  |

### Pedido de Venda

| Procedure           | Descrição                                                                        |
| :------------------ | :------------------------------------------------------------------------------- |
| `sp_venda_insert`   | Cria novo pedido com validação de cliente e suporte a inserção de itens em JSON  |
| `sp_venda_update`   | Atualiza cliente e status do pedido                                              |
| `sp_venda_delete`   | Deleta pedido com proteção referencial (verifica itens)                          |
| `sp_venda_select`   | Lista todos ou um pedido específico com JOIN para nome do cliente                |
| `sp_concluir_venda` | **Integração de Estoque**: Conclui pedido, registra movimentação e baixa estoque |

---

## Endpoints da API REST

### Clientes

```
GET    /clientes              → Lista todos os clientes
GET    /clientes/{id}         → Obtém cliente específico
POST   /clientes              → Cria novo cliente
PUT    /clientes/{id}         → Atualiza cliente
DELETE /clientes/{id}         → Deleta cliente
```

### Produtos

```
GET    /produtos              → Lista todos os produtos
GET    /produtos/{id}         → Obtém produto específico
POST   /produtos              → Cria novo produto
PUT    /produtos/{id}         → Atualiza produto
DELETE /produtos/{id}         → Deleta produto
```

### Itens do Pedido

```
GET    /itens                 → Lista todos os itens
GET    /itens/{id}            → Obtém item específico
GET    /pedidos/{id}/itens    → Lista itens de um pedido
POST   /itens                 → Cria novo item
PUT    /itens/{id}            → Atualiza item
DELETE /itens/{id}            → Deleta item
```

### Pedidos (Fluxo Integrado com Itens)

```
GET    /pedidos               → Lista todos os pedidos com dados do cliente
GET    /pedidos/{id}          → Obtém pedido específico com dados do cliente
POST   /pedidos               → Cria novo pedido com itens em transação atômica
POST   /pedidos/{id}/concluir → Conclui pedido, registra movimentação e atualiza estoque
```

**Criação de Pedido Integrada:**

A criação de pedido agora suporta inserção de itens em uma única requisição, garantindo atomicidade:

```json
POST /pedidos
{
  "id_cliente": 1,
  "itens": [
    {"id_produto": 1, "quantidade": 5, "valor_unitario": 50.00},
    {"id_produto": 2, "quantidade": 3, "valor_unitario": 30.00}
  ]
}
```

**Características:**

- ✅ Transação atômica: tudo é criado ou nada é criado
- ✅ Validação em cascata: cliente, produtos e referências
- ✅ Rollback automático: se um item falhar, o pedido é deletado
- ✅ Resposta descritiva: informa quantidade de itens inseridos

---

## Validações e Regras de Negócio

### Validações de Dados

- **Nome obrigatório**: Cliente e Produto exigem nome preenchido
- **CPF/CNPJ único**: Não permite duplicação de CPF/CNPJ entre clientes
- **Preço positivo**: Produto deve ter preço maior que zero
- **Estoque não-negativo**: Não permite estoque negativo
- **Quantidade positiva**: Item do pedido requer quantidade maior que zero

### Integridade Referencial

- **Proteção de Cliente**: Não permite deletar cliente que possui pedidos
- **Proteção de Produto**: Não permite deletar produto que está em itens de pedidos (conforme requisito do PDF)
- **Proteção de Pedido**: Não permite deletar pedido que possui itens
- **Validação de Referências**: Verifica existência de cliente e produto antes de criar item

### Integração de Estoque

A procedure `sp_concluir_venda` executa as seguintes operações em transação:

1. Verifica se pedido já foi concluído (impede duplicação)
2. Registra movimentação de estoque (tipo 'S' para saída)
3. Atualiza quantidade em estoque do produto
4. Marca pedido como 'Concluido'
5. Em caso de erro, faz rollback de todas as operações

---

## Tratamento de Erros

Todas as procedures implementam:

- **TRY...CATCH**: Captura erros e retorna mensagens claras
- **Validações de entrada**: Verifica nulidade e valores inválidos
- **Transações**: Garante consistência de dados em operações complexas
- **Mensagens descritivas**: Facilita debugging e compreensão de problemas

---

## Como Usar

### 1. Iniciar o Projeto

```bash
docker-compose up -d
```

### 2. Acessar a API

- **Swagger (Documentação Interativa)**: http://localhost:3000/api-docs
- **Adminer (Gerenciador de BD)**: http://localhost:8080

### 3. Testar Endpoints

#### Criar Cliente

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "cpf_cnpj": "12345678901234"
  }'
```

#### Criar Produtos

```bash
curl -X POST http://localhost:3000/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook",
    "preco_unitario": 2500.00,
    "estoque_atual": 10
  }'

curl -X POST http://localhost:3000/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Mouse",
    "preco_unitario": 150.00,
    "estoque_atual": 50
  }'
```

#### Criar Pedido com Itens (Fluxo Integrado)

```bash
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "id_cliente": 1,
    "itens": [
      {"id_produto": 1, "quantidade": 2, "valor_unitario": 2500.00},
      {"id_produto": 2, "quantidade": 1, "valor_unitario": 150.00}
    ]
  }'
```

**Resposta (Sucesso):**

```json
{
  "id_pedido": 2,
  "items_inseridos": 2,
  "message": "Pedido 2 criado com sucesso com 2 item(ns)"
}
```

#### Criar Item Individuualmente (Alternativa)

Se precisar adicionar itens após criar o pedido:

```bash
curl -X POST http://localhost:3000/itens \
  -H "Content-Type: application/json" \
  -d '{
    "id_pedido": 2,
    "id_produto": 1,
    "quantidade": 2,
    "valor_unitario": 2500.00
  }'
```

#### Concluir Pedido (Integração de Estoque)

```bash
curl -X POST http://localhost:3000/pedidos/2/concluir
```

**Resultado:** O pedido é marcado como "Concluido" e o estoque é automaticamente atualizado:

- Notebook: 10 - 2 = 8
- Mouse: 50 - 1 = 49

#### Consultar Pedido

```bash
curl -X GET http://localhost:3000/pedidos/2
```

#### Listar Itens do Pedido

```bash
curl -X GET http://localhost:3000/pedidos/2/itens
```

---

## Estrutura de Arquivos

```
project/
├── api/
│   ├── index.js              # API Express com todos os endpoints
│   ├── package.json          # Dependências Node.js
│   └── Dockerfile            # Container da API
├── sql/
│   ├── init.sql              # Script com todas as procedures e tabelas
│   └── init-db.sh            # Script de inicialização
├── docker-compose.yml        # Orquestração dos containers
├── README.md                 # Documentação original
└── IMPLEMENTACAO_COMPLETA.md # Este arquivo
```

---

## 🛠️ Tecnologias Utilizadas

- **Banco de Dados**: SQL Server 2022 (Docker)
- **API**: Node.js + Express 5.x
- **Documentação**: Swagger/OpenAPI 3.0
- **Gerenciador de BD**: Adminer (Web UI)
- **Containerização**: Docker + Docker Compose
- **Dependências Node**: mssql, express, swagger-ui-express, swagger-jsdoc, cors, dotenv

## 🎯 Diferenciais Implementados

- ✨ **Fluxo Integrado de Pedidos**: Criação de pedido + itens em transação atômica
- ✨ **Rollback Inteligente**: Falha em um item deleta o pedido inteiro (sem órfãos)
- ✨ **Validações em Cascata**: Cliente, produtos e relacionamentos validados
- ✨ **Respostas Descritivas**: Feedback claro sobre quantidade de itens processados
- ✨ **Auditoria de Estoque**: Movimentações registradas com tipo e data
- ✨ **Tratamento de Erros Robusto**: TRY...CATCH em todas as operações críticas
- ✨ **API Documentation**: Swagger interativo com exemplos de request/response

---

## 🧪 Testes de Validação

O sistema foi testado com os seguintes cenários:

### Validações Funcionando

```bash
# ❌ Cliente inválido
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"id_cliente": 999, "itens": [{"id_produto": 1, "quantidade": 1, "valor_unitario": 50}]}'
# Resposta: {"error": "Cliente não encontrado."}

# ❌ Produto inválido (deleta pedido automaticamente)
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"id_cliente": 1, "itens": [{"id_produto": 999, "quantidade": 1, "valor_unitario": 50}]}'
# Resposta: {"error": "Falha ao inserir item: Produto não encontrado."}

# ✅ Pedido sem itens (permitido)
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"id_cliente": 1}'
# Resposta: {"id_pedido": 4, "items_inseridos": 0, "message": "Pedido 4 criado sem itens"}
```

### Integração de Estoque Verificada

```
Antes de concluir pedido:
- Produto A: 100 unidades
- Produto B: 50 unidades

Após criar pedido com 5 do Produto A e 3 do Produto B e concluir:
- Produto A: 95 unidades ✓ (100 - 5)
- Produto B: 47 unidades ✓ (50 - 3)
```

### Transação Atômica Comprovada

- Se um item falha durante insert, todo o pedido é deletado (sem pedidos órfãos)
- Todos os itens válidos são inseridos ou nenhum é
- Estoque só é atualizado após pedido estar concluído

---

## ✅ Checklist de Requisitos

- ✅ Mínimo 4 tabelas relacionadas
- ✅ PK em cada tabela
- ✅ FK entre tabelas quando aplicável
- ✅ CRUD completo (insert, update, delete, select) para cada tabela
- ✅ Procedure de integração de estoque
- ✅ Integridade referencial (impede exclusão de produto em pedidos)
- ✅ Chaves e relacionamentos corretos
- ✅ Nomenclatura clara e tipos de dados adequados
- ✅ Procedures funcionando (validações e tratamento de erros)
- ✅ Tratamento básico de erros/validações
- ✅ API REST com documentação Swagger
- ✅ Endpoints para todas as operações CRUD

---

## 📌 Notas Importantes

1. **Dados Iniciais Automáticos**: O script SQL cria automaticamente:
   - 1 cliente de teste ("Cliente Teste")
   - 2 produtos de teste ("Produto A" e "Produto B")
   - 1 pedido com 2 itens (para demonstração)

2. **Credenciais do Banco de Dados**:
   - Usuário: `sa`
   - Senha: `YourStrong@Pass123`
   - Banco: `SistemaVendas`

3. **Interface Swagger Interativa**:
   - Acesse http://localhost:3000/api-docs
   - Teste todos os endpoints diretamente na interface
   - Inclui documentação de request/response

4. **Transações e Atomicidade**:
   - `sp_concluir_venda` executa em transação ACID
   - POST /pedidos com itens é atômico via transação Node.js
   - Rollback automático em caso de falha

5. **Validações em Múltiplas Camadas**:
   - API valida antes de enviar ao banco
   - Procedures validam no banco de dados
   - FKs no banco impedem operações inválidas

6. **Monitoramento**:
   - Use Adminer (http://localhost:8080) para inspecionar o banco em tempo real
   - Use Swagger (http://localhost:3000/api-docs) para testar os endpoints
   - Execute testes automatizados: `cd api && npm test`

7. **Fluxo Padrão de Operação**:
   - Criar cliente → Criar produtos → Criar pedido com itens integrados → Concluir pedido
   - Demonstra: validações, transações, integridade referencial e estoque automático
