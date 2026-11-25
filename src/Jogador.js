/**
 * Uma pessoa (ou um robô de teste) jogando.
 * Os campos com # são privados: de fora só dá para LER, e só esta classe muda os pontos.
 */
export class Jogador {
  #id;      // segredo guardado no celular: prova quem está respondendo
  #numero;  // número público, usado pelo telão para remover alguém
  #nome;
  #pontos = 0;
  #ultimosPontos = 0;          // pontos ganhos na última pergunta
  #participouDaRodada = false; // já estava no jogo quando a última pergunta fechou

  constructor(id, numero, nome) {
    this.#id = id;
    this.#numero = numero;
    this.#nome = nome;
  }

  /** Chamado quando uma pergunta fecha. */
  registrarRodada(pontosGanhos) {
    this.#participouDaRodada = true;
    this.#ultimosPontos = pontosGanhos;
    this.#pontos += pontosGanhos;
  }

  /** "Nova partida": mesmos jogadores, placar zerado. */
  zerar() {
    this.#pontos = 0;
    this.#ultimosPontos = 0;
    this.#participouDaRodada = false;
  }

  get id() { return this.#id; }
  get numero() { return this.#numero; }
  get nome() { return this.#nome; }
  get pontos() { return this.#pontos; }
  get ultimosPontos() { return this.#ultimosPontos; }
  get participouDaRodada() { return this.#participouDaRodada; }
}
