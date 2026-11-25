import path from 'node:path';
import express from 'express';
import QRCode from 'qrcode';

/*
 * Rotas HTTP do Express (as "páginas"). O tempo real fica com o Socket.IO (sockets.js).
 *
 *   GET /             tela do celular
 *   GET /telao        tela do projetor
 *   GET /qr/jogo.svg  QR code com o endereço do jogo (gerado aqui, sem internet)
 *   GET /qr/wifi.svg  QR code para entrar no Wi-Fi (só se config.json tiver o Wi-Fi)
 *   GET /estilo.css   e os outros arquivos da pasta public/
 */
export function configurarRotas(app, { pastaPublica, partida, wifi }) {
  app.disable('x-powered-by'); // não anuncia "Express" nas respostas

  // Sem cache: se você editar um arquivo, o navegador pega a versão nova.
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/', (req, res) => res.sendFile(path.join(pastaPublica, 'jogador.html')));
  app.get('/telao', (req, res) => res.sendFile(path.join(pastaPublica, 'telao.html')));

  app.get('/qr/jogo.svg', async (req, res) => {
    res.type('image/svg+xml').send(await gerarQrCode(partida.urlEntrada));
  });

  app.get('/qr/wifi.svg', async (req, res) => {
    if (!wifi.nome) {
      res.status(404).send('Wi-Fi não configurado no config.json');
      return;
    }
    res.type('image/svg+xml').send(await gerarQrCode(textoDoQrWifi(wifi)));
  });

  app.use(express.static(pastaPublica, { index: false }));

  app.use((req, res) => res.status(404).type('text/plain').send('Página não encontrada'));
}

function gerarQrCode(texto) {
  return QRCode.toString(texto, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#160f2e', light: '#ffffff' },
  });
}

/**
 * O formato que a câmera do celular entende para entrar numa rede Wi-Fi:
 *   WIFI:T:WPA;S:<nome da rede>;P:<senha>;;
 * Os caracteres \ ; , : " precisam de uma barra antes.
 */
export function textoDoQrWifi({ nome, senha }) {
  const escapar = (texto) => texto.replace(/([\\;,:"])/g, '\\$1');
  return senha
    ? `WIFI:T:WPA;S:${escapar(nome)};P:${escapar(senha)};;`
    : `WIFI:T:nopass;S:${escapar(nome)};;`;
}
