import { porId, escaparHtml, formatarPontos, LETRAS } from './interface.js';

// O id do jogador fica guardado no celular: se a página recarregar, a pessoa continua no jogo.
const CHAVE = 'ifhoot.id';
const memoria = {
  ler() { try { return localStorage.getItem(CHAVE) || ''; } catch { return ''; } },
  gravar(valor) { try { if (valor) localStorage.setItem(CHAVE, valor); else localStorage.removeItem(CHAVE); } catch { /* modo anônimo: tudo bem */ } },
};

let dados = null, telaAtual = '', prazo = 0, duracao = 1, enviando = false;

/* ===== Socket.IO: este celular é um OBSERVER da partida =====
   "auth" leva o id salvo: se o celular desconectar e voltar, o servidor sabe quem é. */
const socket = io({ auth: { tipo: 'jogador', id: memoria.ler() } });
socket.on('connect', () => porId('reconectando').classList.remove('visivel'));
socket.on('disconnect', () => porId('reconectando').classList.add('visivel'));
socket.on('connect_error', () => porId('reconectando').classList.add('visivel'));
socket.on('tela', (novaVisao) => {
  dados = novaVisao;
  desenhar();
});

function desenhar() {
  if (socket.auth.id && !dados.eu) { // o servidor reiniciou ou o apresentador me removeu
    socket.auth.id = '';
    memoria.gravar('');
  }
  const eu = dados.eu;
  let tela;
  if (!eu) tela = dados.estado === 'ENCERRADA' ? 'fechada' : 'entrar';
  else if (dados.estado === 'AGUARDANDO') tela = 'espera';
  else if (dados.estado === 'PERGUNTA') tela = eu.respondeu ? 'enviada' : 'pergunta';
  else if (dados.estado === 'RESULTADO') tela = 'resultado';
  else tela = 'final';

  // Só remonta a tela quando ela muda: assim o texto que a pessoa está digitando não some.
  const chave = tela + ':' + dados.rodada;
  if (chave !== telaAtual) {
    telaAtual = chave;
    pintarFundo(null); // só a tela de resultado pinta o fundo de verde ou vermelho
    telas[tela]();
  }
  atualizar(tela);
}

const telas = {
  entrar() {
    porId('tela').innerHTML = `
      <div class="centro">
        <p class="grande">Bora jogar?</p>
        <p class="sub">Escolha um apelido. Ele vai aparecer no telão.</p>
        <form id="form-entrar" autocomplete="off">
          <input class="campo" id="apelido" maxlength="16" aria-label="Seu apelido" placeholder="Seu apelido" required autocapitalize="words" enterkeyhint="go">
          <button class="botao largo" id="btn-entrar">Entrar</button>
        </form>
      </div>`;
    porId('form-entrar').onsubmit = (e) => {
      e.preventDefault();
      const nome = porId('apelido').value.trim();
      if (!nome) return;
      porId('btn-entrar').disabled = true;
      socket.timeout(5000).emit('entrar', nome, (semResposta, r) => {
        if (semResposta || !r.ok) {
          const botao = porId('btn-entrar');
          if (botao) botao.disabled = false;
          avisar(semResposta ? 'Sem conexão com o servidor. Confira o Wi-Fi.' : r.erro);
          return;
        }
        socket.auth.id = r.id; // para uma reconexão futura já levar o id
        memoria.gravar(r.id);
      });
    };
  },

  fechada() {
    porId('tela').innerHTML = `
      <div class="centro">
        <div class="selo neutro">🏁</div>
        <p class="grande">Partida encerrada</p>
        <p class="sub">Aguarde o apresentador começar uma nova.</p>
      </div>`;
  },

  espera() {
    porId('tela').innerHTML = `
      <div class="centro">
        <div class="selo ok">✓</div>
        <p class="grande">Você está dentro, <span id="meu-nome"></span>!</p>
        <p class="sub">Olhe para o telão: o jogo já vai começar.</p>
        <p class="info" id="info-espera"></p>
      </div>`;
    porId('meu-nome').textContent = dados.eu.nome;
  },

  pergunta() {
    const p = dados.pergunta;
    const resposta = `<div class="botoes-opcoes ${p.opcoes.length === 2 ? 'duas' : ''}" id="opcoes">
           ${p.opcoes.map((o, i) => `<button class="btn-opcao op-${i}" data-i="${i}"><span class="letra">${LETRAS[i]}</span><span>${escaparHtml(o)}</span></button>`).join('')}
         </div>`;
    porId('tela').innerHTML = `<div class="tempo"><div id="barra"></div></div><p class="enunciado">${escaparHtml(p.enunciado)}</p>${resposta}`;
    prazo = performance.now() + p.restanteMs;
    duracao = p.tempoTotalMs || 1;
    enviando = false;
    porId('opcoes').onclick = (e) => {
      const botao = e.target.closest('.btn-opcao');
      if (botao) responder(botao.dataset.i, botao);
    };
  },

  enviada() {
    const p = dados.pergunta;
    const v = dados.eu.minhaResposta;
    const escolha = `<strong>${LETRAS[+v]}</strong> · ${escaparHtml(p.opcoes[+v])}`;
    porId('tela').innerHTML = `
      <div class="tempo"><div id="barra"></div></div>
      <div class="centro">
        <div class="selo neutro">⏳</div>
        <p class="grande">Resposta enviada!</p>
        <p class="sub">Você marcou ${escolha}</p>
        <p class="info" id="info-respostas"></p>
      </div>`;
    prazo = performance.now() + p.restanteMs;
    duracao = p.tempoTotalMs || 1;
  },

  resultado() {
    const eu = dados.eu;
    const r = dados.resultado;
    if (!eu.participou) { // entrou depois que a pergunta fechou
      porId('tela').innerHTML = `
        <div class="centro">
          <div class="selo neutro">👋</div>
          <p class="grande">Chegou na hora!</p>
          <p class="sub">A próxima pergunta já vale pontos para você.</p>
          <p class="info" id="info-posicao"></p>
        </div>`;
      return;
    }
    let selo, titulo, detalhe;
    if (eu.acertou) {
      selo = '<div class="selo ok">✓</div>';
      titulo = 'Acertou!';
      detalhe = `<p class="pontos-ganhos">+${formatarPontos(eu.ultimosPontos)}</p>`;
      vibrar(80);
      pintarFundo('certo');
    } else {
      selo = eu.respondeu ? '<div class="selo erro">✕</div>' : '<div class="selo neutro">⏰</div>';
      titulo = eu.respondeu ? 'Errou' : 'Você não respondeu';
      detalhe = `<p class="sub">Resposta certa: <strong>${escaparHtml(r.respostaCorreta)}</strong></p>`;
      vibrar([60, 50, 60]);
      pintarFundo(eu.respondeu ? 'errado' : 'neutro');
    }
    porId('tela').innerHTML = `<div class="centro">${selo}<p class="grande">${titulo}</p>${detalhe}<p class="info" id="info-posicao"></p></div>`;
  },

  final() {
    const eu = dados.eu;
    const medalha = { 1: '🥇', 2: '🥈', 3: '🥉' }[eu.posicao] || '🏁';
    const podio = (dados.podio || []).map((j) => `
      <li class="${j.nome === eu.nome ? 'eu' : ''}"><span>${j.posicao}º</span><span>${escaparHtml(j.nome)}</span><span>${formatarPontos(j.pontos)}</span></li>`).join('');
    porId('tela').innerHTML = `
      <div class="centro">
        <div class="selo ${eu.posicao <= 3 ? 'ok' : 'neutro'}">${medalha}</div>
        <p class="grande">${eu.posicao}º lugar</p>
        <p class="sub">${formatarPontos(eu.pontos)} pontos · obrigado por jogar!</p>
        <ol class="lista-podio">${podio}</ol>
      </div>`;
  },
};

