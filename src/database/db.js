const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Garante que o diretório existe
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Caminho para o arquivo do banco de dados
const dbPath = path.join(dbDir, 'ponto_eletronico.db');

// Cria uma nova instância do banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Inicializa o banco de dados com as tabelas necessárias
function initDatabase() {
  db.serialize(() => {
    // Cria a tabela de registros se não existir
    db.run(`CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cpf TEXT NOT NULL,
            data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
            foto_path TEXT,
            tipo TEXT CHECK(tipo IN ('entrada', 'saida_intervalo', 'retorno_intervalo', 'saida')) NOT NULL
        )`);

    console.log('Banco de dados inicializado com sucesso.');
  });
}

// Função para registrar um ponto
function registrarPonto(cpf, fotoPath, tipo) {
  return new Promise((resolve, reject) => {
    console.log(`Tentando registrar ponto: CPF=${cpf}, tipo=${tipo}`);

    // Verificar se o tipo é válido antes de tentar inserir
    if (!['entrada', 'saida_intervalo', 'retorno_intervalo', 'saida'].includes(tipo)) {
      console.error(`Tipo de registro inválido: ${tipo}`);
      return reject(new Error(`Tipo de registro inválido: ${tipo}`));
    }

    // Verificar se já existe um registro do mesmo tipo hoje
    // Usamos date('now', 'localtime') para garantir que a comparação seja pelo dia local
    const sqlVerificarTipo = `SELECT id FROM registros WHERE cpf = ? AND tipo = ? AND date(data_hora, 'localtime') = date('now', 'localtime')`;

    db.get(sqlVerificarTipo, [cpf, tipo], (err, row) => {
      if (err) {
        console.error(`Erro ao verificar registro existente: ${err.message}`);
        return reject(new Error(`Erro ao verificar registros existentes`));
      }

      if (row) {
        const tipoFormatado = tipo.replace(/_/g, ' ');
        console.error(`Já existe um registro de ${tipoFormatado} hoje para o CPF ${cpf}`);
        return reject(new Error(`Já existe um registro de ${tipoFormatado} hoje para este CPF`));
      }

      // Verificar a sequência lógica dos registros
      if (tipo === 'saida_intervalo' || tipo === 'retorno_intervalo' || tipo === 'saida') {
        // Buscar o último registro para este CPF no mesmo dia
        // Também usando 'localtime' para consistência
        const sqlUltimo = `SELECT tipo, data_hora FROM registros WHERE cpf = ? AND date(data_hora, 'localtime') = date('now', 'localtime') ORDER BY data_hora DESC LIMIT 1`;

        db.get(sqlUltimo, [cpf], (err, row) => {
          if (err) {
            console.error(`Erro ao buscar último registro: ${err.message}`);
            return reject(new Error(`Erro ao verificar sequência de registros`));
          }

          // Verificar se existe um registro anterior no mesmo dia
          if (!row) {
            console.error(`Tentativa de registrar ${tipo} sem registro prévio de entrada hoje`);
            return reject(new Error(`É necessário registrar a entrada antes de registrar ${tipo.replace(/_/g, ' ')}`));
          }

          // Verificar a sequência lógica
          const ultimoTipo = row.tipo;
          let sequenciaValida = false;
          let mensagemErro = '';

          if (tipo === 'saida_intervalo') {
            if (ultimoTipo === 'entrada') {
              sequenciaValida = true;
            } else if (ultimoTipo === 'saida_intervalo') {
              mensagemErro = 'Já existe um registro de saída para intervalo hoje';
            } else if (ultimoTipo === 'retorno_intervalo') {
              mensagemErro = 'Não é possível registrar saída para intervalo após retorno do intervalo';
            } else if (ultimoTipo === 'saida') {
              mensagemErro = 'Não é possível registrar saída para intervalo após saída';
            }
          } else if (tipo === 'retorno_intervalo') {
            if (ultimoTipo === 'saida_intervalo') {
              sequenciaValida = true;
            } else if (ultimoTipo === 'entrada') {
              mensagemErro = 'É necessário registrar saída para intervalo antes do retorno';
            } else if (ultimoTipo === 'retorno_intervalo') {
              mensagemErro = 'Já existe um registro de retorno do intervalo hoje';
            } else if (ultimoTipo === 'saida') {
              mensagemErro = 'Não é possível registrar retorno do intervalo após saída';
            }
          } else if (tipo === 'saida') {
            if (ultimoTipo === 'entrada' || ultimoTipo === 'retorno_intervalo') {
              sequenciaValida = true;
            } else if (ultimoTipo === 'saida_intervalo') {
              mensagemErro = 'É necessário registrar o retorno do intervalo antes da saída';
            } else if (ultimoTipo === 'saida') {
              mensagemErro = 'Já existe um registro de saída hoje';
            }
          }

          if (!sequenciaValida) {
            // Garantir que mensagemErro seja uma string
            const mensagemErroFinal = mensagemErro || `Sequência inválida de registros: ${ultimoTipo.replace(/_/g, ' ')} -> ${tipo.replace(/_/g, ' ')}`;
            console.error(`Sequência inválida: ${ultimoTipo} -> ${tipo}: ${mensagemErroFinal}`);
            return reject(new Error(mensagemErroFinal));
          }

          // Se a sequência for válida, inserir o registro
          inserirRegistro(cpf, fotoPath, tipo, resolve, reject);
        });
      } else {
        // Para registro de entrada, verificar se já existe entrada no mesmo dia
        const sqlEntradaHoje = `SELECT id FROM registros WHERE cpf = ? AND tipo = 'entrada' AND date(data_hora, 'localtime') = date('now', 'localtime')`;

        db.get(sqlEntradaHoje, [cpf], (err, row) => {
          if (err) {
            console.error(`Erro ao verificar entrada existente: ${err.message}`);
            return reject(new Error(`Erro ao verificar registros existentes`));
          }

          if (row) {
            console.error(`Já existe um registro de entrada hoje para o CPF ${cpf}`);
            return reject(new Error(`Já existe um registro de entrada hoje para este CPF`));
          }

          // Se não houver entrada hoje, inserir o registro
          inserirRegistro(cpf, fotoPath, tipo, resolve, reject);
        });
      }
    });
  });
}

