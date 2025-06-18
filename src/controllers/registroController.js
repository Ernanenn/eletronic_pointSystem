const fs = require('fs');
const path = require('path');
const { registrarPonto, buscarRegistrosPorCPF, buscarTodosRegistros } = require('../database/db');
const { validarCPF: validarCpfUtil } = require('../utils/validadores'); // Importa a função validarCPF do utilitário

// Garante que o diretório de uploads existe
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Renderiza a página inicial
exports.index = (req, res) => {
    res.render('index');
};

// Renderiza a página de histórico
exports.historico = async (req, res) => {
    try {
        const cpf = req.query.cpf;
        let registros;

        if (cpf) {
            registros = await buscarRegistrosPorCPF(cpf);
        } else {
            registros = await buscarTodosRegistros();
        }

        // Formata a data e hora para exibição
        registros = registros.map(registro => {
            const data = new Date(registro.data_hora);
            return {
                ...registro,
                data_formatada: data.toLocaleDateString('pt-BR'),
                hora_formatada: data.toLocaleTimeString('pt-BR')
            };
        });

        res.render('historico', { registros, cpf, erro: null }); // Passa null para erro se tudo ocorrer bem
    } catch (error) {
        console.error('Erro ao buscar registros:', error);
        // Melhoria: Renderizar a página de histórico com uma mensagem de erro
        res.render('historico', { registros: [], cpf: req.query.cpf, erro: 'Ocorreu um erro ao buscar os registros. Por favor, tente novamente.' });
    }
};

// Processa o registro de ponto
exports.registrarPonto = async (req, res) => {
    try {
        const { cpf, tipo, imagemBase64 } = req.body;

        // Validação básica do CPF (usando a função do utilitário)
        if (!validarCpfUtil(cpf)) {
            return res.status(400).json({ sucesso: false, erro: 'CPF inválido' });
        }

        // Validação do tipo de registro
        if (tipo !== 'entrada' && tipo !== 'saida_intervalo' && tipo !== 'retorno_intervalo' && tipo !== 'saida') {
            return res.status(400).json({ sucesso: false, erro: 'Tipo de registro inválido' });
        }

        // Processa a imagem base64
        let fotoPath = null;
        if (imagemBase64) {
            // Remove o prefixo da string base64 (ex: data:image/jpeg;base64,)
            const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Cria um nome de arquivo único
            const timestamp = Date.now();
            fotoPath = `uploads/${cpf}-${timestamp}.jpg`;
            const filePath = path.join(__dirname, '../../public', fotoPath);

            // Salva a imagem no sistema de arquivos
            fs.writeFileSync(filePath, buffer);
        }

        // Registra o ponto no banco de dados
        try {
            const registro = await registrarPonto(cpf, fotoPath, tipo);

            // Formata o tipo para exibição, substituindo underscores por espaços
            const tipoFormatado = tipo.replace(/_/g, ' ');

            console.log(`Registro de ponto ${tipo} realizado com sucesso:`, registro);

            res.status(201).json({
                sucesso: true,
                mensagem: `Ponto de ${tipoFormatado} registrado com sucesso!`,
                registro
            });
        } catch (error) {
            console.error(`Erro ao registrar ponto do tipo ${tipo}:`, error);
            // Retorna a mensagem de erro específica do banco de dados
            res.status(400).json({
                sucesso: false,
                erro: error.message || `Erro ao registrar ponto do tipo ${tipo}`
            });
        }
    } catch (error) {
        console.error('Erro ao processar requisição de registro:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro ao registrar ponto' });
    }
};

// Função para validar CPF (agora utilizando a função do utilitário)
exports.validarCPF = (req, res) => {
    const { cpf } = req.body;
    const valido = validarCpfUtil(cpf); // Usa a função importada
    return res.json({ valido });
};