/* Partes que mudam sem trocar de tela (contadores, pontos). */
function atualizar(tela) {
  const eu = dados.eu;
  porId('meus-pontos').hidden = !eu;
  if (eu) porId('meus-pontos').textContent = `${formatarPontos(eu.pontos)} pts`;
  if (tela === 'espera') {
    porId('info-espera').innerHTML = `<strong>${dados.totalJogadores}</strong> ${dados.totalJogadores === 1 ? 'jogador na sala' : 'jogadores na sala'}`;
  } else if (tela === 'enviada') {
    porId('info-respostas').innerHTML = `<strong>${dados.respondidas}</strong> de ${dados.totalJogadores} já responderam`;
  } else if (tela === 'resultado') {
    porId('info-posicao').innerHTML = `Você está em <strong>${eu.posicao}º lugar</strong>`;
  }
}

function relogio() {
  const barra = porId('barra');
  if (barra && dados && dados.estado === 'PERGUNTA') {
    barra.style.transform = `scaleX(${Math.max(0, prazo - performance.now()) / duracao})`;
  }
  requestAnimationFrame(relogio);
}
requestAnimationFrame(relogio);

function responder(valor, botao) {
  if (enviando) return;
  enviando = true;
  botao.classList.add('escolhida');
  porId('opcoes').classList.add('enviando');
  const resposta = { valor, idRodada: dados.pergunta.idRodada };
  socket.timeout(5000).emit('responder', resposta, (semResposta, r) => {
    if (semResposta || !r.ok) {
      enviando = false;
      botao.classList.remove('escolhida');
      porId('opcoes')?.classList.remove('enviando');
      avisar(semResposta ? 'Sem conexão com o servidor. Confira o Wi-Fi.' : r.erro);
    }
    // Se deu certo, o servidor manda a tela "Resposta enviada" pelo evento "tela".
  });
}

/* Pinta a tela toda (e a barra do navegador do celular) com a cor do resultado. null volta ao normal. */
const CORES_DO_NAVEGADOR = { certo: '#1e7a31', errado: '#c8191e', neutro: '#34495e' };
function pintarFundo(tipo) {
  if (tipo) document.body.dataset.feedback = tipo;
  else delete document.body.dataset.feedback;
  porId('cor-do-navegador').content = CORES_DO_NAVEGADOR[tipo] || '#2f9e41';
}

function vibrar(padrao) {
  try { navigator.vibrate?.(padrao); } catch { /* sem vibração */ }
}

let avisoTimer = null;
function avisar(mensagem) {
  const el = porId('aviso');
  el.textContent = mensagem;
  el.classList.add('visivel');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('visivel'), 3500);
}
