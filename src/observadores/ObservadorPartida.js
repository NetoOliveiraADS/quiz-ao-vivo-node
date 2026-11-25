/**
 * Cada observador recebe as mudanças da partida em atualizar(mensagem).
 * O painel agrupa as inscrições pelo tipo e usa a descrição nos avisos.
 */
export class ObservadorPartida {
  /** Chamado pela Partida a cada mudança, com uma frase do que aconteceu. */
  atualizar(mensagem) {
    throw new Error(`${this.constructor.name} precisa implementar atualizar(mensagem).`);
  }

  get tipo() {
    return 'outro';
  }

  /** Nome usado nos avisos de conexão e desconexão. */
  descricao() {
    return this.constructor.name;
  }
}
