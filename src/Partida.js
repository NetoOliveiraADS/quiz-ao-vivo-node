import { randomUUID } from 'node:crypto';
import { AcaoInvalida } from './erros.js';
import { Jogador } from './Jogador.js';
import { AguardandoJogadores } from './estados/AguardandoJogadores.js';
import { PontuacaoVelocidade } from './pontuacao/PontuacaoVelocidade.js';
import { estrategiasDisponiveis } from './pontuacao/estrategias.js';

/**
 * A partida: o coração do jogo. Os três padrões se encontram aqui:
 *
 *  - STATE (contexto): guarda o estado atual e repassa cada ação para ele.
 *    Quem decide se a ação é permitida é o estado, não a Partida.
 *  - OBSERVER (sujeito): guarda a lista de ouvintes e avisa todos a cada mudança.
 *  - STRATEGY (contexto): usa uma regra de pontuação que pode ser trocada.
 *
 * Os campos que começam com # são PRIVADOS: só o código desta classe mexe neles.
 *
 * Não precisa de "synchronized" como no Java: o Node.js trata um evento de cada vez
 * (o "event loop"), então duas respostas nunca são processadas ao mesmo tempo.
 */
export class Partida {
  #estado = new AguardandoJogadores();  // STATE
  #ouvintes = [];                       // OBSERVER
  #pontuacao = new PontuacaoVelocidade(); // STRATEGY

  #perguntas;
  #jogadores = new Map();   // id secreto -> Jogador
  #respostas = new Map();   // Jogador -> resposta da pergunta atual
  #proximoNumero = 1;
  #indicePergunta = -1;
  #inicioDaPerguntaMs = 0;
  #rodada = 0;              // muda a cada pergunta; ignora cronômetros atrasados
  #cronometro = null;
  #bastidores = [];         // linhas do painel Bastidores do telão
  urlEntrada = '';          // endereço que os celulares abrem

  constructor(perguntas) {
    this.#perguntas = [...perguntas];
  }

  // ═══════════ Ações que chegam das telas: cada uma é repassada ao ESTADO atual ═══════════

  entrar(apelido) {
    return this.#estado.entrar(this, limparApelido(apelido));
  }

  responder(idJogador, resposta) {
    const jogador = this.buscar(idJogador);
    if (!jogador) {
      throw new AcaoInvalida('Jogador não encontrado. Entre de novo.');
    }
    this.#estado.responder(this, jogador, String(resposta ?? '').trim());
  }

  avancar() {
    this.#estado.avancar(this);
  }

  trocarPontuacao(id) {
    const escolhida = estrategiasDisponiveis().find((e) => e.id === id);
    if (!escolhida) {
      throw new AcaoInvalida(`Pontuação desconhecida: ${id}`);
    }
    this.#estado.trocarPontuacao(this, escolhida);
  }

