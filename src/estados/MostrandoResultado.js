import { EstadoPartida } from './EstadoPartida.js';
import { PartidaEncerrada } from './PartidaEncerrada.js';
import { PerguntaAberta } from './PerguntaAberta.js';

/**
 * Mostra a resposta certa e o placar.
 * Pode: entrar e avançar (para a próxima pergunta ou para o fim).
 * Não pode: responder (a pergunta já fechou).
 */
export class MostrandoResultado extends EstadoPartida {
  rotulo = 'Resultado da pergunta';

  get nome() {
    return 'RESULTADO';
  }

  entrar(partida, apelido) {
    return partida.adicionarJogador(apelido);
  }

  avancar(partida) {
    if (partida.temProximaPergunta()) {
      partida.abrirPergunta(partida.indicePergunta + 1);
      partida.mudarEstado(new PerguntaAberta());
    } else {
      partida.mudarEstado(new PartidaEncerrada());
    }
  }
}
