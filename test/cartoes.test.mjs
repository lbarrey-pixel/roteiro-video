import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarCartoes, esc } from '../src/cartoes.mjs';
import { MARCA_PADRAO } from '../src/roteiro.mjs';
import { pareceSeletor } from '../src/gravador.mjs';

const cartoes = criarCartoes({ ...MARCA_PADRAO, nome: 'Loja <Demo>', fonteTitulo: MARCA_PADRAO.fonte });

test('esc neutraliza HTML vindo do roteiro', () => {
  assert.equal(esc('<b>"a" & b</b>'), '&lt;b&gt;&quot;a&quot; &amp; b&lt;/b&gt;');
});

test('capa usa o nome da marca quando a cena não tem título', () => {
  const html = cartoes.cena({ tipo: 'capa' });
  assert.match(html, /<h1>Loja &lt;Demo&gt;<\/h1>/);
  assert.doesNotMatch(html, /<img/);
});

test('etapas numera e repassa --n para a grade', () => {
  const html = cartoes.cena({ tipo: 'etapas', titulo: 'Fluxo', etapas: [{ rotulo: 'A', texto: 'um' }, { rotulo: 'B', texto: 'dois' }], nota: 'obs' });
  assert.match(html, /style="--n:2"/);
  assert.match(html, /<div class="num">2<\/div>/);
  assert.match(html, /<p class="nota">obs<\/p>/);
});

test('cena de celular lista os passos e desenha a moldura', () => {
  const html = cartoes.cena({ tipo: 'celular', titulo: 'Pedir', itens: ['abrir', 'escolher'] });
  assert.match(html, /<li><b>1<\/b><span>abrir<\/span><\/li>/);
  assert.match(html, /border-radius:64px/);
});

test('moldura e legenda saem com fundo transparente', () => {
  assert.match(cartoes.molduraFrente(), /body\{background:transparent\}/);
  assert.match(cartoes.legenda({ titulo: 'x' }), /body\{background:transparent\}/);
});

test('pareceSeletor separa texto visível de seletor CSS', () => {
  assert.equal(pareceSeletor('Adicionar ao carrinho'), false);
  assert.equal(pareceSeletor('#botao'), true);
  assert.equal(pareceSeletor('.card'), true);
  assert.equal(pareceSeletor('[data-id=1]'), true);
  assert.equal(pareceSeletor('input:visible'), true);
});
