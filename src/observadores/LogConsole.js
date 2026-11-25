import { OuvintePartida } from './OuvintePartida.js';

/** OBSERVER concreto: escreve no console tudo o que acontece na partida. */
export class LogConsole extends OuvintePartida {
  atualizar(mensagem) {
    console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${mensagem}`);
  }

  descricao() {
    return 'Console';
  }
}
