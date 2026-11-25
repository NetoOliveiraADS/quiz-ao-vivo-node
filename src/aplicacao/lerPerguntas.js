import fs from 'node:fs';
import { Pergunta } from '../jogo/Pergunta.js';

/** Lê o perguntas.txt. Uma linha com erro é ignorada, e o console diz qual foi. */
export function lerPerguntas(arquivo) {
  const perguntas = [];
  fs.readFileSync(arquivo, 'utf8').split(/\r?\n/).forEach((bruta, i) => {
    const linha = bruta.replace(/^﻿/, '').trim(); // tira o caractere invisível que o Bloco de Notas põe
    if (!linha || linha.startsWith('#')) {
      return;
    }
    try {
      perguntas.push(lerLinha(linha.split('|').map((campo) => campo.trim())));
    } catch (erro) {
      console.log(`perguntas.txt, linha ${i + 1} ignorada: ${erro.message}`);
    }
  });
  return perguntas;
}

function lerLinha([tipo, textoDoTempo, enunciado, ...resto]) {
  const segundos = Number(textoDoTempo);
  if (!Number.isInteger(segundos) || segundos < 5 || segundos > 300) {
    throw new Error('o tempo deve ser de 5 a 300 segundos');
  }
  if (!enunciado) {
    throw new Error('falta a pergunta');
  }
  const opcoes = resto.filter((campo) => campo !== '');

  if (tipo.toUpperCase() === 'VF') {
    const gabarito = opcoes[0]?.toUpperCase();
    if (gabarito !== 'V' && gabarito !== 'F') {
      throw new Error('termine a linha com V ou F');
    }
    return new Pergunta('VF', enunciado, segundos, ['Verdadeiro', 'Falso'], gabarito === 'V' ? 0 : 1);
  }

  if (tipo.toUpperCase() === 'ME') {
    if (opcoes.length < 2 || opcoes.length > 4) {
      throw new Error('múltipla escolha precisa de 2 a 4 opções');
    }
    const certas = opcoes.filter((opcao) => opcao.startsWith('*'));
    if (certas.length !== 1) {
      throw new Error('marque UMA opção certa com *');
    }
    return new Pergunta('ME', enunciado, segundos,
      opcoes.map((opcao) => opcao.replace(/^\*\s*/, '')), opcoes.indexOf(certas[0]));
  }

  throw new Error(`tipo desconhecido "${tipo}" (use ME ou VF)`);
}
