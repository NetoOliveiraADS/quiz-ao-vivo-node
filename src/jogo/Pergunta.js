import { AcaoInvalida } from './AcaoInvalida.js';

/**
 * Uma pergunta do quiz: múltipla escolha (ME) ou verdadeiro ou falso (VF).
 * A resposta é sempre o número da opção: "0", "1", "2" ou "3".
 */
export class Pergunta {
  constructor(tipo, enunciado, segundos, opcoes, indiceCorreto) {
    this.tipo = tipo;
    this.enunciado = enunciado;
    this.tempoLimiteMs = segundos * 1000;
    this.opcoes = Object.freeze([...opcoes]);
    this.indiceCorreto = indiceCorreto;
    Object.freeze(this); // depois de criada, ninguém altera a pergunta
  }

  get respostaCorreta() {
    return this.opcoes[this.indiceCorreto];
  }

  /** Lança AcaoInvalida se a resposta não for uma das opções. */
  validar(resposta) {
    const indice = Number(resposta);
    if (resposta === '' || !Number.isInteger(indice) || indice < 0 || indice >= this.opcoes.length) {
      throw new AcaoInvalida('Essa opção não existe.');
    }
  }

  estaCorreta(resposta) {
    return Number(resposta) === this.indiceCorreto;
  }
}
