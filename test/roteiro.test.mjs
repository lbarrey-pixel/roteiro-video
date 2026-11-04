import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { RoteiroInvalido, carregar, validar } from '../src/roteiro.mjs';

const bom = {
  base_url: 'http://127.0.0.1:8010',
  cenas: [
    { tipo: 'capa', titulo: 'Oi', narracao: 'x' },
    { tipo: 'etapas', titulo: 'Fluxo', etapas: [{ rotulo: 'A', texto: 'um' }] },
    { tipo: 'celular', titulo: 'Loja', url: '/', acoes: [{ clicar: 'Pedir' }, { digitar: [{ papel: 'textbox', nome: 'Nome' }, 'Ana'] }] },
    { tipo: 'fechamento' },
  ],
};

test('roteiro completo passa sem problemas', () => {
  assert.deepEqual(validar(bom), []);
});

test('exige lista de cenas', () => {
  assert.match(validar({}).join(), /cenas/);
  assert.match(validar({ cenas: [] }).join(), /cenas/);
});

test('base_url só é obrigatório com cena gravada', () => {
  assert.deepEqual(validar({ cenas: [{ tipo: 'capa' }] }), []);
  assert.match(validar({ cenas: [{ tipo: 'tela', titulo: 't' }] }).join(), /base_url/);
  assert.match(validar({ base_url: 'nada', cenas: [{ tipo: 'capa' }] }).join(), /URL válida/);
});

test('aponta tipo desconhecido e ação malformada com o número da cena', () => {
  const p = validar({
    base_url: 'http://x',
    cenas: [
      { tipo: 'slide' },
      { tipo: 'tela', titulo: 't', acoes: [{ clicar: 'a', tecla: 'Enter' }, { digitar: 'só texto' }, { clicar: { nome: 'sem papel' } }] },
    ],
  });
  assert.match(p[0], /cena 1: tipo "slide"/);
  assert.match(p[1], /cena 2, ação 1: use exatamente uma/);
  assert.match(p[2], /cena 2, ação 2: "digitar" é \[alvo, texto\]/);
  assert.match(p[3], /cena 2, ação 3: .*"papel"/);
});

test('carregar aplica a marca padrão e resolve caminhos relativos ao roteiro', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-'));
  fs.writeFileSync(path.join(pasta, 'logo.png'), 'png');
  fs.writeFileSync(path.join(pasta, 'sessao.json'), JSON.stringify({ chave: 'k', valor: 'v' }));
  const arquivo = path.join(pasta, 'r.json');
  fs.writeFileSync(arquivo, JSON.stringify({ ...bom, sessao: 'sessao.json', marca: { nome: 'Loja', logo: 'logo.png' } }));

  const r = carregar(arquivo);
  assert.equal(r.marca.nome, 'Loja');
  assert.equal(r.marca.destaque, '#3fae49');
  assert.equal(r.marca.fonteTitulo, r.marca.fonte);
  assert.equal(r.marca.logo, path.join(pasta, 'logo.png'));
  assert.deepEqual(r.sessao, { chave: 'k', valor: 'v' });
});

test('carregar falha cedo com logo inexistente', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-'));
  const arquivo = path.join(pasta, 'r.json');
  fs.writeFileSync(arquivo, JSON.stringify({ ...bom, marca: { logo: 'nao-existe.png' } }));
  assert.throws(() => carregar(arquivo), RoteiroInvalido);
});
