/**
 * Erro "esperado": alguém tentou algo que não pode (ex.: responder na sala de espera)
 * ou mandou um dado inválido. A mensagem vai direto para a tela da pessoa.
 *
 * Separar este tipo de erro dos erros "de verdade" (bugs) permite tratar cada um
 * de um jeito: AcaoInvalida vira um aviso amigável; qualquer outro erro vai para o console.
 */
export class AcaoInvalida extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'AcaoInvalida';
  }
}
