const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts'); // Importa o express-ejs-layouts

const { initDatabase } = require('./src/database/db');
const registroRoutes = require('./src/routes/registroRoutes');

// Inicializa o aplicativo Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configura o middleware de layouts EJS
app.use(expressLayouts);
app.set('layout', 'layout'); // Define 'layout.ejs' como o layout padrão
// Opcional: para não usar layout em rotas específicas, você pode passar { layout: false } no res.render()

// Middleware para processar dados do formulário
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa o banco de dados
initDatabase();

// Rotas
app.use('/', registroRoutes);

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});