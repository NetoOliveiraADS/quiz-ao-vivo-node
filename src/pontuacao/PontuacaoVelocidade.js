import { EstrategiaPontuacao } from './EstrategiaPontuacao.js';

/** Um acerto vale 500 pontos de base e até 500 de bônus pelo tempo restante. */
export class PontuacaoVelocidade extends EstrategiaPontuacao {
  id = 'velocidade';
  nome = 'Velocidade';
  descricao = 'Cada acerto vale 500 pontos e até 500 de bônus por rapidez.';

  pontosPorAcerto(tempoRespostaMs, tempoLimiteMs) {
    const sobrou = Math.max(0, 1 - tempoRespostaMs / tempoLimiteMs); // 1 = na hora, 0 = no fim
    return Math.round(500 + 500 * sobrou);
  }
}