// Função auxiliar para inserir o registro no banco
function inserirRegistro(cpf, fotoPath, tipo, resolve, reject) {
  try {
    const sql = `INSERT INTO registros (cpf, foto_path, tipo) VALUES (?, ?, ?)`;
    db.run(sql, [cpf, fotoPath, tipo], function (err) {
      if (err) {
        console.error(`Erro ao inserir registro no banco: ${err.message}`);
        return reject(new Error(`Erro ao inserir registro no banco: ${err.message}`));
      } else {
        console.log(`Registro inserido com sucesso: ID=${this.lastID}, tipo=${tipo}`);
        resolve({
          id: this.lastID,
          cpf,
          fotoPath,
          tipo
        });
      }
    });
  } catch (error) {
    console.error(`Erro inesperado ao inserir registro: ${error.message}`);
    reject(new Error(`Erro inesperado ao inserir registro: ${error.message}`));
  }
}

// Função para buscar registros por CPF (todos os registros, sem filtro de data)
function buscarRegistrosPorCPF(cpf) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM registros WHERE cpf = ? ORDER BY data_hora DESC`;
    db.all(sql, [cpf], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// NOVA FUNÇÃO: Função para buscar registros por CPF para o dia atual
function buscarRegistrosPorCPFEData(cpf) {
  return new Promise((resolve, reject) => {
    // Filtra por CPF e pela data atual (usando 'localtime' para o fuso horário local do servidor)
    const sql = `SELECT * FROM registros WHERE cpf = ? AND date(data_hora, 'localtime') = date('now', 'localtime') ORDER BY data_hora ASC`;
    db.all(sql, [cpf], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Função para buscar todos os registros
function buscarTodosRegistros() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM registros ORDER BY data_hora DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  initDatabase,
  registrarPonto,
  buscarRegistrosPorCPF,
  buscarRegistrosPorCPFEData, // Exporta a nova função
  buscarTodosRegistros
};