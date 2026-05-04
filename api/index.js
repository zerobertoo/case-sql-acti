const express = require('express');
const sql = require('mssql');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Pass123',
    server: process.env.DB_SERVER || 'sqlserver',
    database: process.env.DB_NAME || 'SistemaVendas',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Swagger Config
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sales API - CRUD Completo',
            version: '1.0.0',
            description: 'API para gestão completa de clientes, produtos, pedidos e itens de venda',
        },
        servers: [{ url: 'http://localhost:3000' }],
    },
    apis: ['./index.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ===========================
// ENDPOINTS DE CLIENTE
// ===========================

/**
 * @openapi
 * /clientes:
 *   get:
 *     summary: Lista todos os clientes
 *     tags:
 *       - Clientes
 *     responses:
 *       200:
 *         description: Lista de clientes
 *       500:
 *         description: Erro ao listar clientes
 */
app.get('/clientes', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().execute('sp_cliente_select');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /clientes/{id}:
 *   get:
 *     summary: Obtém um cliente específico
 *     tags:
 *       - Clientes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do cliente
 *       404:
 *         description: Cliente não encontrado
 */
app.get('/clientes/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_cliente', sql.Int, req.params.id)
            .execute('sp_cliente_select');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /clientes:
 *   post:
 *     summary: Cria um novo cliente
 *     tags:
 *       - Clientes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - cpf_cnpj
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               cpf_cnpj:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente criado
 *       400:
 *         description: Dados inválidos
 */
app.post('/clientes', async (req, res) => {
    try {
        const { nome, email, cpf_cnpj } = req.body;

        if (!nome || !cpf_cnpj) {
            return res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios' });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('nome', sql.VarChar(100), nome)
            .input('email', sql.VarChar(100), email || null)
            .input('cpf_cnpj', sql.VarChar(20), cpf_cnpj)
            .execute('sp_cliente_insert');
        
        res.status(201).json({ id_cliente: result.recordset[0].NewID, message: 'Cliente criado com sucesso' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /clientes/{id}:
 *   put:
 *     summary: Atualiza um cliente
 *     tags:
 *       - Clientes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - cpf_cnpj
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               cpf_cnpj:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente atualizado
 */
app.put('/clientes/:id', async (req, res) => {
    try {
        const { nome, email, cpf_cnpj } = req.body;

        if (!nome || !cpf_cnpj) {
            return res.status(400).json({ error: 'Nome e CPF/CNPJ são obrigatórios' });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_cliente', sql.Int, req.params.id)
            .input('nome', sql.VarChar(100), nome)
            .input('email', sql.VarChar(100), email || null)
            .input('cpf_cnpj', sql.VarChar(20), cpf_cnpj)
            .execute('sp_cliente_update');
        
        res.json({ id_cliente: result.recordset[0].id_cliente, message: 'Cliente atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /clientes/{id}:
 *   delete:
 *     summary: Deleta um cliente
 *     tags:
 *       - Clientes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente deletado
 *       409:
 *         description: Cliente possui pedidos
 */
app.delete('/clientes/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_cliente', sql.Int, req.params.id)
            .execute('sp_cliente_delete');
        
        res.json({ message: result.recordset[0].message });
    } catch (err) {
        if (err.message.includes('pedidos')) {
            return res.status(409).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// ===========================
// ENDPOINTS DE PRODUTO
// ===========================

/**
 * @openapi
 * /produtos:
 *   get:
 *     summary: Lista todos os produtos
 *     tags:
 *       - Produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 */
app.get('/produtos', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().execute('sp_produto_select');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /produtos/{id}:
 *   get:
 *     summary: Obtém um produto específico
 *     tags:
 *       - Produtos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do produto
 *       404:
 *         description: Produto não encontrado
 */
app.get('/produtos/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_produto', sql.Int, req.params.id)
            .execute('sp_produto_select');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /produtos:
 *   post:
 *     summary: Cria um novo produto
 *     tags:
 *       - Produtos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - preco_unitario
 *               - estoque_atual
 *             properties:
 *               nome:
 *                 type: string
 *               preco_unitario:
 *                 type: number
 *               estoque_atual:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Produto criado
 */
app.post('/produtos', async (req, res) => {
    try {
        const { nome, preco_unitario, estoque_atual } = req.body;

        if (!nome || !preco_unitario || estoque_atual === undefined) {
            return res.status(400).json({ error: 'Nome, preço e estoque são obrigatórios' });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('nome', sql.VarChar(100), nome)
            .input('preco_unitario', sql.Decimal(10, 2), preco_unitario)
            .input('estoque_atual', sql.Int, estoque_atual)
            .execute('sp_produto_insert');
        
        res.status(201).json({ id_produto: result.recordset[0].NewID, message: 'Produto criado com sucesso' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /produtos/{id}:
 *   put:
 *     summary: Atualiza um produto
 *     tags:
 *       - Produtos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - preco_unitario
 *               - estoque_atual
 *             properties:
 *               nome:
 *                 type: string
 *               preco_unitario:
 *                 type: number
 *               estoque_atual:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produto atualizado
 */
app.put('/produtos/:id', async (req, res) => {
    try {
        const { nome, preco_unitario, estoque_atual } = req.body;

        if (!nome || !preco_unitario || estoque_atual === undefined) {
            return res.status(400).json({ error: 'Nome, preço e estoque são obrigatórios' });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_produto', sql.Int, req.params.id)
            .input('nome', sql.VarChar(100), nome)
            .input('preco_unitario', sql.Decimal(10, 2), preco_unitario)
            .input('estoque_atual', sql.Int, estoque_atual)
            .execute('sp_produto_update');
        
        res.json({ id_produto: result.recordset[0].id_produto, message: 'Produto atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /produtos/{id}:
 *   delete:
 *     summary: Deleta um produto
 *     tags:
 *       - Produtos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produto deletado
 *       409:
 *         description: Produto possui itens em pedidos
 */
app.delete('/produtos/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_produto', sql.Int, req.params.id)
            .execute('sp_produto_delete');
        
        res.json({ message: result.recordset[0].message });
    } catch (err) {
        if (err.message.includes('pedidos')) {
            return res.status(409).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// ===========================
// ENDPOINTS DE ITENS DO PEDIDO
// ===========================

/**
 * @openapi
 * /itens:
 *   get:
 *     summary: Lista todos os itens de pedidos
 *     tags:
 *       - Itens do Pedido
 *     responses:
 *       200:
 *         description: Lista de itens
 */
app.get('/itens', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().execute('sp_item_pedido_select');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /itens/{id}:
 *   get:
 *     summary: Obtém um item específico
 *     tags:
 *       - Itens do Pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do item
 *       404:
 *         description: Item não encontrado
 */
app.get('/itens/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_item', sql.Int, req.params.id)
            .execute('sp_item_pedido_select');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /pedidos/{id_pedido}/itens:
 *   get:
 *     summary: Lista itens de um pedido específico
 *     tags:
 *       - Itens do Pedido
 *     parameters:
 *       - in: path
 *         name: id_pedido
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de itens do pedido
 */
app.get('/pedidos/:id_pedido/itens', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_pedido', sql.Int, req.params.id_pedido)
            .execute('sp_item_pedido_select');
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /itens:
 *   post:
 *     summary: Cria um novo item de pedido
 *     tags:
 *       - Itens do Pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_pedido
 *               - id_produto
 *               - quantidade
 *               - valor_unitario
 *             properties:
 *               id_pedido:
 *                 type: integer
 *               id_produto:
 *                 type: integer
 *               quantidade:
 *                 type: integer
 *               valor_unitario:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item criado
 */
app.post('/itens', async (req, res) => {
    try {
        const { id_pedido, id_produto, quantidade, valor_unitario } = req.body;

        if (!id_pedido || !id_produto || !quantidade || !valor_unitario) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_pedido', sql.Int, id_pedido)
            .input('id_produto', sql.Int, id_produto)
            .input('quantidade', sql.Int, quantidade)
            .input('valor_unitario', sql.Decimal(10, 2), valor_unitario)
            .execute('sp_item_pedido_insert');
        
        res.status(201).json({ id_item: result.recordset[0].NewID, message: 'Item criado com sucesso' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /itens/{id}:
 *   put:
 *     summary: Atualiza um item de pedido
 *     tags:
 *       - Itens do Pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantidade
 *               - valor_unitario
 *             properties:
 *               quantidade:
 *                 type: integer
 *               valor_unitario:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item atualizado
 */
app.put('/itens/:id', async (req, res) => {
    try {
        const { quantidade, valor_unitario } = req.body;

        if (!quantidade || !valor_unitario) {
            return res.status(400).json({ error: 'Quantidade e valor unitário são obrigatórios' });
        }

        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_item', sql.Int, req.params.id)
            .input('quantidade', sql.Int, quantidade)
            .input('valor_unitario', sql.Decimal(10, 2), valor_unitario)
            .execute('sp_item_pedido_update');
        
        res.json({ id_item: result.recordset[0].id_item, message: 'Item atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /itens/{id}:
 *   delete:
 *     summary: Deleta um item de pedido
 *     tags:
 *       - Itens do Pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item deletado
 */
app.delete('/itens/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_item', sql.Int, req.params.id)
            .execute('sp_item_pedido_delete');
        
        res.json({ message: result.recordset[0].message });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===========================
// ENDPOINTS DE PEDIDOS
// ===========================

/**
 * @openapi
 * /pedidos:
 *   get:
 *     summary: Lista todos os pedidos
 *     tags:
 *       - Pedidos
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
app.get('/pedidos', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().execute('sp_venda_select');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /pedidos/{id}:
 *   get:
 *     summary: Obtém um pedido específico
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do pedido
 *       404:
 *         description: Pedido não encontrado
 */
app.get('/pedidos/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('id_pedido', sql.Int, req.params.id)
            .execute('sp_venda_select');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /pedidos:
 *   post:
 *     summary: Cria um novo pedido com itens
 *     tags:
 *       - Pedidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_cliente
 *             properties:
 *               id_cliente:
 *                 type: integer
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_produto:
 *                       type: integer
 *                     quantidade:
 *                       type: integer
 *                     valor_unitario:
 *                       type: number
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Cliente ou produto não encontrado
 */
app.post('/pedidos', async (req, res) => {
    try {
        const { id_cliente, itens } = req.body;

        if (!id_cliente) {
            return res.status(400).json({ error: 'id_cliente é obrigatório' });
        }

        let pool = await sql.connect(config);

        // Criar pedido
        let resultPedido = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .execute('sp_venda_insert');

        const id_pedido = resultPedido.recordset[0].NewID;
        let itemsInseridos = 0;

        // Inserir itens se fornecidos
        if (itens && itens.length > 0) {
            for (const item of itens) {
                try {
                    await pool.request()
                        .input('id_pedido', sql.Int, id_pedido)
                        .input('id_produto', sql.Int, item.id_produto)
                        .input('quantidade', sql.Int, item.quantidade)
                        .input('valor_unitario', sql.Decimal(10, 2), item.valor_unitario)
                        .execute('sp_item_pedido_insert');
                    itemsInseridos++;
                } catch (itemErr) {
                    // Deletar itens já inseridos e depois o pedido
                    await pool.request()
                        .input('id_pedido', sql.Int, id_pedido)
                        .query('DELETE FROM ItemPedido WHERE id_pedido = @id_pedido');
                    await pool.request()
                        .input('id_pedido', sql.Int, id_pedido)
                        .execute('sp_venda_delete');
                    throw new Error(`Falha ao inserir item: ${itemErr.message}`);
                }
            }
        }

        res.status(201).json({
            id_pedido: id_pedido,
            items_inseridos: itemsInseridos,
            message: itemsInseridos > 0
                ? `Pedido ${id_pedido} criado com sucesso com ${itemsInseridos} item(ns)`
                : `Pedido ${id_pedido} criado sem itens`
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /pedidos/{id}/concluir:
 *   post:
 *     summary: Conclui um pedido e atualiza estoque
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pedido concluído com sucesso
 */
app.post('/pedidos/:id/concluir', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request()
            .input('id_pedido', sql.Int, req.params.id)
            .execute('sp_concluir_venda');
        res.json({ message: 'Pedido concluído e estoque atualizado.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;

// Iniciar servidor apenas se não estiver em modo de teste
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`API rodando em http://localhost:${PORT}`);
        console.log(`Swagger disponível em http://localhost:${PORT}/api-docs`);
    });
}

// Exportar app para testes
module.exports = app;
