import dgram from 'node:dgram';
import os from 'node:os';

// Placas de rede que não servem para os celulares (máquinas virtuais, WSL, Bluetooth...).
const PLACAS_VIRTUAIS = ['virtual', 'vbox', 'vmware', 'hyper-v', 'vethernet', 'wsl', 'docker',
  'bluetooth', 'loopback', 'pseudo'];

/** Descobre o IP que os celulares devem digitar para chegar a este computador. */
export async function ipParaCelulares() {
  // 1) Pergunta ao sistema qual IP ele usaria para sair para a internet.
  //    Um "connect" UDP não envia nenhum pacote: só escolhe a placa de rede.
  const daRotaPadrao = await ipDaRotaPadrao().catch(() => null);
  if (daRotaPadrao) {
    return daRotaPadrao;
  }
  // 2) Plano B (sem internet): a primeira placa de rede "de verdade".
  const enderecos = listarIpv4();
  const real = enderecos.find((endereco) => !ehVirtual(endereco.placa));
  return (real ?? enderecos[0])?.ip ?? 'localhost';
}

function ipDaRotaPadrao() {
  return new Promise((resolve, reject) => {
    const teste = dgram.createSocket('udp4');
    teste.once('error', (erro) => {
      teste.close();
      reject(erro);
    });
    teste.connect(53, '8.8.8.8', (erro) => {
      if (erro) {
        teste.close();
        reject(erro);
        return;
      }
      const { address } = teste.address();
      teste.close();
      resolve(address && address !== '0.0.0.0' ? address : null);
    });
  });
}

/** Os outros IPs deste computador, para mostrar no console caso o automático erre. */
export function outrosIps(escolhido) {
  return listarIpv4()
    .filter((endereco) => endereco.ip !== escolhido)
    .map((endereco) => `${endereco.ip}  (${endereco.placa})`);
}

function listarIpv4() {
  const lista = [];
  for (const [placa, enderecos] of Object.entries(os.networkInterfaces())) {
    for (const endereco of enderecos ?? []) {
      // 169.254.x.x = endereço "de emergência" que o Windows usa quando não achou rede
      if (endereco.family === 'IPv4' && !endereco.internal && !endereco.address.startsWith('169.254.')) {
        lista.push({ ip: endereco.address, placa });
      }
    }
  }
  return lista;
}

function ehVirtual(placa) {
  const nome = placa.toLowerCase();
  return PLACAS_VIRTUAIS.some((pedaco) => nome.includes(pedaco));
}

/**
 * A conexão veio deste próprio computador? Só ele pode controlar o jogo.
 * Pedidos repassados por túnel ou proxy (que trazem estes cabeçalhos) não contam.
 */
export function vemDesteComputador(handshake) {
  const cabecalhos = handshake.headers ?? {};
  if (cabecalhos['x-forwarded-for'] || cabecalhos.forwarded || cabecalhos['cf-connecting-ip']) {
    return false;
  }
  const ip = String(handshake.address ?? '').replace(/^::ffff:/, ''); // "::ffff:192.168.0.5" -> "192.168.0.5"
  if (ip === '127.0.0.1' || ip === '::1') {
    return true;
  }
  return Object.values(os.networkInterfaces()).flat().some((endereco) => endereco?.address === ip);
}
