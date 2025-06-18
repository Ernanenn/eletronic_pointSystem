// Variáveis globais (preferencialmente inicializadas após o DOM estar pronto)
let video;
let canvas;
let context;
let stream = null;
let fotoCapturada = false;

// Função auxiliar para exibir mensagens de erro/confirmação em um modal
function showModalMessage(modalId, message, isError = true, title = '') {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        console.error(`Modal com ID '${modalId}' não encontrado.`);
        return;
    }

    const messageElement = modalElement.querySelector(isError ? '#erroMensagem' : '#mensagemConfirmacao');
    const titleElement = modalElement.querySelector('.modal-title'); // Assuming modal-title is used for both
    const iconElement = modalElement.querySelector('.modal-title i'); // Assuming there's an icon within the title

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (titleElement) {
        // Apply classes based on whether it's an error or success
        if (isError) {
            titleElement.classList.remove('text-success');
            titleElement.classList.add('text-danger');
            if (iconElement) iconElement.className = 'fas fa-exclamation-triangle me-2';
            if (!title) title = 'Erro'; // Default error title
        } else {
            titleElement.classList.remove('text-danger');
            titleElement.classList.add('text-success');
            if (iconElement) iconElement.className = 'fas fa-check-circle me-2';
            if (!title) title = 'Registro Confirmado'; // Default success title
        }
        titleElement.innerHTML = `<i class="${iconElement.className}"></i>${title}`;
    }

    new bootstrap.Modal(modalElement).show();
}

// Função para atualizar a data e hora atual
function atualizarDataHora() {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR');

    const dataElement = document.getElementById('dataAtual');
    const horaElement = document.getElementById('horaAtual');

    if (dataElement) {
        dataElement.textContent = dataFormatada;
    }

    if (horaElement) {
        horaElement.textContent = horaFormatada;
    }
}

// Função para iniciar a câmera
async function iniciarCamera() {
    try {
        // Verifica se o navegador suporta a API MediaDevices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Seu navegador não suporta a API de câmera.');
        }

        // Detecta se é um dispositivo móvel
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Configurações de vídeo adaptadas para o tipo de dispositivo
        const videoConstraints = {
            facingMode: isMobile ? 'environment' : 'user', // Câmera traseira em dispositivos móveis
            width: { ideal: isMobile ? 320 : 640 },
            height: { ideal: isMobile ? 320 : 480 },
            aspectRatio: { ideal: 1 } // Proporção quadrada
        };

        // Solicita acesso à câmera com as configurações adaptadas
        stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints
        });

        // Configura o elemento de vídeo
        video.srcObject = stream;

        // Atualiza a interface
        document.getElementById('cameraPlaceholder').classList.add('d-none');
        video.classList.remove('d-none');
        document.getElementById('startCamera').classList.add('d-none');
        document.getElementById('capturePhoto').classList.remove('d-none');
        document.getElementById('resetCamera').classList.remove('d-none');
    } catch (error) {
        console.error('Erro ao acessar a câmera:', error);
        // Usar função de modal em vez de alert
        showModalMessage('erroModal', `Erro ao acessar a câmera: ${error.message}`, true, 'Erro da Câmera');
    }
}

// Função para capturar foto
function capturarFoto() {
    if (!stream || !canvas || !context) {
        console.error('Stream, canvas ou context não estão prontos para captura.');
        showModalMessage('erroModal', 'Não foi possível capturar a foto. Verifique se a câmera está ativa.', true, 'Erro de Captura');
        return;
    }

    // Define as dimensões do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenha o frame atual do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Atualiza a interface
    video.classList.add('d-none');
    canvas.classList.remove('d-none');
    document.getElementById('capturePhoto').classList.add('d-none');

    fotoCapturada = true;
}

// Função para reiniciar a câmera
function reiniciarCamera() {
    // Limpa o canvas
    if (context && canvas) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Atualiza a interface
    canvas.classList.add('d-none');
    video.classList.remove('d-none');
    document.getElementById('capturePhoto').classList.remove('d-none');

    fotoCapturada = false;
}

// Função para parar a câmera
function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Função para validar CPF no servidor
async function validarCPF(cpf) {
    try {
        const response = await fetch('/validar-cpf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cpf })
        });

        const data = await response.json();
        return data.valido;
    } catch (error) {
        console.error('Erro ao validar CPF:', error);
        // Exibir erro no modal em vez de alert
        showModalMessage('erroModal', 'Erro ao validar CPF. Por favor, tente novamente.', true, 'Erro de Validação');
        return false;
    }
}

