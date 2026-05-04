-- Criação do Banco de Dados
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SistemaVendas')
BEGIN
    CREATE DATABASE SistemaVendas;
END
GO

USE SistemaVendas;
GO

-- 1. Tabela de Cadastro de Clientes (NOVA)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Cliente]') AND type in (N'U'))
BEGIN
    CREATE TABLE Cliente (
        id_cliente INT PRIMARY KEY IDENTITY(1,1),
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        cpf_cnpj VARCHAR(20) UNIQUE NOT NULL,
        data_cadastro DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Tabela de Cadastro Básico de Produto
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Produto]') AND type in (N'U'))
BEGIN
    CREATE TABLE Produto (
        id_produto INT PRIMARY KEY IDENTITY(1,1),
        nome VARCHAR(100) NOT NULL,
        preco_unitario DECIMAL(10, 2) NOT NULL,
        estoque_atual INT DEFAULT 0
    );
END
GO

-- 3. Tabela de Pedido de Venda (ATUALIZADA com FK para Cliente)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PedidoVenda]') AND type in (N'U'))
BEGIN
    CREATE TABLE PedidoVenda (
        id_pedido INT PRIMARY KEY IDENTITY(1,1),
        data_pedido DATETIME DEFAULT GETDATE(),
        id_cliente INT NOT NULL,
        status_pedido VARCHAR(20) DEFAULT 'Pendente',
        CONSTRAINT FK_Pedido_Cliente FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente)
    );
END
GO

-- 4. Tabela de Itens (Produtos) do Pedido de Venda
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ItemPedido]') AND type in (N'U'))
BEGIN
    CREATE TABLE ItemPedido (
        id_item INT PRIMARY KEY IDENTITY(1,1),
        id_pedido INT NOT NULL,
        id_produto INT NOT NULL,
        quantidade INT NOT NULL,
        valor_unitario DECIMAL(10, 2) NOT NULL,
        CONSTRAINT FK_ItemPedido_Pedido FOREIGN KEY (id_pedido) REFERENCES PedidoVenda(id_pedido),
        CONSTRAINT FK_ItemPedido_Produto FOREIGN KEY (id_produto) REFERENCES Produto(id_produto)
    );
END
GO

-- 5. Tabela de Movimentação de Estoque
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MovimentacaoEstoque]') AND type in (N'U'))
BEGIN
    CREATE TABLE MovimentacaoEstoque (
        id_movimentacao INT PRIMARY KEY IDENTITY(1,1),
        id_produto INT NOT NULL,
        quantidade INT NOT NULL,
        tipo_movimentacao CHAR(1) NOT NULL, -- 'E' Entrada, 'S' Saída
        data_movimentacao DATETIME DEFAULT GETDATE(),
        id_pedido INT NULL,
        CONSTRAINT FK_Movimentacao_Produto FOREIGN KEY (id_produto) REFERENCES Produto(id_produto),
        CONSTRAINT FK_Movimentacao_Pedido FOREIGN KEY (id_pedido) REFERENCES PedidoVenda(id_pedido)
    );
END
GO

-- PROCEDURES DE CRUD

