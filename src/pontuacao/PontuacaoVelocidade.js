import { EstrategiaPontuacao } from './EstrategiaPontuacao.js';

/** Estratégia 2: quanto mais rápido, mais pontos (1000 na hora, 500 no último segundo). */
export class PontuacaoVelocidade extends EstrategiaPontuacao {
  id = 'velocidade';
  nome = 'Velocidade';
  descricao = 'Acertar rápido vale mais: de 500 a 1000 pontos.';

  pontosPorAcerto(tempoRespostaMs, tempoLimiteMs) {
    const sobrou = Math.max(0, 1 - tempoRespostaMs / tempoLimiteMs); // 1 = na hora, 0 = no fim
    return Math.round(500 + 500 * sobrou);
  }
}
