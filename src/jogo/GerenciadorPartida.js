import { Partida } from './Partida.js';

// Só este módulo tem a chave para construir o gerenciador.
const acessoInterno = Symbol();

/** Singleton. Cada processo do servidor mantém uma sala para o telão e os celulares. */
export class GerenciadorPartida {
  static #instancia;
  #partida;

  static obterInstancia(perguntas) {
    if (!GerenciadorPartida.#instancia) {
      GerenciadorPartida.#instancia = new GerenciadorPartida(acessoInterno, perguntas);
    }
    return GerenciadorPartida.#instancia;
  }

  constructor(chave, perguntas) {
    if (chave !== acessoInterno) {
      throw new Error('Use GerenciadorPartida.obterInstancia().');
    }
    this.#partida = new Partida(perguntas);
  }

  get partida() {
    return this.#partida;
  }
}
