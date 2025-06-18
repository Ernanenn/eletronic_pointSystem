/**
 * Função para validar CPF
 * @param {string} cpf - CPF a ser validado (apenas números)
 * @returns {boolean} - Retorna true se o CPF for válido, false caso contrário
 */
function validarCPF(cpf) {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '');

  // Verifica se o CPF tem 11 dígitos
  if (cpf.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CPF inválido, mas com formato correto)
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let dv1 = resto > 9 ? 0 : resto;

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let dv2 = resto > 9 ? 0 : resto;

  // Verifica se os dígitos verificadores estão corretos
  return dv1 == cpf.charAt(9) && dv2 == cpf.charAt(10);
}

/**
 * Função para formatar CPF (adiciona pontos e traço)
 * @param {string} cpf - CPF a ser formatado (apenas números)
 * @returns {string} - CPF formatado (ex: 123.456.789-00)
 */
function formatarCPF(cpf) {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '');

  // Verifica se o CPF tem 11 dígitos
  if (cpf.length !== 11) {
    return cpf;
  }

  // Formata o CPF (ex: 123.456.789-00)
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

module.exports = {
  validarCPF,
  formatarCPF
};