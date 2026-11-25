import { porId, escaparHtml, formatarPontos, LETRAS } from './interface.js';

const TIPOS = { ME: 'Múltipla escolha', VF: 'Verdadeiro ou falso' };

let dados = null;                 // o último retrato da partida enviado pelo servidor
let telaAnterior = '';
let prazo = 0, duracao = 1;
let urlDoQr = '', assinaturaFinal = '', ultimoAvanco = 0;

/* ===== Socket.IO: o telão é um OBSERVER da partida =====
   "auth" diz ao servidor quem somos. O servidor responde com o evento "tela"
   toda vez que algo muda. Se a conexão cair, o Socket.IO reconecta sozinho. */
const socket = io({ auth: { tipo: 'telao' } });
// Só aparece um aviso quando a conexão cai; enquanto tudo funciona, o topo fica limpo.
socket.on('connect', () => { porId('conexao').hidden = true; });
socket.on('disconnect', () => { porId('conexao').hidden = false; });
socket.on('connect_error', () => { porId('conexao').hidden = false; });
socket.on('tela', (novaVisao) => {
  dados = novaVisao;
  desenhar();
});

function desenhar() {
  const tela = dados.estado + ':' + dados.rodada;
  const nova = tela !== telaAnterior;
  telaAnterior = tela;
  document.body.classList.toggle('so-assistindo', !dados.podeControlar);
  document.querySelectorAll('.tela').forEach((el) => el.classList.toggle('ativa', el.id === 'tela-' + dados.estado));
  if (nova) reanimar(porId('tela-' + dados.estado));

  const emJogo = dados.estado === 'PERGUNTA' || dados.estado === 'RESULTADO';
  porId('info-topo').textContent = emJogo ? `Pergunta ${dados.rodada} de ${dados.totalRodadas}` : `${dados.totalRodadas} perguntas`;

  if (dados.estado === 'AGUARDANDO') desenharEspera();
  else if (dados.estado === 'PERGUNTA') desenharPergunta(nova);
  else if (dados.estado === 'RESULTADO') desenharResultado(nova);
  else desenharFinal(nova);
  desenharBastidores();
}

function reanimar(el) {
  el.classList.remove('entrada');
  void el.offsetWidth; // reinicia a animação de entrada
  el.classList.add('entrada');
}

