import { ObservadorPartida } from '../observadores/ObservadorPartida.js';
import { paraJogador, paraTelao } from './Visao.js';

// Vários avisos chegam quase juntos (ex.: 20 respostas no mesmo segundo).
// Esperamos um instante e mandamos UMA tela com tudo já atualizado.
const ESPERA_PARA_JUNTAR_MS = 30;

/**
 * OBSERVER concreto: uma tela conectada pelo Socket.IO (o telão ou um celular).
 *
 * Cada navegador que abre o jogo vira um observador da Partida. Quando a Partida
 * avisa que algo mudou, esta classe monta a tela atualizada (Visao.js) e manda
 * pelo evento "tela" só para ESTE navegador (socket.emit).
 */
export class ConexaoSocket extends ObservadorPartida {
  #partida;
  #socket;
  #ehTelao;
  #podeControlar;
  #wifi;
  #idJogador;
  #envioAgendado = null;

  constructor(partida, socket, { ehTelao, podeControlar, idJogador, wifi }) {
    super();
    this.#partida = partida;
    this.#socket = socket;
    this.#ehTelao = ehTelao;
    this.#podeControlar = podeControlar;
    this.#idJogador = idJogador;
    this.#wifi = wifi;
  }

  get idJogador() {
    return this.#idJogador;
  }

  get podeControlar() {
    return this.#podeControlar;
  }

  get tipo() {
    return this.#ehTelao ? 'telão' : 'celular';
  }

  /** Depois que a pessoa entra com um apelido, esta conexão passa a representar o jogador dela. */
  vincularJogador(id) {
    this.#idJogador = id;
  }

  atualizar() {
    if (this.#envioAgendado) {
      return; // já tem um envio marcado: ele vai levar esta mudança também
    }
    this.#envioAgendado = setTimeout(() => {
      this.#envioAgendado = null;
      try {
        this.enviarTela();
      } catch (erro) {
        console.error('Erro ao montar a tela:', erro);
      }
    }, ESPERA_PARA_JUNTAR_MS);
  }

  enviarTela() {
    const tela = this.#ehTelao
      ? paraTelao(this.#partida, { podeControlar: this.#podeControlar, wifi: this.#wifi })
      : paraJogador(this.#partida, this.#idJogador);
    this.#socket.emit('tela', tela);
  }

  /** O navegador desconectou: cancela um envio que estava marcado. */
  encerrar() {
    clearTimeout(this.#envioAgendado);
    this.#envioAgendado = null;
  }

  descricao() {
    if (this.#ehTelao) {
      return this.#podeControlar ? 'Telão' : 'Telão (só assistindo)';
    }
    const jogador = this.#partida.buscar(this.#idJogador);
    return jogador ? `Celular de ${jogador.nome}` : 'Celular';
  }
}
