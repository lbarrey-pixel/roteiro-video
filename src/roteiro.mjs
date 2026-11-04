// Leitura e validação do roteiro. Erros de formato aparecem aqui, antes de abrir o navegador,
// e não no meio da gravação.

import fs from 'node:fs';
import path from 'node:path';

export const TIPOS_PARADOS = ['capa', 'etapas', 'fechamento'];
export const TIPOS_GRAVADOS = ['celular', 'tela'];
const TIPOS = [...TIPOS_PARADOS, ...TIPOS_GRAVADOS];
const ACOES = ['ir', 'clicar', 'digitar', 'tecla', 'rolar', 'esperarTexto'];

export const MARCA_PADRAO = {
  nome: 'Sistema',
  subtitulo: '',
  fundo: '#0f1e3d',
  fundo2: '#14305f',
  destaque: '#3fae49',
  texto: '#ffffff',
  textoSuave: 'rgba(255,255,255,0.72)',
  fonte: 'Inter, "Segoe UI", system-ui, sans-serif',
};

export class RoteiroInvalido extends Error {
  constructor(problemas) {
    super(`roteiro inválido:\n  - ${problemas.join('\n  - ')}`);
    this.problemas = problemas;
  }
}

// Devolve a lista de problemas; vazia quando o roteiro está bom.
export function validar(roteiro) {
  const p = [];
  if (!roteiro || typeof roteiro !== 'object') return ['o roteiro precisa ser um objeto JSON'];
  if (!Array.isArray(roteiro.cenas) || roteiro.cenas.length === 0) p.push('"cenas" precisa ser uma lista com ao menos uma cena');

  const temGravada = (roteiro.cenas ?? []).some((c) => TIPOS_GRAVADOS.includes(c?.tipo));
  if (temGravada && !roteiro.base_url) p.push('"base_url" é obrigatório quando há cenas do tipo celular ou tela');
  if (roteiro.base_url) {
    try {
      new URL(roteiro.base_url);
    } catch {
      p.push(`"base_url" não é uma URL válida: ${roteiro.base_url}`);
    }
  }

  (roteiro.cenas ?? []).forEach((cena, i) => {
    const onde = `cena ${i + 1}`;
    if (!cena || typeof cena !== 'object') return p.push(`${onde}: precisa ser um objeto`);
    if (!TIPOS.includes(cena.tipo)) return p.push(`${onde}: tipo "${cena.tipo}" desconhecido (use ${TIPOS.join(', ')})`);
    if (cena.tipo === 'etapas') {
      if (!Array.isArray(cena.etapas) || cena.etapas.length === 0) p.push(`${onde}: "etapas" precisa ser uma lista`);
      else cena.etapas.forEach((e, j) => {
        if (!e?.texto) p.push(`${onde}: etapa ${j + 1} sem "texto"`);
      });
      if (!cena.titulo) p.push(`${onde}: cena de etapas sem "titulo"`);
    }
    if (TIPOS_GRAVADOS.includes(cena.tipo)) {
      if (!cena.titulo) p.push(`${onde}: cena gravada sem "titulo"`);
      (cena.acoes ?? []).forEach((a, j) => {
        const chaves = Object.keys(a ?? {}).filter((k) => ACOES.includes(k));
        if (chaves.length !== 1) p.push(`${onde}, ação ${j + 1}: use exatamente uma de ${ACOES.join(', ')}`);
        if (a?.digitar && !(Array.isArray(a.digitar) && a.digitar.length === 2)) {
          p.push(`${onde}, ação ${j + 1}: "digitar" é [alvo, texto]`);
        }
        if (a?.clicar && typeof a.clicar === 'object' && !a.clicar.papel) {
          p.push(`${onde}, ação ${j + 1}: alvo por objeto precisa de "papel" (e opcionalmente "nome")`);
        }
      });
    }
    if (cena.duracao !== undefined && !(Number(cena.duracao) > 0)) p.push(`${onde}: "duracao" precisa ser maior que zero`);
  });

  return p;
}

// Lê o arquivo, valida e resolve os caminhos (logo, fontes, sessão) em relação ao próprio roteiro.
export function carregar(arquivo) {
  const base = path.dirname(path.resolve(arquivo));
  const roteiro = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const problemas = validar(roteiro);
  if (problemas.length) throw new RoteiroInvalido(problemas);

  const marca = { ...MARCA_PADRAO, ...roteiro.marca };
  if (marca.logo) marca.logo = path.resolve(base, marca.logo);
  marca.fontes = (marca.fontes ?? []).map((f) => ({ ...f, arquivo: path.resolve(base, f.arquivo) }));
  marca.fonteTitulo ??= marca.fonte;

  for (const arq of [marca.logo, ...marca.fontes.map((f) => f.arquivo)].filter(Boolean)) {
    if (!fs.existsSync(arq)) throw new RoteiroInvalido([`arquivo não encontrado: ${arq}`]);
  }

  const sessao = roteiro.sessao ? JSON.parse(fs.readFileSync(path.resolve(base, roteiro.sessao), 'utf8')) : null;
  return { ...roteiro, marca, sessao, base };
}
