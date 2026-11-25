import { EstadoPartida } from './EstadoPartida.js';
import { MostrandoResultado } from './MostrandoResultado.js';

/**
 * Uma pergunta está na tela e o cronômetro está correndo.
 * Pode: responder e entrar (quem chega atrasado já joga).
 * A pergunta fecha quando todos respondem, quando o tempo acaba
 * ou quando o apresentador avança.
 */
export class PerguntaAberta extends EstadoPartida {
  get nome() {
    return 'PERGUNTA';
  }

  entrar(partida, apelido) {
    return partida.adicionarJogador(apelido);
  }

  responder(partida, jogador, resposta) {
    partida.registrarResposta(jogador, resposta);
    if (partida.todosResponderam()) {
      this.#fecharPergunta(partida);
    }
  }

  /** O apresentador pode encerrar a pergunta antes do tempo. */
  avancar(partida) {
    this.#fecharPergunta(partida);
  }

  tempoEsgotado(partida) {
    this.#fecharPergunta(partida);
  }

  #fecharPergunta(partida) {
    partida.pontuarRodada();
    partida.mudarEstado(new MostrandoResultado());
  }
}
