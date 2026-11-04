import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hms, minimoParaNarrar, montarNarracao, palavras, srt } from '../src/tempo.mjs';

test('palavras ignora espaços sobrando', () => {
  assert.equal(palavras('  olá   mundo \n'), 2);
  assert.equal(palavras(''), 0);
  assert.equal(palavras(), 0);
});

test('minimoParaNarrar dá tempo para o texto mais 1 s de folga', () => {
  const cena = { narracao: 'uma duas três quatro cinco seis sete oito nove dez onze doze' }; // 12 palavras
  assert.equal(minimoParaNarrar(cena), 12 / 2.4 + 1);
  assert.equal(minimoParaNarrar({}), 1);
});

test('hms formata minutos e décimos', () => {
  assert.equal(hms(0), '0:00.0');
  assert.equal(hms(7.5), '0:07.5');
  assert.equal(hms(62), '1:02.0');
});

test('srt usa vírgula nos milissegundos', () => {
  assert.equal(srt(0), '00:00:00,000');
  assert.equal(srt(62.5), '00:01:02,500');
  assert.equal(srt(3600 + 1.25), '01:00:01,250');
});

test('montarNarracao acumula os tempos e numera só as cenas com texto', () => {
  const segmentos = [
    { cena: { tipo: 'capa', titulo: 'Abertura', narracao: 'Bem-vindo.' }, dur: 5 },
    { cena: { tipo: 'tela', titulo: 'Painel' }, dur: 4 },
    { cena: { tipo: 'fechamento', narracao: 'Até logo.' }, dur: 3 },
  ];
  const { md, srt: legendas, total } = montarNarracao(segmentos, { titulo: 'Manual', duracaoTotal: 12 });
  assert.equal(total, 12);
  assert.match(md, /^# Narração: Manual/);
  assert.match(md, /## 1\. Abertura \(0:00\.0 a 0:05\.0, 5\.0 s\)/);
  assert.match(md, /## 2\. Painel \(0:05\.0 a 0:09\.0, 4\.0 s\)\n\n_\(sem narração\)_/);
  assert.match(md, /## 3\. fechamento \(0:09\.0 a 0:12\.0/);
  const blocos = legendas.trim().split('\n\n');
  assert.equal(blocos.length, 2);
  assert.equal(blocos[0].split('\n')[0], '1');
  assert.equal(blocos[1].split('\n')[0], '2');
  assert.equal(blocos[1].split('\n')[1], '00:00:09,000 --> 00:00:11,800');
});
