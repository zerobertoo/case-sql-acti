# Testes Automatizados - Sistema de Gestão de Pedidos

## 🚀 Como Executar os Testes

### Pré-requisitos

1. Docker e Docker Compose iniciados
2. Containers rodando: `docker-compose up -d`
3. Aguarde ~30-40 segundos para o banco inicializar

### Instalar Dependências de Teste

```bash
cd api
npm install
```

### Executar Testes

```bash
npm test
```

### Executar Testes com Cobertura

```bash
npm test -- --coverage
```

## 📋 Cobertura de Testes

O suite de testes inclui **23 casos de teste** cobrindo:

### ✅ Testes de Clientes

- `GET /clientes` - Listar todos
- `GET /clientes/:id` - Obter específico
- `POST /clientes` - Criar novo
- Validações de campo obrigatório
- Validação de CPF/CNPJ duplicado

### ✅ Testes de Produtos

- `GET /produtos` - Listar todos
- `POST /produtos` - Criar novo
- Validação de preço negativo
- Proteção referencial (não deletar com itens)

### ✅ Testes de Pedidos (Destaque!)

- `POST /pedidos` com itens integrados
  - Cria pedido + itens em transação atômica
  - Retorna quantidade de itens inseridos
  - Valida cliente e produtos
- `GET /pedidos` - Listar todos
- `GET /pedidos/:id` - Obter específico
- Validações de cliente inválido
- Validações de produto inválido
- **Rollback automático** se um item falha
- Permissão de criar pedido sem itens

### ✅ Testes de Itens

- `GET /itens` - Listar todos
- `GET /pedidos/:id/itens` - Itens de um pedido
- `POST /itens` - Criar item manual

### ✅ Testes de Integração de Estoque

- `POST /pedidos/:id/concluir` - Conclui e atualiza estoque
- Verifica se estoque diminuiu corretamente
- Previne conclusão dupla de pedido

### ✅ Testes de Integridade Referencial

- Não deletar cliente com pedidos
- Não deletar produto com itens
- Validações de FK funcionando

## 📊 Resultado Esperado

```
 PASS  ./index.test.js (45.2 s)
  Sistema de Gestão de Pedidos - Testes Integrados
    GET /clientes
      ✓ deve listar todos os clientes (125 ms)
    GET /clientes/:id
      ✓ deve obter um cliente específico (98 ms)
      ✓ deve retornar 404 para cliente inexistente (45 ms)
    POST /clientes
      ✓ deve criar um novo cliente (156 ms)
      ✓ deve rejeitar cliente sem nome (87 ms)
    ...
    POST /pedidos (Fluxo Integrado)
      ✓ deve criar pedido com itens em transação atômica (234 ms)
      ✓ deve rejeitar pedido com cliente inválido (89 ms)
      ✓ deve deletar pedido se um item falhar (198 ms)
      ✓ deve permitir criar pedido sem itens (167 ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
```

## 🎯 Casos de Teste Críticos

### 1. Fluxo Integrado de Pedidos

Testa a criação de um pedido com 2 itens em uma única requisição:

```javascript
POST /pedidos
{
  "id_cliente": 1,
  "itens": [
    {"id_produto": 1, "quantidade": 2, "valor_unitario": 50},
    {"id_produto": 2, "quantidade": 1, "valor_unitario": 30}
  ]
}
```

✅ Resultado: `201 Created` com `items_inseridos: 2`

### 2. Rollback Automático

Testa se o pedido é deletado quando um item falha:

```javascript
POST /pedidos
{
  "id_cliente": 1,
  "itens": [
    {"id_produto": 1, "quantidade": 1, "valor_unitario": 50},
    {"id_produto": 99999, "quantidade": 1, "valor_unitario": 100}  // inválido
  ]
}
```

✅ Resultado: `400 Bad Request` e pedido é automaticamente deletado

### 3. Integração de Estoque

Testa se estoque é atualizado ao concluir pedido:

- Obter estoque inicial do produto
- Criar pedido com itens
- Concluir pedido
- Verificar se estoque foi reduzido corretamente

✅ Resultado: Estoque diminui pela quantidade de itens

## 💡 Dicas para Execução

1. **Primeira Execução**: Pode levar ~50 segundos (banco inicializando)
2. **Execuções Subsequentes**: ~30 segundos
3. **Se os testes falharem**:
   - Verifique se containers estão rodando: `docker-compose ps`
   - Verifique se banco está inicializado: `docker logs sqlserver_init`

4. **Para Debugar um Teste Específico**:
   ```bash
   npm test -- --testNamePattern="deve criar pedido com itens"
   ```

## ✅ Validação Completa do Sistema

Execute os testes para validar o sistema completo:

```bash
docker-compose up -d
cd api && npm install
npm test
```

Valida que:

- ✅ Todo o projeto está funcional
- ✅ Validações estão implementadas corretamente
- ✅ Transações são atômicas e seguras
- ✅ Integridade referencial funciona
- ✅ Integração de estoque está operacional
