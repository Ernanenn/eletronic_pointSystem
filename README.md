# Sistema de Registro de Ponto Eletrônico
Este é um sistema de registro de ponto eletrônico que permite aos usuários registrarem sua presença através de CPF e foto. O sistema registra a data, o horário e a foto tirada em um banco de dados.

## Funcionalidades
- Registro de ponto através de CPF e foto
- Armazenamento de registros em banco de dados
- Interface amigável e responsiva
- Validação de CPF
- Captura de foto via webcam

## Tecnologias Utilizadas
- Frontend: HTML, CSS, JavaScript, Bootstrap
- Backend: Node.js, Express
- Banco de Dados: SQLite
- Captura de Imagem: MediaDevices API

## Estrutura do Projeto
```
├── public/              # Arquivos estáticos
│   ├── css/            # Estilos CSS
│   ├── js/             # Scripts JavaScript
│   └── img/            # Imagens
├── src/                # Código fonte
│   ├── controllers/    # Controladores
│   ├── models/         # Modelos de dados
│   ├── routes/         # Rotas da API
│   ├── database/       # Configuração do banco de dados
│   └── utils/          # Utilitários
├── views/              # Templates HTML
├── app.js              # Arquivo principal da aplicação
├── package.json        # Dependências do projeto
└── README.md           # Documentação
```

## Como Executar
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Inicie o servidor: `npm start`
4. Acesse a aplicação em: `http://localhost:3000`

## Licença
Este projeto está licenciado sob a licença MIT.