import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';

import { lerConfiguracao } from './src/configuracao.js';
import { GerenciadorPartida } from './src/GerenciadorPartida.js';
import { lerPerguntas } from './src/Pergunta.js';
import { LogConsole } from './src/observadores/LogConsole.js';
import { ipParaCelulares, outrosIps } from './src/web/rede.js';
import { configurarRotas } from './src/web/rotas.js';
import { configurarSockets } from './src/web/sockets.js';

/*
 * Ponto de partida do IFhoot!.
 *   1. Lê a configuração e as perguntas.
 *   2. Obtém a sala do gerenciador e inscreve o console como observador.
 *   3. Sobe o servidor: o Express entrega as páginas e o Socket.IO cuida do tempo real.
 *
 * Rodar: npm start        (ou: npm start -- --porta 3001 --sem-navegador)
 */

const pastaDoProjeto = path.dirname(fileURLToPath(import.meta.url));
const config = lerConfiguracao(pastaDoProjeto, process.argv.slice(2));

// 1. Perguntas
const perguntas = lerPerguntas(path.join(pastaDoProjeto, 'perguntas.txt'));
if (perguntas.length === 0) {
  console.log('Nenhuma pergunta válida em perguntas.txt.');
  process.exit(1);
}

// 2. Singleton. Rotas e conexões recebem a mesma partida durante toda a execução.
const gerenciador = GerenciadorPartida.obterInstancia(perguntas);
const partida = gerenciador.partida;
partida.inscrever(new LogConsole());
const ipDaSala = await ipParaCelulares();
partida.urlEntrada = `http://${ipDaSala}:${config.porta}`;

// 3. Servidor: Express (páginas) e Socket.IO (tempo real) usam o MESMO servidor HTTP e a mesma porta
const app = express();
const servidorHttp = createServer(app);
const io = new Server(servidorHttp);
configurarRotas(app, { pastaPublica: path.join(pastaDoProjeto, 'public'), partida, wifi: config.wifi });
configurarSockets(io, partida, { wifi: config.wifi });

servidorHttp.on('error', (erro) => {
  console.log(erro.code === 'EADDRINUSE'
    ? `A porta ${config.porta} já está em uso. Feche o outro servidor ou rode: npm start -- --porta 3001`
    : `Não consegui ligar o servidor: ${erro.message}`);
  process.exit(1);
});

servidorHttp.listen(config.porta, () => {
  const urlTelao = `http://localhost:${config.porta}/telao`;
  console.log('');
  console.log('==============================================================');
  console.log('  IFHOOT! - servidor no ar!');
  console.log('==============================================================');
  console.log(`  Telão (abra NESTE computador): ${urlTelao}`);
  if (ipDaSala === 'localhost') {
    console.log(`  Jogador neste computador:      ${partida.urlEntrada}`);
    console.log('  Para conectar celulares, entre na rede da turma e reinicie o servidor.');
  } else {
    console.log(`  Celulares (mesmo Wi-Fi):       ${partida.urlEntrada}`);
  }
  for (const outro of outrosIps(ipDaSala)) {
    console.log(`  Outro IP deste computador:     ${outro}`);
  }
  console.log(`  Perguntas: ${perguntas.length}      Para desligar: Ctrl+C`);
  console.log('==============================================================');
  console.log('');
  if (config.abrirNavegador) {
    const comando = process.platform === 'win32' ? `start "" "${urlTelao}"` : `xdg-open "${urlTelao}"`;
    exec(comando, (erro) => erro && console.log(`Abra o telão manualmente: ${urlTelao}`));
  }
});

// Rede de segurança para a apresentação: um erro inesperado é registrado, mas o jogo continua no ar.
process.on('uncaughtException', (erro) => console.error('Erro inesperado (o servidor continua no ar):', erro));
process.on('unhandledRejection', (erro) => console.error('Erro inesperado (o servidor continua no ar):', erro));