// Função para registrar o ponto
async function registrarPonto(event) {
    event.preventDefault();

    const cpfInput = document.getElementById('cpf');
    const cpf = cpfInput.value.trim();
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value; // Usar optional chaining para evitar erro se nenhum radio estiver checado

    // Validação do tipo de ponto (entrada, saída, etc.)
    if (!tipo) {
        showModalMessage('erroModal', 'Por favor, selecione o tipo de registro (Entrada, Saída, etc.).', true, 'Erro de Seleção');
        return;
    }

    // Validação do CPF
    if (!cpf) {
        showModalMessage('erroModal', 'Por favor, informe seu CPF.', true);
        cpfInput.focus();
        return;
    }

    const cpfValido = await validarCPF(cpf);
    if (!cpfValido) {
        document.getElementById('cpfFeedback').classList.remove('d-none');
        cpfInput.classList.add('is-invalid');
        cpfInput.focus();
        showModalMessage('erroModal', 'CPF inválido. Por favor, verifique.', true);
        return;
    } else {
        document.getElementById('cpfFeedback').classList.add('d-none');
        cpfInput.classList.remove('is-invalid');
    }

    // Validação da foto
    if (!fotoCapturada) {
        showModalMessage('erroModal', 'Por favor, capture uma foto antes de registrar o ponto.', true);
        return;
    }

    // Obter a imagem do canvas
    const imagemBase64 = canvas.toDataURL('image/jpeg');

    // Mostrar indicador de carregamento
    const btnRegistrar = document.getElementById('btnRegistrar');
    const btnTextoOriginal = btnRegistrar.innerHTML;
    btnRegistrar.disabled = true;
    btnRegistrar.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Processando...';

    // Enviar os dados para o servidor
    try {
        console.log(`Enviando registro de ponto: tipo=${tipo}`);
        const response = await fetch('/registrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cpf,
                tipo,
                imagemBase64: imagemBase64
            })
        });

        const data = await response.json();
        console.log('Resposta do servidor:', data); // Log para depuração

        if (data.sucesso) {
            // Exibir modal de confirmação
            const tipoFormatado = tipo.replace(/_/g, ' ');
            console.log(`Registro de ponto ${tipoFormatado} realizado com sucesso`);
            showModalMessage('confirmacaoModal', `Ponto de ${tipoFormatado} registrado com sucesso!`, false, 'Registro Confirmado');

            // Limpar o formulário e resetar a câmera
            document.getElementById('formRegistroPonto').reset();
            pararCamera();
            canvas.classList.add('d-none');
            document.getElementById('cameraPlaceholder').classList.remove('d-none');
            document.getElementById('startCamera').classList.remove('d-none');
            document.getElementById('capturePhoto').classList.add('d-none');
            document.getElementById('resetCamera').classList.add('d-none');
            fotoCapturada = false;
        } else {
            // Melhorar a exibição de mensagens de erro
            const mensagemErro = data.erro || data.mensagem || 'Erro desconhecido ao registrar ponto.';
            console.error('Erro ao registrar ponto:', mensagemErro);
            showModalMessage('erroModal', mensagemErro, true, 'Erro no Registro');
        }
    } catch (error) {
        console.error('Erro na requisição de registro de ponto:', error);
        showModalMessage('erroModal', 'Ocorreu um erro ao registrar o ponto. Por favor, tente novamente. Verifique sua conexão.', true);
    } finally {
        // Restaurar o botão de registro
        btnRegistrar.disabled = false;
        btnRegistrar.innerHTML = btnTextoOriginal;
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    // Inicializa as variáveis globais de elementos DOM aqui para garantir que eles existam
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    context = canvas ? canvas.getContext('2d') : null;

    // Se canvas ou video não forem encontrados, logar um erro para depuração
    if (!video) console.error('Elemento #video não encontrado no DOM.');
    if (!canvas) console.error('Elemento #canvas não encontrado no DOM.');
    if (!context) console.error('Context 2D do canvas não pode ser obtido. O canvas pode não existir ou não ser um elemento canvas válido.');


    // Atualiza a data e hora a cada segundo
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);

    // Adiciona os event listeners
    const startCameraBtn = document.getElementById('startCamera');
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', iniciarCamera);
    }

    const capturePhotoBtn = document.getElementById('capturePhoto');
    if (capturePhotoBtn) {
        capturePhotoBtn.addEventListener('click', capturarFoto);
    }

    const resetCameraBtn = document.getElementById('resetCamera');
    if (resetCameraBtn) {
        resetCameraBtn.addEventListener('click', reiniciarCamera);
    }

    const formRegistro = document.getElementById('formRegistroPonto');
    if (formRegistro) {
        formRegistro.addEventListener('submit', registrarPonto);
    }

    // Validação do CPF em tempo real
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('blur', async function () {
            const cpf = this.value.trim();
            if (cpf) {
                const cpfValido = await validarCPF(cpf);
                if (!cpfValido) {
                    document.getElementById('cpfFeedback').classList.remove('d-none');
                    this.classList.add('is-invalid');
                } else {
                    document.getElementById('cpfFeedback').classList.add('d-none');
                    this.classList.remove('is-invalid');
                }
            } else {
                // Se o campo CPF estiver vazio, remove os feedbacks de validação
                document.getElementById('cpfFeedback').classList.add('d-none');
                this.classList.remove('is-invalid');
            }
        });
    }
});

// Limpar recursos quando a página for fechada
window.addEventListener('beforeunload', function () {
    pararCamera();
});