/* ----- 1. sala de espera ----- */
function desenharEspera() {
  const local = new URL(dados.urlEntrada).hostname === 'localhost';
  const comWifi = Boolean(dados.wifi) && !local;
  porId('convite').classList.toggle('dois-passos', comWifi);
  porId('passo-wifi').hidden = !comWifi;
  if (comWifi) {
    porId('wifi-nome').textContent = dados.wifi.nome;
    porId('wifi-senha').innerHTML = dados.wifi.senha ? `Senha: <strong>${escaparHtml(dados.wifi.senha)}</strong>` : 'Rede aberta, sem senha';
    if (!porId('qr-wifi').getAttribute('src')) porId('qr-wifi').src = '/qr/wifi.svg';
  }
  porId('rotulo-jogo').textContent = local ? 'Jogue neste computador' : (comWifi ? '2. Abra o quiz' : 'Entre pelo celular');
  porId('convite-qr').hidden = local;
  porId('dica-entrada').textContent = local
    ? 'Abra o endereço em outra janela. Para jogar pelo celular, conecte o notebook à rede da turma e reinicie o servidor.'
    : 'Aponte a câmera para o QR code ou digite o endereço no navegador.';
  porId('url-entrada').textContent = dados.urlEntrada.replace(/^https?:\/\//, '');
  if (!local && urlDoQr !== dados.urlEntrada) {
    urlDoQr = dados.urlEntrada;
    porId('qr-jogo').src = '/qr/jogo.svg?v=' + encodeURIComponent(dados.urlEntrada);
  }
  porId('qtd-jogadores').textContent = dados.jogadores.length;
  porId('sem-jogadores').hidden = dados.jogadores.length > 0;
  sincronizarChips(dados.jogadores);
  porId('estrategias').innerHTML = dados.pontuacoes.map((e) =>
    `<button class="estrategia ${e.id === dados.pontuacao ? 'ativa' : ''}" aria-pressed="${e.id === dados.pontuacao}" data-id="${escaparHtml(e.id)}" ${dados.podeControlar ? '' : 'disabled'}>${escaparHtml(e.nome)}</button>`).join('');
  const ativa = dados.pontuacoes.find((e) => e.id === dados.pontuacao);
  porId('descricao-estrategia').textContent = ativa ? ativa.descricao : '';
  porId('btn-comecar').disabled = dados.jogadores.length === 0;
}

/* Só acrescenta/remove os nomes que mudaram, para não "piscar" a lista inteira. */
function sincronizarChips(jogadores) {
  const caixa = porId('chips');
  const existentes = new Map([...caixa.children].map((el) => [el.dataset.numero, el]));
  const vistos = new Set();
  for (const j of jogadores) {
    const chave = String(j.numero);
    vistos.add(chave);
    if (existentes.has(chave)) continue;
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.numero = chave;
    chip.dataset.nome = j.nome;
    chip.innerHTML = `<span>${escaparHtml(j.nome)}</span><span class="x" aria-hidden="true">✕</span>`;
    caixa.appendChild(chip);
  }
  existentes.forEach((el, chave) => { if (!vistos.has(chave)) el.remove(); });
}

/* ----- 2. pergunta aberta ----- */
function desenharPergunta(nova) {
  const p = dados.pergunta;
  if (nova) {
    porId('p-tipo').textContent = TIPOS[p.tipo];
    porId('p-enunciado').textContent = p.enunciado;
    porId('p-opcoes').innerHTML = p.opcoes.map((o, i) => `<div class="opcao op-${i}"><span class="letra">${LETRAS[i]}</span><span>${escaparHtml(o)}</span></div>`).join('');
    duracao = p.tempoTotalMs || 1;
    prazo = performance.now() + p.restanteMs;
  }
  porId('p-respondidas').innerHTML = `<strong>${dados.respondidas}</strong> de ${dados.totalJogadores} responderam`;
  porId('p-placar').innerHTML = dados.jogadores.slice(0, 3).map((jogador) =>
    `<li><span>${jogador.posicao}º ${escaparHtml(jogador.nome)}</span> <strong>${formatarPontos(jogador.pontos)} pts</strong></li>`).join('');
}

/* O cronômetro roda no navegador, a partir do "restanteMs" que o servidor mandou. */
function relogio() {
  if (dados && dados.estado === 'PERGUNTA') {
    const resta = Math.max(0, prazo - performance.now());
    const segundos = Math.ceil(resta / 1000);
    porId('p-tempo').textContent = segundos;
    porId('p-barra').style.transform = `scaleX(${resta / duracao})`;
    porId('relogio').classList.toggle('urgente', segundos <= 5);
  }
  requestAnimationFrame(relogio);
}
requestAnimationFrame(relogio);

/* ----- 3. resultado ----- */
function desenharResultado(nova) {
  const p = dados.pergunta;
  const r = dados.resultado;
  if (nova) {
    porId('r-tipo').textContent = TIPOS[p.tipo];
    porId('r-enunciado').textContent = p.enunciado;
    const maior = Math.max(1, ...r.distribuicao);
    porId('r-respostas').innerHTML = '<div class="barras">' + p.opcoes.map((o, i) => {
      const certa = i === r.indiceCorreto;
      return `<div class="barra op-${i} ${certa ? 'certa' : 'errada'}">
        <span class="enche" data-largura="${(r.distribuicao[i] / maior) * 100}"></span>
        <span class="letra">${certa ? '✓' : LETRAS[i]}</span>
        <span>${escaparHtml(o)}</span>
        <span class="qtd">${r.distribuicao[i]}</span>
      </div>`;
    }).join('') + '</div>';
    // anima as barras crescendo
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('#r-respostas .enche').forEach((el) => { el.style.width = el.dataset.largura + '%'; });
    }));
  }
  porId('r-acertos').innerHTML = `<strong>${r.acertos}</strong> de ${dados.totalJogadores} acertaram`;
  porId('r-placar').innerHTML = dados.jogadores.slice(0, 6).map((j) => `
    <li>
      <span class="pos">${j.posicao}º</span>
      <span class="nome">${escaparHtml(j.nome)}</span>
      <span class="ganho">${j.ultimosPontos ? '+' + formatarPontos(j.ultimosPontos) : ''}</span>
      <span class="pts">${formatarPontos(j.pontos)}</span>
    </li>`).join('');
  porId('btn-proxima').textContent = dados.rodada < dados.totalRodadas ? 'Próxima pergunta ▶' : 'Ver resultado final 🏆';
}

