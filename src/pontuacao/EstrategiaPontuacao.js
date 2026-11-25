/**
 * Strategy. Cada regra implementa pontosPorAcerto e informa id, nome e descricao.
 * A Partida chama o mesmo método na estratégia escolhida na sala de espera.
 * As opções do apresentador são reunidas em estrategias.js.
 */
export class EstrategiaPontuacao {
  /** Quantos pontos vale um acerto? (Errar sempre vale zero.) */
  pontosPorAcerto(tempoRespostaMs, tempoLimiteMs) {
    throw new Error(`${this.constructor.name} precisa implementar pontosPorAcerto().`);
  }
}
