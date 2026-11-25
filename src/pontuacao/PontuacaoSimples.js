import { EstrategiaPontuacao } from './EstrategiaPontuacao.js';

/** Estratégia 1: todo acerto vale 1000, não importa o tempo. */
export class PontuacaoSimples extends EstrategiaPontuacao {
  id = 'simples';
  nome = 'Simples';
  descricao = 'Todo acerto vale 1000 pontos, rápido ou não.';

  pontosPorAcerto() {
    return 1000;
  }
}
