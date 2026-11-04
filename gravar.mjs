#!/usr/bin/env node
// roteiro-video: grava o vídeo-manual de um sistema web a partir de um roteiro em JSON.
//
//   node gravar.mjs roteiro.json [saida/]
//   CENAS=3,4 node gravar.mjs roteiro.json saida/   # só essas cenas, para ajustar o roteiro
//
// Saída: video.mp4 (1920×1080, 30 fps, sem áudio), narracao.md e narracao.srt.
// Formato do roteiro e exemplos: README.md.

import fs from 'node:fs';
import path from 'node:path';
import { Gravador, duracao } from './src/gravador.mjs';
import { RoteiroInvalido, carregar } from './src/roteiro.mjs';
import { hms, montarNarracao } from './src/tempo.mjs';

const [arquivoRoteiro, pastaSaida = 'saida'] = process.argv.slice(2);
if (!arquivoRoteiro) {
  console.error('uso: node gravar.mjs roteiro.json [pasta-de-saida]');
  process.exit(1);
}

let roteiro;
try {
  roteiro = carregar(arquivoRoteiro);
} catch (e) {
  console.error(e instanceof RoteiroInvalido ? e.message : `não consegui ler ${arquivoRoteiro}: ${e.message}`);
  process.exit(1);
}

// Numeração a partir de 1, como aparece no narracao.md.
const apenas = process.env.CENAS ? process.env.CENAS.split(',').map((n) => Number(n) - 1) : null;

const gravador = new Gravador(roteiro, pastaSaida);
await gravador.abrir();
const segmentos = [];
try {
  for (const [i, cena] of roteiro.cenas.entries()) {
    if (apenas && !apenas.includes(i)) continue;
    process.stdout.write(`gravando ${i + 1}. ${cena.titulo ?? cena.tipo}…\n`);
    const arquivo = await gravador.cena(cena, i);
    segmentos.push({ cena, arquivo, dur: duracao(arquivo) });
  }
} finally {
  await gravador.fechar();
}

if (apenas) {
  console.log(segmentos.map((s) => `${s.arquivo} (${s.dur.toFixed(1)} s)`).join('\n'));
  process.exit(0);
}

const video = gravador.concatenar(segmentos.map((s) => s.arquivo));
const narracao = montarNarracao(segmentos, { titulo: roteiro.titulo ?? roteiro.marca.nome, duracaoTotal: duracao(video) });
fs.writeFileSync(path.join(pastaSaida, 'narracao.md'), narracao.md);
fs.writeFileSync(path.join(pastaSaida, 'narracao.srt'), narracao.srt);
console.log(`pronto: ${video} (${hms(narracao.total)})`);
