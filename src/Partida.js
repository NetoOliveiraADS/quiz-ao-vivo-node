import { randomUUID } from 'node:crypto';
import { AcaoInvalida } from './erros.js';
import { Jogador } from './Jogador.js';
import { AguardandoJogadores } from './estados/AguardandoJogadores.js';
import { PontuacaoVelocidade } from './pontuacao/PontuacaoVelocidade.js';
import { estrategiasDisponiveis } from './pontuacao/estrategias.js';

/**
 * O gerenciador mantém esta sala. A Partida delega ações ao estado, calcula os pontos
 * com a estratégia escolhida e publica cada mudança para os observadores inscritos.
 */
export class Partida {
  #estado = new AguardandoJogadores();  // STATE
  #observadores = new Set();                // OBSERVER
  #pontuacao = new PontuacaoVelocidade(); // STRATEGY

  #perguntas;
  #jogadores = new Map();   // id secreto -> Jogador
  #respostas = new Map();   // Jogador -> resposta da pergunta atual
  #proximoNumero = 1;
  #indicePergunta = -1;
  #inicioDaPerguntaMs = 0;
  #rodada = 0;              // muda a cada pergunta; ignora cronômetros atrasados
  #cronometro = null;
  #criadaEm = Date.now();
  #ultimoAviso = '';
  urlEntrada = '';          // endereço que os celulares abrem

  constructor(perguntas) {
    this.#perguntas = [...perguntas];
  }

  // Ações enviadas pelas telas.

  entrar(apelido) {
    return this.#estado.entrar(this, limparApelido(apelido));
  }

  responder(idJogador, resposta, rodada = this.#rodada) {
    if (rodada !== this.#rodada) {
      throw new AcaoInvalida('Esta resposta pertence a uma pergunta anterior.');
    }
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

  // Observer. Inscrições e publicação de mudanças.

  inscrever(observador) {
    this.#observadores.add(observador);
    this.#notificar(`${observador.descricao()} conectou`);
  }

  cancelarInscricao(observador) {
    if (this.#observadores.delete(observador)) {
      this.#notificar(`${observador.descricao()} saiu`);
    }
  }

  /** Avisa TODOS os observadores, com uma frase do que mudou. A Partida não sabe se é o telão, um celular ou o console. */
  #notificar(mensagem) {
    this.#ultimoAviso = mensagem;
    // Percorre uma CÓPIA da lista: um observador pode sair dela durante o aviso.
    for (const observador of [...this.#observadores]) {
      try {
        observador.atualizar(mensagem);
      } catch (erro) {
        console.error(`Erro no observador ${observador.descricao()}:`, erro);
      }
    }
  }

  // Operações que os estados usam para conduzir a partida.

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
    this.#notificar(`Pontuação: ${nova.nome}`);
  }

  abrirPergunta(indice) {
    clearTimeout(this.#cronometro);
    this.#indicePergunta = indice;
    this.#respostas.clear();
    this.#inicioDaPerguntaMs = performance.now();
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
    const tempoMs = performance.now() - this.#inicioDaPerguntaMs;
    const correta = pergunta.estaCorreta(valor);
    const pontos = correta ? this.#pontuacao.pontosPorAcerto(tempoMs, pergunta.tempoLimiteMs) : 0;
    this.#respostas.set(jogador, Object.freeze({ valor, correta }));
    jogador.registrarRodada(pontos);
    this.#notificar(`${jogador.nome} respondeu (${this.#respostas.size}/${this.#jogadores.size})`);
  }

  todosResponderam() {
    return this.#respostas.size >= this.#jogadores.size;
  }

  /** Quem já respondeu já recebeu os pontos. Registra a ausência dos demais. */
  fecharRodada() {
    clearTimeout(this.#cronometro);
    for (const jogador of this.#jogadores.values()) {
      if (!this.#respostas.has(jogador)) jogador.registrarRodada(0);
    }
  }

  temProximaPergunta() {
    return this.#indicePergunta + 1 < this.#perguntas.length;
  }

  /** A troca de estado em si. Quem chama são os próprios estados. */
  mudarEstado(novo) {
    this.#estado = novo;
    this.#notificar(`Fase: ${novo.rotulo}`);
  }

  zerarPlacar() {
    clearTimeout(this.#cronometro);
    this.#jogadores.forEach((jogador) => jogador.zerar());
    this.#respostas.clear();
    this.#indicePergunta = -1;
  }

  // Consultas usadas para montar as telas.

  get estado() { return this.#estado; }
  get pontuacao() { return this.#pontuacao; }
  get totalJogadores() { return this.#jogadores.size; }
  get perguntaAtual() { return this.#perguntas[this.#indicePergunta] ?? null; }
  get indicePergunta() { return this.#indicePergunta; }
  get totalPerguntas() { return this.#perguntas.length; }
  get rodada() { return this.#rodada; }
  get respostas() { return [...this.#respostas.values()]; }
  get tiposDeObservadores() {
    return Array.from(this.#observadores, (observador) => observador.tipo);
  }
  get ultimoAviso() { return this.#ultimoAviso; }
  get criadaEm() { return this.#criadaEm; }

  buscar(id) {
    return (typeof id === 'string' && this.#jogadores.get(id)) || null;
  }

  respostaDe(jogador) {
    return this.#respostas.get(jogador) ?? null;
  }

  get restanteMs() {
    const pergunta = this.perguntaAtual;
    return pergunta ? Math.max(0, this.#inicioDaPerguntaMs + pergunta.tempoLimiteMs - performance.now()) : 0;
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
}

/** Tira caracteres invisíveis, junta espaços e corta em 16 caracteres. */
function limparApelido(bruto) {
  const apelido = String(bruto ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim();
  if (!apelido) {
    throw new AcaoInvalida('Digite um apelido.');
  }
  return Array.from(apelido).slice(0, 16).join('').trim(); // Array.from conta um emoji como 1 caractere
}
