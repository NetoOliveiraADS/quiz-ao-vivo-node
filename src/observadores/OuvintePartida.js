/**
 * PADRÃO OBSERVER: o "contrato" de quem quer ser avisado das mudanças da partida.
 *
 * Quem estende OuvintePartida escreve atualizar(mensagem) e se inscreve com
 * partida.inscrever(...). A Partida não sabe QUEM está ouvindo (o telão, um celular
 * ou o console): para ela, todos são "um OuvintePartida".
 *
 * O JavaScript não tem "interface" como o Java, por isso usamos uma classe base.
 */
export class OuvintePartida {
  /** Chamado pela Partida a cada mudança, com uma frase do que aconteceu. */
  atualizar(mensagem) {
    throw new Error(`${this.constructor.name} precisa implementar atualizar(mensagem).`);
  }

  /** Nome amigável, usado no console e no painel Bastidores. */
  descricao() {
    return this.constructor.name;
  }
}
