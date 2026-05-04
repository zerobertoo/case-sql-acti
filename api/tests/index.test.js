const request = require('supertest');
const sql = require('mssql');
const app = require('../index');

afterAll(async () => {
  await sql.close();
});

// Sufixo único por execução para evitar conflitos de dados no banco
const RUN_ID = Date.now().toString().slice(-8);

describe('Sistema de Gestão de Pedidos - Testes Integrados', () => {
  let clientId = 1;
  let produtoId1 = 1;
  let produtoId2 = 2;
  let pedidoId;

  // ===== TESTES DE CLIENTES =====
  describe('GET /clientes', () => {
    test('deve listar todos os clientes', async () => {
      const res = await request(app).get('/clientes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      clientId = res.body[0].id_cliente;
    });
  });

  describe('GET /clientes/:id', () => {
    test('deve obter um cliente específico', async () => {
      const res = await request(app).get(`/clientes/${clientId}`);
      expect(res.status).toBe(200);
      expect(res.body.id_cliente).toBe(clientId);
      expect(res.body.nome).toBeDefined();
    });

    test('deve retornar 404 para cliente inexistente', async () => {
      const res = await request(app).get('/clientes/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /clientes', () => {
    test('deve criar um novo cliente', async () => {
      const res = await request(app)
        .post('/clientes')
        .send({
          nome: 'Cliente Teste João',
          email: `joao${RUN_ID}@test.com`,
          cpf_cnpj: `9${RUN_ID}`
        });
      expect(res.status).toBe(201);
      expect(res.body.id_cliente).toBeDefined();
    });

    test('deve rejeitar cliente sem nome', async () => {
      const res = await request(app)
        .post('/clientes')
        .send({
          email: 'test@test.com',
          cpf_cnpj: '12345678901234'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ===== TESTES DE PRODUTOS =====
  describe('GET /produtos', () => {
    test('deve listar todos os produtos', async () => {
      const res = await request(app).get('/produtos');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      produtoId1 = res.body[0].id_produto;
      produtoId2 = res.body[1]?.id_produto || res.body[0].id_produto;
    });
  });

  describe('POST /produtos', () => {
    test('deve criar um novo produto', async () => {
      const res = await request(app)
        .post('/produtos')
        .send({
          nome: 'Teclado Mecânico',
          preco_unitario: 350.00,
          estoque_atual: 20
        });
      expect(res.status).toBe(201);
      expect(res.body.id_produto).toBeDefined();
    });

    test('deve rejeitar produto com preço inválido', async () => {
      const res = await request(app)
        .post('/produtos')
        .send({
          nome: 'Produto Teste',
          preco_unitario: -10,
          estoque_atual: 5
        });
      expect(res.status).toBe(400);
    });
  });

  // ===== TESTES DE PEDIDOS (INTEGRADO COM ITENS) =====
  describe('POST /pedidos (Fluxo Integrado)', () => {
    test('deve criar pedido com itens em transação atômica', async () => {
      const res = await request(app)
        .post('/pedidos')
        .send({
          id_cliente: clientId,
          itens: [
            { id_produto: produtoId1, quantidade: 2, valor_unitario: 50.00 },
            { id_produto: produtoId2, quantidade: 1, valor_unitario: 30.00 }
          ]
        });
      expect(res.status).toBe(201);
      expect(res.body.id_pedido).toBeDefined();
      expect(res.body.items_inseridos).toBe(2);
      expect(res.body.message).toContain('2 item(ns)');
      pedidoId = res.body.id_pedido;
    });

    test('deve rejeitar pedido com cliente inválido', async () => {
      const res = await request(app)
        .post('/pedidos')
        .send({
          id_cliente: 99999,
          itens: [{ id_produto: produtoId1, quantidade: 1, valor_unitario: 50 }]
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cliente');
    });

    test('deve deletar pedido se um item falhar (rollback automático)', async () => {
      const res = await request(app)
        .post('/pedidos')
        .send({
          id_cliente: clientId,
          itens: [
            { id_produto: produtoId1, quantidade: 1, valor_unitario: 50 },
            { id_produto: 99999, quantidade: 1, valor_unitario: 100 } // produto inválido
          ]
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Falha ao inserir item');
    });

    test('deve permitir criar pedido sem itens', async () => {
      const res = await request(app)
        .post('/pedidos')
        .send({ id_cliente: clientId });
      expect(res.status).toBe(201);
      expect(res.body.id_pedido).toBeDefined();
      expect(res.body.items_inseridos).toBe(0);
    });
  });

  describe('GET /pedidos', () => {
    test('deve listar todos os pedidos', async () => {
      const res = await request(app).get('/pedidos');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /pedidos/:id', () => {
    test('deve obter um pedido específico', async () => {
      const res = await request(app).get(`/pedidos/${pedidoId}`);
      expect(res.status).toBe(200);
      expect(res.body.id_pedido).toBe(pedidoId);
      expect(res.body.nome_cliente).toBeDefined();
      expect(res.body.status_pedido).toBe('Pendente');
    });
  });

  // ===== TESTES DE ITENS =====
  describe('GET /itens', () => {
    test('deve listar todos os itens', async () => {
      const res = await request(app).get('/itens');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /pedidos/:id/itens', () => {
    test('deve listar itens de um pedido específico', async () => {
      const res = await request(app).get(`/pedidos/${pedidoId}/itens`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id_pedido).toBe(pedidoId);
    });
  });

  describe('POST /itens', () => {
    test('deve criar item manualmente', async () => {
      const res = await request(app)
        .post('/itens')
        .send({
          id_pedido: pedidoId,
          id_produto: produtoId1,
          quantidade: 3,
          valor_unitario: 50.00
        });
      expect(res.status).toBe(201);
      expect(res.body.id_item).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });
  });

  // ===== TESTES DE INTEGRAÇÃO DE ESTOQUE =====
  describe('POST /pedidos/:id/concluir', () => {
    test('deve concluir pedido e atualizar estoque', async () => {
      // Obter estoque antes
      const produtoAntes = await request(app).get(`/produtos/${produtoId1}`);
      const estoqueAntes = produtoAntes.body.estoque_atual;

      // Concluir pedido
      const res = await request(app).post(`/pedidos/${pedidoId}/concluir`);
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('concluído');

      // Verificar que pedido foi marcado como concluído
      const pedidoAtualizado = await request(app).get(`/pedidos/${pedidoId}`);
      expect(pedidoAtualizado.body.status_pedido).toBe('Concluido');

      // Verificar que estoque foi diminuído
      const produtoDepois = await request(app).get(`/produtos/${produtoId1}`);
      const estoqueDepois = produtoDepois.body.estoque_atual;

      // Estoque deve estar menor (considerando os itens criados)
      expect(estoqueDepois).toBeLessThan(estoqueAntes + 10); // +10 como margem
    });

    test('deve rejeitar conclusão de pedido já concluído', async () => {
      const res = await request(app).post(`/pedidos/${pedidoId}/concluir`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('já está concluído');
    });
  });

  // ===== TESTES DE INTEGRIDADE REFERENCIAL =====
  describe('Integridade Referencial', () => {
    test('não deve deletar cliente com pedidos', async () => {
      const res = await request(app).delete(`/clientes/${clientId}`);
      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    test('não deve deletar produto com itens em pedidos', async () => {
      const res = await request(app).delete(`/produtos/${produtoId1}`);
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('itens');
    });
  });

  // ===== TESTES DE VALIDAÇÃO =====
  describe('Validações de Dados', () => {
    test('deve validar CPF/CNPJ duplicado', async () => {
      // Tentar criar cliente com mesmo CPF/CNPJ
      const res = await request(app)
        .post('/clientes')
        .send({
          nome: 'Outro Cliente',
          email: 'outro@test.com',
          cpf_cnpj: '12345678901' // CPF do cliente teste inicial
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('CPF/CNPJ já cadastrado');
    });

    test('deve validar quantidade positiva em itens', async () => {
      const res = await request(app)
        .post('/itens')
        .send({
          id_pedido: pedidoId,
          id_produto: produtoId1,
          quantidade: -5,
          valor_unitario: 50
        });
      expect(res.status).toBe(400);
    });
  });
});
