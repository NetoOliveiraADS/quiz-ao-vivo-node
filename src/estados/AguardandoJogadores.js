import { AcaoInvalida } from '../jogo/AcaoInvalida.js';
import { EstadoPartida } from './EstadoPartida.js';
import { PerguntaAberta } from './PerguntaAberta.js';

/**
 * Estado inicial: a sala de espera.
 * Pode: entrar, trocar a pontuação e começar o jogo.
 * Não pode: responder (ainda não existe pergunta!).
 */
export class AguardandoJogadores extends EstadoPartida {
  rotulo = 'Aguardando jogadores';

  get nome() {
    return 'AGUARDANDO';
  }

  entrar(partida, apelido) {
    return partida.adicionarJogador(apelido);
  }

  trocarPontuacao(partida, estrategia) {
    partida.definirPontuacao(estrategia);
  }

  /** "Começar": abre a primeira pergunta. */
  avancar(partida) {
    if (partida.totalJogadores === 0) {
      throw new AcaoInvalida('Espere pelo menos uma pessoa entrar.');
    }
    partida.abrirPergunta(0);
    partida.mudarEstado(new PerguntaAberta());
  }
}