  /** O apresentador pode tirar alguém (um apelido impróprio, por exemplo). */
  removerJogador(numero) {
    const alvo = [...this.#jogadores.values()].find((j) => j.numero === Number(numero));
    if (!alvo) {
      throw new AcaoInvalida('Esse jogador já saiu.');
    }
    this.#jogadores.delete(alvo.id);
    this.#respostas.delete(alvo);
    this.#notificar(`${alvo.nome} foi removido`);
  }

  // ═══════════════════════════════════ OBSERVER ═══════════════════════════════════

  inscrever(ouvinte) {
    this.#ouvintes.push(ouvinte);
    this.#notificar(`${ouvinte.descricao()} conectou`);
  }

  cancelarInscricao(ouvinte) {
    const posicao = this.#ouvintes.indexOf(ouvinte);
    if (posicao !== -1) {
      this.#ouvintes.splice(posicao, 1);
      this.#notificar(`${ouvinte.descricao()} saiu`);
    }
  }

  /** Avisa TODOS os ouvintes, com uma frase do que mudou. A Partida não sabe se é o telão, um celular ou o console. */
  #notificar(mensagem) {
    // Percorre uma CÓPIA da lista: um ouvinte pode sair dela durante o aviso.
    for (const ouvinte of [...this.#ouvintes]) {
      try {
        ouvinte.atualizar(mensagem);
      } catch (erro) {
        console.error(`Erro no ouvinte ${ouvinte.descricao()}:`, erro);
      }
    }
  }

  // ═══════════ Operações usadas pelos ESTADOS (são eles que decidem QUANDO chamar) ═══════════

  adicionarJogador(apelido) {
    for (const existente of this.#jogadores.values()) {
      if (existente.nome.toLowerCase() === apelido.toLowerCase()) {
        throw new AcaoInvalida(`Já tem alguém chamado "${apelido}". Escolha outro apelido.`);
      }
    }
    const novo = new Jogador(randomUUID(), this.#proximoNumero++, apelido);
    this.#jogadores.set(novo.id, novo);
    this.#notificar(`${apelido} entrou`);
    return novo;
  }

  definirPontuacao(nova) {
    this.#pontuacao = nova;
    this.#registrarBastidor('Strategy', `Regra trocada para ${nova.constructor.name}`);
    this.#notificar(`Pontuação: ${nova.nome}`);
  }

  abrirPergunta(indice) {
    clearTimeout(this.#cronometro);
    this.#indicePergunta = indice;
    this.#respostas.clear();
    this.#inicioDaPerguntaMs = Date.now();
    const estaRodada = ++this.#rodada;
    // setTimeout agenda o fim do tempo sem travar o servidor.
    this.#cronometro = setTimeout(() => {
      if (estaRodada === this.#rodada) {
        this.#estado.tempoEsgotado(this);
      }
    }, this.perguntaAtual.tempoLimiteMs);
  }

  registrarResposta(jogador, valor) {
    if (this.#respostas.has(jogador)) {
      throw new AcaoInvalida('Você já respondeu esta pergunta.');
    }
    const pergunta = this.perguntaAtual;
    pergunta.validar(valor);
    this.#respostas.set(jogador, Object.freeze({
      valor,
      tempoMs: Date.now() - this.#inicioDaPerguntaMs,
      correta: pergunta.estaCorreta(valor),
    }));
    this.#notificar(`${jogador.nome} respondeu (${this.#respostas.size}/${this.#jogadores.size})`);
  }

  todosResponderam() {
    return this.#respostas.size >= this.#jogadores.size;
  }

  /** Usa a ESTRATÉGIA de pontuação atual para dar os pontos da pergunta que acabou. */
  pontuarRodada() {
    clearTimeout(this.#cronometro);
    let acertos = 0;
    let distribuidos = 0;
    for (const jogador of this.#jogadores.values()) {
      const resposta = this.#respostas.get(jogador);
      let pontos = 0;
      if (resposta?.correta) {
        pontos = this.#pontuacao.pontosPorAcerto(resposta.tempoMs, this.perguntaAtual.tempoLimiteMs);
        acertos++;
        distribuidos += pontos;
      }
      jogador.registrarRodada(pontos);
    }
    const regra = this.#pontuacao.constructor.name;
    this.#registrarBastidor('Strategy', acertos === 0
      ? `${regra}: ninguém acertou`
      : `${regra}: ${distribuidos.toLocaleString('pt-BR')} pontos para ${acertos} ${acertos === 1 ? 'acerto' : 'acertos'}`);
  }

  temProximaPergunta() {
    return this.#indicePergunta + 1 < this.#perguntas.length;
  }

  /** A troca de estado em si. Quem chama são os próprios estados. */
  mudarEstado(novo) {
    const de = this.#estado.constructor.name;
    const para = novo.constructor.name;
    this.#estado = novo;
    // O painel mostra o mais novo em cima: primeiro o aviso, depois a troca (que fica no topo).
    this.#registrarBastidor('Observer', `${this.#ouvintes.length} ouvintes avisados`);
    this.#registrarBastidor('State', `${de} → ${para}`);
    this.#notificar(`${de} → ${para}`);
  }

  zerarPlacar() {
    clearTimeout(this.#cronometro);
    this.#jogadores.forEach((jogador) => jogador.zerar());
    this.#respostas.clear();
    this.#indicePergunta = -1;
  }

  // ═══════════════════════════ consultas (para as telas) ═══════════════════════════

  get estado() { return this.#estado; }
  get pontuacao() { return this.#pontuacao; }
  get totalJogadores() { return this.#jogadores.size; }
  get perguntaAtual() { return this.#perguntas[this.#indicePergunta] ?? null; }
  get indicePergunta() { return this.#indicePergunta; }
  get totalPerguntas() { return this.#perguntas.length; }
  get rodada() { return this.#rodada; }
  get respostas() { return [...this.#respostas.values()]; }
  get nomesDosOuvintes() { return this.#ouvintes.map((o) => o.descricao()); }
  get bastidores() { return [...this.#bastidores]; }

  buscar(id) {
    return (typeof id === 'string' && this.#jogadores.get(id)) || null;
  }

  respostaDe(jogador) {
    return this.#respostas.get(jogador) ?? null;
  }

  get restanteMs() {
    const pergunta = this.perguntaAtual;
    return pergunta ? Math.max(0, this.#inicioDaPerguntaMs + pergunta.tempoLimiteMs - Date.now()) : 0;
  }

  /** Placar ordenado. Empate divide a posição (1º, 2º, 2º, 4º...). */
  classificacao() {
    const ordem = [...this.#jogadores.values()].sort((a, b) => b.pontos - a.pontos);
    const lista = [];
    ordem.forEach((jogador, i) => {
      const empatado = i > 0 && jogador.pontos === ordem[i - 1].pontos;
      lista.push({ posicao: empatado ? lista[i - 1].posicao : i + 1, jogador });
    });
    return lista;
  }

  /** Uma linha do painel Bastidores: qual padrão agiu e o que fez (guarda as 14 últimas). */
  #registrarBastidor(padrao, texto) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    this.#bastidores.unshift({ hora, padrao, texto });
    this.#bastidores.length = Math.min(this.#bastidores.length, 14);
  }
}

/** Tira caracteres invisíveis, junta espaços e corta em 16 caracteres. */
function limparApelido(bruto) {
  const apelido = String(bruto ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim();
  if (!apelido) {
    throw new AcaoInvalida('Digite um apelido.');
  }
  return Array.from(apelido).slice(0, 16).join('').trim(); // Array.from conta um emoji como 1 caractere
}
