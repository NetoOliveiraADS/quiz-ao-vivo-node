/**
 * PADRÃO STRATEGY: a "forma" de toda regra de pontuação.
 *
 * A Partida só conhece esta classe. O apresentador escolhe a regra na sala de espera
 * e o jogo passa a pontuar de outro jeito, sem nenhum if/else na Partida.
 * Regra nova = uma subclasse nova, colocada na lista de estrategias.js.
 *
 * O JavaScript não tem "interface" como o Java, por isso usamos uma classe base.
 * Cada estratégia também tem id (usado pelo telão), nome e descricao.
 */
export class EstrategiaPontuacao {
  /** Quantos pontos vale um acerto? (Errar sempre vale zero.) */
  pontosPorAcerto(tempoRespostaMs, tempoLimiteMs) {
    throw new Error(`${this.constructor.name} precisa implementar pontosPorAcerto().`);
  }
}
