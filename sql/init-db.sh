#!/bin/bash

# Aguarda o SQL Server subir (pode levar alguns segundos)
echo "Aguardando o SQL Server iniciar..."
sleep 30s

# Executa o script SQL
echo "Executando o script de inicialização..."
/opt/mssql-tools/bin/sqlcmd -S sqlserver -U sa -P "YourStrong@Pass123" -d master -i /tmp/init.sql

echo "Banco de dados inicializado com sucesso!"