/* ----- 4. fim de jogo ----- */
function desenharFinal(nova) {
  const assinatura = JSON.stringify(dados.jogadores);
  if (!nova && assinatura === assinaturaFinal) return; // nada mudou: não reinicia a animação do pódio
  assinaturaFinal = assinatura;
  const top = dados.jogadores.slice(0, 3);
  const ordemNoPodio = [1, 0, 2]; // 2º, 1º, 3º
  porId('podio').innerHTML = ordemNoPodio.filter((i) => top[i]).map((i) => `
    <div class="degrau p${i + 1}">
      <span class="nome">${escaparHtml(top[i].nome)}</span>
      <span class="pts">${formatarPontos(top[i].pontos)} pts</span>
      <div class="bloco">${top[i].posicao}º</div>
    </div>`).join('');
  const resto = dados.jogadores.slice(3);
  porId('resto').innerHTML = resto.map((j) => `<li>${j.posicao}º <strong>${escaparHtml(j.nome)}</strong> · ${formatarPontos(j.pontos)}</li>`).join('');
  porId('resto').hidden = resto.length === 0;
}

/* ----- painel Bastidores: os padrões agindo ao vivo ----- */
function desenharBastidores() {
  const { salaAbertaEm, estado, regra, ouvintes, ultimoAviso } = dados.bastidores;
  const hora = new Date(salaAbertaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  porId('b-sala').textContent = `Sala aberta às ${hora}`;
  porId('b-estado').textContent = estado;
  porId('b-estrategia').textContent = regra;
  porId('b-ouvintes').textContent = `${ouvintes} ${ouvintes === 1 ? 'ouvinte' : 'ouvintes'}`;
  porId('b-aviso').textContent = ultimoAviso;
}

/* ===== Ações do apresentador =====
   emit('apresentador', pedido, callback): o callback é o "acknowledgement", a resposta
   do servidor a ESTE pedido. timeout(5000) desiste se o servidor não responder. */
function acao(nome, extra = {}) {
  if (!socket.connected) {
    avisar('Aguarde a reconexão com o servidor.');
    return;
  }
  socket.timeout(5000).emit('apresentador', { acao: nome, ...extra }, (semResposta, r) => {
    if (semResposta) avisar('O servidor não respondeu.');
    else if (!r.ok) avisar(r.erro);
  });
}

function avancar() {
  const agora = Date.now();
  if (agora - ultimoAvanco < 700) return; // evita pular uma tela com clique duplo
  ultimoAvanco = agora;
  acao('avancar', { estado: dados.estado, idRodada: dados.idRodada });
}

['btn-comecar', 'btn-encerrar', 'btn-proxima', 'btn-nova'].forEach((id) => { porId(id).onclick = avancar; });
porId('estrategias').onclick = (e) => {
  const botao = e.target.closest('.estrategia');
  if (botao) acao('pontuacao', { valor: botao.dataset.id });
};
porId('chips').onclick = (e) => {
  const chip = e.target.closest('.chip');
  if (chip && dados.podeControlar && confirm(`Remover "${chip.dataset.nome}" da partida?`)) {
    acao('remover', { numero: chip.dataset.numero });
  }
};
porId('btn-bastidores').onclick = alternarBastidores;

document.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.code === 'KeyB') alternarBastidores();
  if (!dados?.podeControlar || !socket.connected) return;
  if (e.target.closest('button') && e.code !== 'ArrowRight') return;
  if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
    avancar();
  }
});

function alternarBastidores() {
  const painel = porId('bastidores');
  painel.hidden = !painel.hidden;
  porId('btn-bastidores').setAttribute('aria-expanded', String(!painel.hidden));
}

let avisoTimer = null;
function avisar(mensagem, tipo = 'erro') {
  const el = porId('aviso');
  el.textContent = mensagem;
  el.dataset.tipo = tipo;
  el.classList.add('visivel');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('visivel'), 3200);
}
