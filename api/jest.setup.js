// Configurar ambiente de testes
process.env.NODE_ENV = 'test';
process.env.DB_USER = 'sa';
process.env.DB_PASSWORD = 'YourStrong@Pass123';
// Dentro do Docker usa o nome do serviço; fora do Docker usa localhost
process.env.DB_SERVER = process.env.DB_SERVER || 'localhost';
process.env.DB_NAME = 'SistemaVendas';

// Aumentar timeout para operações de banco de dados
jest.setTimeout(30000);
