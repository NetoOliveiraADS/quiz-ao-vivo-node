import { MostrandoResultado } from '../estados/MostrandoResultado.js';
import { PartidaEncerrada } from '../estados/PartidaEncerrada.js';
import { PerguntaAberta } from '../estados/PerguntaAberta.js';
import { estrategiasDisponiveis } from '../pontuacao/estrategias.js';

/*
 * Monta os dados que cada tela recebe pelo evento "tela" do Socket.IO.
 * São objetos comuns do JavaScript: o Socket.IO transforma em JSON sozinho.
 *
 * O telão vê tudo (menos a resposta certa antes da hora); cada celular vê só o que é dele.
 */

export function paraTelao(partida, { podeControlar, wifi }) {
  const tela = comum(partida);
  tela.classeEstado = partida.estado.constructor.name;
  tela.urlEntrada = partida.urlEntrada;
  tela.podeControlar = podeControlar;
  // A senha do Wi-Fi só vai para o telão do próprio apresentador.
  tela.wifi = podeControlar && wifi.nome ? { nome: wifi.nome, senha: wifi.senha } : null;
  tela.pontuacao = partida.pontuacao.id;
  tela.classePontuacao = partida.pontuacao.constructor.name;
  tela.pontuacoes = estrategiasDisponiveis().map((e) => ({ id: e.id, nome: e.nome, descricao: e.descricao }));
  tela.jogadores = partida.classificacao().map(({ posicao, jogador }) => ({
    numero: jogador.numero,
    nome: jogador.nome,
    pontos: jogador.pontos,
    posicao,
    ultimosPontos: jogador.ultimosPontos,
  }));

  const pergunta = perguntaVisivel(partida);
  if (pergunta) {
    tela.pergunta = dadosDaPergunta(partida, pergunta);
    if (partida.estado instanceof MostrandoResultado) {
      tela.resultado = resultadoGeral(partida, pergunta);
    }
  }

  tela.ouvintes = resumirOuvintes(partida.nomesDosOuvintes);
  tela.bastidores = partida.bastidores;
  return tela;
}

export function paraJogador(partida, idJogador) {
  const tela = comum(partida);
  const pergunta = perguntaVisivel(partida);
  if (pergunta) {
    tela.pergunta = dadosDaPergunta(partida, pergunta);
  }

  const eu = partida.buscar(idJogador);
  if (!eu) {
    tela.eu = null; // ainda não entrou (ou foi removido): o celular mostra a tela de entrada
    return tela;
  }

  const classificacao = partida.classificacao();
  const minha = partida.respostaDe(eu);
  tela.eu = {
    nome: eu.nome,
    pontos: eu.pontos,
    posicao: classificacao.find((c) => c.jogador === eu)?.posicao ?? 0,
    respondeu: minha !== null,
    minhaResposta: minha?.valor ?? null,
  };

  if (partida.estado instanceof MostrandoResultado && pergunta) {
    tela.eu.participou = eu.participouDaRodada; // false = chegou depois que a pergunta fechou
    tela.eu.acertou = minha?.correta === true;
    tela.eu.ultimosPontos = eu.ultimosPontos;
    tela.resultado = { indiceCorreto: pergunta.indiceCorreto, respostaCorreta: pergunta.respostaCorreta };
  }

  if (partida.estado instanceof PartidaEncerrada) {
    tela.podio = classificacao.slice(0, 3).map(({ posicao, jogador }) => ({
      nome: jogador.nome,
      pontos: jogador.pontos,
      posicao,
    }));
  }
  return tela;
}

function comum(partida) {
  return {
    estado: partida.estado.nome,
    rodada: partida.indicePergunta + 1,
    totalRodadas: partida.totalPerguntas,
    totalJogadores: partida.totalJogadores,
    respondidas: partida.respostas.length,
  };
}

/** A pergunta só aparece enquanto está aberta e no resultado. */
function perguntaVisivel(partida) {
  const estado = partida.estado;
  const visivel = estado instanceof PerguntaAberta || estado instanceof MostrandoResultado;
  return visivel ? partida.perguntaAtual : null;
}

/** Atenção: aqui NÃO vai a resposta certa. Ela só é enviada no resultado (nada de colar pelo F12). */
function dadosDaPergunta(partida, pergunta) {
  const aberta = partida.estado instanceof PerguntaAberta;
  return {
    tipo: pergunta.tipo,
    enunciado: pergunta.enunciado,
    opcoes: [...pergunta.opcoes],
    tempoTotalMs: pergunta.tempoLimiteMs,
    restanteMs: aberta ? partida.restanteMs : 0,
  };
}

function resultadoGeral(partida, pergunta) {
  const votos = new Array(pergunta.opcoes.length).fill(0);
  let acertos = 0;
  for (const resposta of partida.respostas) {
    if (resposta.correta) {
      acertos++;
    }
    votos[Number(resposta.valor)]++;
  }
  return {
    indiceCorreto: pergunta.indiceCorreto,
    respostaCorreta: pergunta.respostaCorreta,
    distribuicao: votos,
    acertos,
  };
}

/** "Telão, Console, 2 celulares": quem está ouvindo a Partida agora. */
function resumirOuvintes(nomes) {
  const celulares = nomes.filter((nome) => nome.startsWith('Celular')).length;
  const outros = nomes.filter((nome) => !nome.startsWith('Celular'));
  if (celulares > 0) {
    outros.push(celulares === 1 ? '1 celular' : `${celulares} celulares`);
  }
  return outros.join(', ');
}
