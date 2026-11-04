// Loja de demonstração: tudo em memória e localStorage, sem servidor.
const PRODUTOS = [
  { id: 'p1', nome: 'Cesta pequena', desc: 'Folhas, 3 legumes e ervas', preco: 3900 },
  { id: 'p2', nome: 'Cesta família', desc: 'Folhas, 6 legumes, frutas e ovos', preco: 7900 },
  { id: 'p3', nome: 'Caixa de frutas', desc: 'Frutas da estação, 3 kg', preco: 4500 },
  { id: 'p4', nome: 'Mel 500 g', desc: 'Mel silvestre do apiário vizinho', preco: 3200 },
];

const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const carrinho = new Map();
const $ = (s) => document.querySelector(s);

function desenharProdutos() {
  $('#produtos').innerHTML = PRODUTOS.map(
    (p) => `<li><div><div class="nome">${p.nome}</div><div class="desc">${p.desc}</div></div>
      <div class="preco">${reais(p.preco)}</div>
      <button type="button" data-add="${p.id}" aria-label="Adicionar ${p.nome}">Adicionar</button></li>`,
  ).join('');
}

function desenharCarrinho() {
  const itens = [...carrinho.values()];
  $('#carrinho').hidden = itens.length === 0;
  $('#itens').innerHTML = itens.map((i) => `<li>${i.qtd}× ${i.nome} — ${reais(i.preco * i.qtd)}</li>`).join('');
  $('#total').textContent = reais(itens.reduce((s, i) => s + i.preco * i.qtd, 0));
}

document.addEventListener('click', (e) => {
  const id = e.target.dataset?.add;
  if (!id) return;
  const p = PRODUTOS.find((x) => x.id === id);
  const atual = carrinho.get(id) ?? { ...p, qtd: 0 };
  atual.qtd += 1;
  carrinho.set(id, atual);
  desenharCarrinho();
});

$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(e.target));
  const pedidos = JSON.parse(localStorage.getItem('pedidos') ?? '[]');
  const numero = 1000 + pedidos.length + 1;
  const itens = [...carrinho.values()];
  pedidos.push({ numero, ...dados, total: itens.reduce((s, i) => s + i.preco * i.qtd, 0), itens, situacao: 'aberto' });
  localStorage.setItem('pedidos', JSON.stringify(pedidos));
  $('#numero').textContent = `#${numero}`;
  $('#quem').textContent = dados.nome;
  $('#dia').textContent = dados.dia.toLowerCase();
  document.querySelectorAll('#loja > h1, #loja > .sub, #produtos, #carrinho').forEach((el) => (el.hidden = true));
  $('#confirmacao').hidden = false;
});

$('#novo').addEventListener('click', () => location.reload());

desenharProdutos();
