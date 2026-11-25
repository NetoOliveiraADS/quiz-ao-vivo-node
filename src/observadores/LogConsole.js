import { ObservadorPartida } from './ObservadorPartida.js';

/** OBSERVER concreto: escreve no console tudo o que acontece na partida. */
export class LogConsole extends ObservadorPartida {
  get tipo() {
    return 'console';
  }

  atualizar(mensagem) {
    console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${mensagem}`);
  }

  descricao() {
    return 'Console';
  }
}
