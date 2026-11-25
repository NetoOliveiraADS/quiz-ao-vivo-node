import fs from 'node:fs';
import path from 'node:path';

/**
 * Parte dos valores padrão, lê o config.json opcional da raiz
 * e aplica por último os argumentos da linha de comando.
 */
export function lerConfiguracao(pastaDoProjeto, argumentos) {
  const config = {
    porta: 3000,
    abrirNavegador: true,
    wifi: { nome: '', senha: '' }, // nome vazio = o telão não mostra o passo do Wi-Fi
  };

  const arquivo = path.join(pastaDoProjeto, 'config.json');
  if (fs.existsSync(arquivo)) {
    try {
      const lido = JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, ''));
      if (Number.isInteger(lido.porta)) {
        config.porta = lido.porta;
      }
      if (typeof lido.wifi?.nome === 'string') {
        config.wifi.nome = lido.wifi.nome.trim();
      }
      if (typeof lido.wifi?.senha === 'string') {
        config.wifi.senha = lido.wifi.senha;
      }
    } catch (erro) {
      console.log(`config.json ignorado (não é um JSON válido): ${erro.message}`);
    }
  }

  for (let i = 0; i < argumentos.length; i++) {
    if (argumentos[i] === '--porta') {
      config.porta = Number(argumentos[++i]);
    } else if (argumentos[i] === '--sem-navegador') {
      config.abrirNavegador = false;
    } else {
      console.log(`Argumento ignorado: ${argumentos[i]}`);
    }
  }

  if (!Number.isInteger(config.porta) || config.porta < 1 || config.porta > 65535) {
    console.log('Porta inválida; usando a 3000.');
    config.porta = 3000;
  }
  return config;
}
