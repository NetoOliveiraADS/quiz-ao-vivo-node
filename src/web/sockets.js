import { AcaoInvalida } from '../erros.js';
import { ConexaoSocket } from './ConexaoSocket.js';
import { vemDesteComputador } from './rede.js';

/*
 * Liga o Socket.IO à Partida.
 *
 * Eventos que o NAVEGADOR manda para o servidor (socket.emit no navegador):
 *   entrar        (apelido)            -> o celular entra na partida
 *   responder     (resposta)           -> o celular responde a pergunta aberta
 *   apresentador  ({ acao, ... })      -> o telão avança, troca a pontuação ou remove alguém
 * Cada um recebe de volta, na hora, { ok: true } ou { ok: false, erro } (o "acknowledgement").
 *
 * Evento que o SERVIDOR manda para o navegador:
 *   tela          (dados da tela)      -> sempre que algo muda na partida
 */
export function configurarSockets(io, partida, { wifi }) {
  io.on('connection', (socket) => {
    // "auth" são os dados que o navegador mandou ao conectar: quem ele é.
    const auth = socket.handshake.auth ?? {};
    const ehTelao = auth.tipo === 'telao';
    const idSalvo = typeof auth.id === 'string' && partida.buscar(auth.id) ? auth.id : null;

    const conexao = new ConexaoSocket(partida, socket, {
      ehTelao,
      podeControlar: ehTelao && vemDesteComputador(socket.handshake),
      idJogador: ehTelao ? null : idSalvo,
      wifi,
    });
    partida.inscrever(conexao); // OBSERVER: a partir de agora esta tela é avisada de tudo
    conexao.enviarTela();       // e já recebe a tela atual

    socket.on('entrar', (apelido, responder) => {
      tratar(responder, () => {
        if (ehTelao) {
          throw new AcaoInvalida('O telão não joga.');
        }
        const jogador = partida.entrar(apelido);
        conexao.vincularJogador(jogador.id);
        conexao.enviarTela();
        return { id: jogador.id, nome: jogador.nome };
      });
    });

    socket.on('responder', (resposta, responder) => {
      tratar(responder, () => {
        if (!conexao.idJogador) {
          throw new AcaoInvalida('Entre na partida primeiro.');
        }
        partida.responder(conexao.idJogador, resposta);
      });
    });

    socket.on('apresentador', (pedido, responder) => {
      tratar(responder, () => {
        if (!conexao.podeControlar) {
          throw new AcaoInvalida('Só o computador do apresentador pode controlar o jogo.');
        }
        executarAcaoDoApresentador(partida, pedido);
      });
    });

    socket.on('disconnect', () => {
      conexao.encerrar();
      partida.cancelarInscricao(conexao); // OBSERVER: esta tela não é mais avisada
    });
  });
}

function executarAcaoDoApresentador(partida, pedido) {
  switch (pedido?.acao) {
    case 'avancar':
      partida.avancar();
      break;
    case 'pontuacao':
      partida.trocarPontuacao(pedido.valor);
      break;
    case 'remover':
      partida.removerJogador(pedido.numero);
      break;
    default:
      throw new AcaoInvalida('Ação desconhecida.');
  }
}

/** Executa a ação e devolve { ok: true, ... } ou { ok: false, erro } para quem pediu. */
function tratar(responder, acao) {
  const devolver = typeof responder === 'function' ? responder : () => {};
  try {
    devolver({ ok: true, ...acao() });
  } catch (erro) {
    if (erro instanceof AcaoInvalida) {
      devolver({ ok: false, erro: erro.message }); // erro esperado: vira aviso na tela
    } else {
      console.error('Erro inesperado:', erro);    // bug: vai para o console
      devolver({ ok: false, erro: 'Erro no servidor.' });
    }
  }
}