-- Clientes
CREATE OR ALTER PROCEDURE sp_cliente_insert
    @nome VARCHAR(100), @email VARCHAR(100), @cpf_cnpj VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @nome IS NULL OR @nome = ''
        BEGIN
            RAISERROR('Nome do cliente é obrigatório.', 16, 1);
            RETURN;
        END
        
        IF @cpf_cnpj IS NULL OR @cpf_cnpj = ''
        BEGIN
            RAISERROR('CPF/CNPJ é obrigatório.', 16, 1);
            RETURN;
        END
        
        IF EXISTS (SELECT 1 FROM Cliente WHERE cpf_cnpj = @cpf_cnpj)
        BEGIN
            RAISERROR('CPF/CNPJ já cadastrado.', 16, 1);
            RETURN;
        END
        
        INSERT INTO Cliente (nome, email, cpf_cnpj) VALUES (@nome, @email, @cpf_cnpj);
        SELECT SCOPE_IDENTITY() AS NewID;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_cliente_update
    @id_cliente INT, @nome VARCHAR(100), @email VARCHAR(100), @cpf_cnpj VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_cliente IS NULL OR @id_cliente <= 0
        BEGIN
            RAISERROR('ID do cliente inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM Cliente WHERE id_cliente = @id_cliente)
        BEGIN
            RAISERROR('Cliente não encontrado.', 16, 1);
            RETURN;
        END
        
        IF @nome IS NULL OR @nome = ''
        BEGIN
            RAISERROR('Nome do cliente é obrigatório.', 16, 1);
            RETURN;
        END
        
        IF @cpf_cnpj IS NULL OR @cpf_cnpj = ''
        BEGIN
            RAISERROR('CPF/CNPJ é obrigatório.', 16, 1);
            RETURN;
        END
        
        IF EXISTS (SELECT 1 FROM Cliente WHERE cpf_cnpj = @cpf_cnpj AND id_cliente != @id_cliente)
        BEGIN
            RAISERROR('CPF/CNPJ já cadastrado para outro cliente.', 16, 1);
            RETURN;
        END
        
        UPDATE Cliente 
        SET nome = @nome, email = @email, cpf_cnpj = @cpf_cnpj
        WHERE id_cliente = @id_cliente;
        
        SELECT @id_cliente AS id_cliente;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_cliente_delete
    @id_cliente INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_cliente IS NULL OR @id_cliente <= 0
        BEGIN
            RAISERROR('ID do cliente inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM Cliente WHERE id_cliente = @id_cliente)
        BEGIN
            RAISERROR('Cliente não encontrado.', 16, 1);
            RETURN;
        END
        
        IF EXISTS (SELECT 1 FROM PedidoVenda WHERE id_cliente = @id_cliente)
        BEGIN
            RAISERROR('Não é possível excluir um cliente que possui pedidos.', 16, 1);
            RETURN;
        END
        
        DELETE FROM Cliente WHERE id_cliente = @id_cliente;
        SELECT 'Cliente deletado com sucesso.' AS message;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_cliente_select
    @id_cliente INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_cliente IS NULL
            SELECT * FROM Cliente ORDER BY id_cliente;
        ELSE
        BEGIN
            IF @id_cliente <= 0
            BEGIN
                RAISERROR('ID do cliente inválido.', 16, 1);
                RETURN;
            END
            
            SELECT * FROM Cliente WHERE id_cliente = @id_cliente;
        END
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Produtos
CREATE OR ALTER PROCEDURE sp_produto_insert
    @nome VARCHAR(100), @preco_unitario DECIMAL(10, 2), @estoque_atual INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @nome IS NULL OR @nome = ''
        BEGIN
            RAISERROR('Nome do produto é obrigatório.', 16, 1);
            RETURN;
        END
        
        IF @preco_unitario IS NULL OR @preco_unitario <= 0
        BEGIN
            RAISERROR('Preço unitário deve ser maior que zero.', 16, 1);
            RETURN;
        END
        
        IF @estoque_atual IS NULL OR @estoque_atual < 0
        BEGIN
            RAISERROR('Estoque não pode ser negativo.', 16, 1);
            RETURN;
        END
        
        INSERT INTO Produto (nome, preco_unitario, estoque_atual) VALUES (@nome, @preco_unitario, @estoque_atual);
        SELECT SCOPE_IDENTITY() AS NewID;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_produto_update
    @id_produto INT, @nome VARCHAR(100), @preco_unitario DECIMAL(10, 2), @estoque_atual INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_produto IS NULL OR @id_produto <= 0
        BEGIN
            RAISERROR('ID do produto inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM Produto WHERE id_produto = @id_produto)
        BEGIN
            RAISERROR('Produto não encontrado.', 16, 1);
            RETURN;
        END
        
        IF @nome IS NULL OR @nome = ''
        BEGIN
            RAISERROR('Nome do produto é obrigatório.', 16, 1);
            RETURN;
        END
        
        IF @preco_unitario IS NULL OR @preco_unitario <= 0
        BEGIN
            RAISERROR('Preço unitário deve ser maior que zero.', 16, 1);
            RETURN;
        END
        
        IF @estoque_atual IS NULL OR @estoque_atual < 0
        BEGIN
            RAISERROR('Estoque não pode ser negativo.', 16, 1);
            RETURN;
        END
        
        UPDATE Produto 
        SET nome = @nome, preco_unitario = @preco_unitario, estoque_atual = @estoque_atual
        WHERE id_produto = @id_produto;
        
        SELECT @id_produto AS id_produto;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_produto_delete
    @id_produto INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_produto IS NULL OR @id_produto <= 0
        BEGIN
            RAISERROR('ID do produto inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM Produto WHERE id_produto = @id_produto)
        BEGIN
            RAISERROR('Produto não encontrado.', 16, 1);
            RETURN;
        END
        
        IF EXISTS (SELECT 1 FROM ItemPedido WHERE id_produto = @id_produto)
        BEGIN
            RAISERROR('Não é possível excluir um produto que possui itens em pedidos de venda.', 16, 1);
            RETURN;
        END
        
        DELETE FROM Produto WHERE id_produto = @id_produto;
        SELECT 'Produto deletado com sucesso.' AS message;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_produto_select
    @id_produto INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_produto IS NULL
            SELECT * FROM Produto ORDER BY id_produto;
        ELSE
        BEGIN
            IF @id_produto <= 0
            BEGIN
                RAISERROR('ID do produto inválido.', 16, 1);
                RETURN;
            END
            
            SELECT * FROM Produto WHERE id_produto = @id_produto;
        END
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Itens do Pedido
CREATE OR ALTER PROCEDURE sp_item_pedido_insert
    @id_pedido INT, @id_produto INT, @quantidade INT, @valor_unitario DECIMAL(10, 2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_pedido IS NULL OR @id_pedido <= 0
        BEGIN
            RAISERROR('ID do pedido inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM PedidoVenda WHERE id_pedido = @id_pedido)
        BEGIN
            RAISERROR('Pedido não encontrado.', 16, 1);
            RETURN;
        END
        
        IF @id_produto IS NULL OR @id_produto <= 0
        BEGIN
            RAISERROR('ID do produto inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM Produto WHERE id_produto = @id_produto)
        BEGIN
            RAISERROR('Produto não encontrado.', 16, 1);
            RETURN;
        END
        
        IF @quantidade IS NULL OR @quantidade <= 0
        BEGIN
            RAISERROR('Quantidade deve ser maior que zero.', 16, 1);
            RETURN;
        END
        
        IF @valor_unitario IS NULL OR @valor_unitario <= 0
        BEGIN
            RAISERROR('Valor unitário deve ser maior que zero.', 16, 1);
            RETURN;
        END
        
        INSERT INTO ItemPedido (id_pedido, id_produto, quantidade, valor_unitario) 
        VALUES (@id_pedido, @id_produto, @quantidade, @valor_unitario);
        
        SELECT SCOPE_IDENTITY() AS NewID;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_item_pedido_update
    @id_item INT, @quantidade INT, @valor_unitario DECIMAL(10, 2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_item IS NULL OR @id_item <= 0
        BEGIN
            RAISERROR('ID do item inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM ItemPedido WHERE id_item = @id_item)
        BEGIN
            RAISERROR('Item do pedido não encontrado.', 16, 1);
            RETURN;
        END
        
        IF @quantidade IS NULL OR @quantidade <= 0
        BEGIN
            RAISERROR('Quantidade deve ser maior que zero.', 16, 1);
            RETURN;
        END
        
        IF @valor_unitario IS NULL OR @valor_unitario <= 0
        BEGIN
            RAISERROR('Valor unitário deve ser maior que zero.', 16, 1);
            RETURN;
        END
        
        UPDATE ItemPedido 
        SET quantidade = @quantidade, valor_unitario = @valor_unitario
        WHERE id_item = @id_item;
        
        SELECT @id_item AS id_item;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_item_pedido_delete
    @id_item INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_item IS NULL OR @id_item <= 0
        BEGIN
            RAISERROR('ID do item inválido.', 16, 1);
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM ItemPedido WHERE id_item = @id_item)
        BEGIN
            RAISERROR('Item do pedido não encontrado.', 16, 1);
            RETURN;
        END
        
        DELETE FROM ItemPedido WHERE id_item = @id_item;
        SELECT 'Item deletado com sucesso.' AS message;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_item_pedido_select
    @id_item INT = NULL, @id_pedido INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_item IS NOT NULL
        BEGIN
            IF @id_item <= 0
            BEGIN
                RAISERROR('ID do item inválido.', 16, 1);
                RETURN;
            END
            SELECT * FROM ItemPedido WHERE id_item = @id_item;
        END
        ELSE IF @id_pedido IS NOT NULL
        BEGIN
            IF @id_pedido <= 0
            BEGIN
                RAISERROR('ID do pedido inválido.', 16, 1);
                RETURN;
            END
            SELECT * FROM ItemPedido WHERE id_pedido = @id_pedido ORDER BY id_item;
        END
        ELSE
            SELECT * FROM ItemPedido ORDER BY id_pedido, id_item;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Pedido de Venda
CREATE OR ALTER PROCEDURE sp_venda_insert
    @id_cliente INT,
    @itens_json NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validações do cliente
        IF @id_cliente IS NULL OR @id_cliente <= 0
        BEGIN
            RAISERROR('ID do cliente inválido.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM Cliente WHERE id_cliente = @id_cliente)
        BEGIN
            RAISERROR('Cliente não encontrado.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Criar pedido
        INSERT INTO PedidoVenda (id_cliente, status_pedido) VALUES (@id_cliente, 'Pendente');
        DECLARE @id_pedido_novo INT = SCOPE_IDENTITY();

        -- Inserir itens se fornecidos
        IF @itens_json IS NOT NULL AND @itens_json != '[]'
        BEGIN
            INSERT INTO ItemPedido (id_pedido, id_produto, quantidade, valor_unitario)
            SELECT
                @id_pedido_novo,
                item.id_produto,
                item.quantidade,
                item.valor_unitario
            FROM OPENJSON(@itens_json) WITH (
                id_produto INT '$.id_produto',
                quantidade INT '$.quantidade',
                valor_unitario DECIMAL(10,2) '$.valor_unitario'
            ) AS item;
        END

        COMMIT TRANSACTION;
        SELECT @id_pedido_novo AS NewID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_venda_update
    @id_pedido INT,
    @id_cliente INT,
    @status_pedido VARCHAR(20)
AS
BEGIN
    UPDATE PedidoVenda 
    SET id_cliente = @id_cliente, status_pedido = @status_pedido
    WHERE id_pedido = @id_pedido;
END
GO

CREATE OR ALTER PROCEDURE sp_venda_delete
    @id_pedido INT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ItemPedido WHERE id_pedido = @id_pedido)
    BEGIN
        RAISERROR('Não é possível excluir um pedido que possui itens.', 16, 1);
        RETURN;
    END
    DELETE FROM PedidoVenda WHERE id_pedido = @id_pedido;
END
GO

CREATE OR ALTER PROCEDURE sp_venda_select
    @id_pedido INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id_pedido IS NULL
            SELECT P.*, C.nome AS nome_cliente FROM PedidoVenda P INNER JOIN Cliente C ON P.id_cliente = C.id_cliente ORDER BY P.id_pedido;
        ELSE
        BEGIN
            IF @id_pedido <= 0
            BEGIN
                RAISERROR('ID do pedido inválido.', 16, 1);
                RETURN;
            END
            SELECT P.*, C.nome AS nome_cliente FROM PedidoVenda P INNER JOIN Cliente C ON P.id_cliente = C.id_cliente WHERE P.id_pedido = @id_pedido;
        END
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- PROCEDURE DE INTEGRAÇÃO DE ESTOQUE
CREATE OR ALTER PROCEDURE sp_concluir_venda
    @id_pedido INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF (SELECT status_pedido FROM PedidoVenda WHERE id_pedido = @id_pedido) = 'Concluido'
        BEGIN
            RAISERROR('Pedido já está concluído.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        INSERT INTO MovimentacaoEstoque (id_produto, quantidade, tipo_movimentacao, id_pedido)
        SELECT id_produto, quantidade, 'S', id_pedido
        FROM ItemPedido
        WHERE id_pedido = @id_pedido;

        UPDATE P
        SET P.estoque_atual = P.estoque_atual - I.quantidade
        FROM Produto P
        INNER JOIN ItemPedido I ON P.id_produto = I.id_produto
        WHERE I.id_pedido = @id_pedido;

        UPDATE PedidoVenda SET status_pedido = 'Concluido' WHERE id_pedido = @id_pedido;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Dados Iniciais para Teste
IF NOT EXISTS (SELECT 1 FROM Cliente)
BEGIN
    INSERT INTO Cliente (nome, email, cpf_cnpj) VALUES ('Cliente Teste', 'teste@email.com', '12345678901');
END

IF NOT EXISTS (SELECT 1 FROM Produto)
BEGIN
    INSERT INTO Produto (nome, preco_unitario, estoque_atual) VALUES ('Produto A', 50.00, 100), ('Produto B', 30.00, 50);
END

IF NOT EXISTS (SELECT 1 FROM PedidoVenda)
BEGIN
    INSERT INTO PedidoVenda (id_cliente, status_pedido) VALUES (1, 'Pendente');
END

IF NOT EXISTS (SELECT 1 FROM ItemPedido)
BEGIN
    INSERT INTO ItemPedido (id_pedido, id_produto, quantidade, valor_unitario) VALUES
        (1, 1, 2, 50.00),
        (1, 2, 1, 30.00);
END
GO
