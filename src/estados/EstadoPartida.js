import { AcaoInvalida } from '../erros.js';

/**
 * PADRÃO STATE: a classe base de todos os estados da partida.
 *
 * A Partida (o "contexto") não tem if/else do tipo "se está na pergunta, faça isso...".
 * Ela repassa a ação para o estado atual, e cada estado decide:
 *   - se a ação é permitida;
 *   - o que acontece;
 *   - para qual estado ir depois.
 *
 * O JavaScript não tem "interface" como o Java. Por isso esta é uma classe base:
 * por padrão TUDO é proibido, e cada estado concreto sobrescreve só o que libera.
 */
export class EstadoPartida {
  constructor() {
    // new.target é a classe que foi usada no "new". Se for esta, é erro: ela é abstrata.
    if (new.target === EstadoPartida) {
      throw new Error('EstadoPartida é abstrata: use um estado concreto.');
    }
  }

  /** Nome curto que as telas usam: AGUARDANDO, PERGUNTA, RESULTADO ou ENCERRADA. */
  get nome() {
    throw new Error(`${this.constructor.name} precisa dizer o seu nome.`);
  }

  entrar(partida, apelido) {
    throw this.proibido('entrar na partida');
  }

  responder(partida, jogador, resposta) {
    throw this.proibido('responder');
  }

  avancar(partida) {
    throw this.proibido('avançar');
  }

  trocarPontuacao(partida, estrategia) {
    throw this.proibido('trocar a pontuação');
  }

  /** Chamado pelo cronômetro. Fora de uma pergunta, o fim do tempo não significa nada. */
  tempoEsgotado(partida) {}

  proibido(acao) {
    return new AcaoInvalida(`Não dá para ${acao} agora (estado: ${this.constructor.name}).`);
  }
}
