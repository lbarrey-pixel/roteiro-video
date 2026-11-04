const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
let filtro = 'todos';

// Sem pedidos gravados, mostra alguns de exemplo para o painel não abrir vazio.
const EXEMPLO = [
  { numero: 1001, nome: 'Carlos', dia: 'Terça', total: 7900, situacao: 'entregue' },
  { numero: 1002, nome: 'Beatriz', dia: 'Sexta', total: 4500, situacao: 'aberto' },
  { numero: 1003, nome: 'Marina', dia: 'Terça', total: 11100, situacao: 'aberto' },
];

function pedidos() {
  const salvos = JSON.parse(localStorage.getItem('pedidos') ?? 'null');
  if (salvos) return salvos;
  localStorage.setItem('pedidos', JSON.stringify(EXEMPLO));
  return EXEMPLO;
}

function desenhar() {
  const lista = pedidos().filter((p) => filtro === 'todos' || p.situacao === filtro);
  document.querySelector('#vazio').hidden = lista.length > 0;
  document.querySelector('#pedidos').innerHTML = lista
    .map(
      (p) => `<tr><td>#${p.numero}</td><td>${p.nome}</td><td>${p.dia}</td><td>${reais(p.total)}</td>
        <td><span class="tag ${p.situacao}">${p.situacao === 'aberto' ? 'Em aberto' : 'Entregue'}</span></td>
        <td>${p.situacao === 'aberto' ? `<button class="sec" data-entregar="${p.numero}">Marcar entregue</button>` : ''}</td></tr>`,
    )
    .join('');
}

document.addEventListener('click', (e) => {
  if (e.target.dataset?.filtro) {
    filtro = e.target.dataset.filtro;
    document.querySelectorAll('.filtros button').forEach((b) => b.classList.toggle('ativo', b === e.target));
    desenhar();
  }
  if (e.target.dataset?.entregar) {
    const lista = pedidos();
    const p = lista.find((x) => String(x.numero) === e.target.dataset.entregar);
    if (p) p.situacao = 'entregue';
    localStorage.setItem('pedidos', JSON.stringify(lista));
    desenhar();
  }
});

desenhar();
