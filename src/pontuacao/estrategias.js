import { PontuacaoSimples } from './PontuacaoSimples.js';
import { PontuacaoVelocidade } from './PontuacaoVelocidade.js';

/** As regras que o apresentador pode escolher, na ordem do telão. */
export function estrategiasDisponiveis() {
  return [new PontuacaoSimples(), new PontuacaoVelocidade()];
}
