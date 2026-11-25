import { AguardandoJogadores } from './AguardandoJogadores.js';
import { EstadoPartida } from './EstadoPartida.js';

/**
 * Fim de jogo: o pódio está na tela.
 * Pode: avançar ("Nova partida": mesmos jogadores, placar zerado).
 * Não pode: entrar nem responder.
 */
export class PartidaEncerrada extends EstadoPartida {
  rotulo = 'Fim da partida';

  get nome() {
    return 'ENCERRADA';
  }

  avancar(partida) {
    partida.zerarPlacar();
    partida.mudarEstado(new AguardandoJogadores());
  }
}
