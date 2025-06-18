const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');

// Rota para a página inicial
router.get('/', registroController.index);

// Rota para a página de histórico
router.get('/historico', registroController.historico);

// Rota para registrar ponto
router.post('/registrar', registroController.registrarPonto);

// Rota para validar CPF
router.post('/validar-cpf', registroController.validarCPF);

module.exports = router;