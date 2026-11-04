// HTML dos cartões (capa, etapas, fechamento), do lado esquerdo das cenas gravadas, da moldura do
// celular e da legenda. Tudo vira PNG via Playwright antes de entrar no ffmpeg.

import fs from 'node:fs';
import path from 'node:path';

export const LARGURA = 1920;
export const ALTURA = 1080;

// Área da tela do celular dentro da moldura, na composição final.
export const TELA_CELULAR = { x: 1290, y: 70, w: 432, h: 940 };
export const BORDA = 16;

export function esc(t = '') {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function dataUri(arquivo) {
  const ext = path.extname(arquivo).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(arquivo).toString('base64')}`;
}

function fontFaces(fontes) {
  return fontes
    .map((f) => {
      const dados = fs.readFileSync(f.arquivo).toString('base64');
      return `@font-face{font-family:'${f.familia}';src:url(data:font/woff2;base64,${dados}) format('woff2');font-weight:100 900;}`;
    })
    .join('');
}

export function css(marca) {
  return `${fontFaces(marca.fontes ?? [])}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${LARGURA}px; height: ${ALTURA}px; }
body { font-family: ${marca.fonte}; color: ${marca.texto};
  background: radial-gradient(120% 120% at 0% 100%, ${marca.fundo2} 0%, ${marca.fundo} 60%); overflow: hidden; }
.marca { display: flex; align-items: center; gap: 14px; font-size: 22px; font-weight: 600; }
.marca img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
.faixa { display: flex; gap: 10px; margin-top: 56px; }
.faixa i { width: 52px; height: 6px; border-radius: 3px; background: ${marca.destaque}; opacity: .9; }
.faixa i:nth-child(odd) { opacity: .55; }
.capa { position: absolute; left: 140px; top: 300px; width: 1400px; }
.capa h1 { font-family: ${marca.fonteTitulo}; font-size: 92px; line-height: 1.05; margin: 34px 0 22px; letter-spacing: -1px; }
.capa p { font-size: 32px; color: ${marca.textoSuave}; line-height: 1.35; }
.etapas { position: absolute; left: 140px; top: 170px; right: 140px; }
.etapas h2 { font-family: ${marca.fonteTitulo}; font-size: 56px; margin-bottom: 48px; }
.grade { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 22px; }
.etapa { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 26px 22px; min-height: 260px; }
.num { width: 48px; height: 48px; border-radius: 50%; background: ${marca.destaque}; display: grid; place-items: center; font-weight: 700; font-size: 24px; }
.rot { margin-top: 22px; font-size: 16px; letter-spacing: 2px; font-weight: 700; color: ${marca.destaque}; }
.etapa p { margin-top: 10px; font-size: 25px; line-height: 1.3; }
.nota { margin-top: 44px; font-size: 26px; color: ${marca.textoSuave}; }
.lado { position: absolute; left: 140px; top: 0; bottom: 0; width: 920px; display: flex; flex-direction: column; justify-content: center; }
.lado .rot { font-size: 18px; margin: 0 0 14px; }
.lado h2 { font-family: ${marca.fonteTitulo}; font-size: 72px; line-height: 1.05; letter-spacing: -1px; margin-bottom: 38px; }
ol { list-style: none; display: grid; gap: 20px; }
li { display: flex; align-items: center; gap: 18px; font-size: 30px; line-height: 1.25; }
li b { flex: none; width: 40px; height: 40px; border-radius: 50%; background: ${marca.destaque}; display: grid; place-items: center; font-size: 20px; }
.legenda { position: absolute; left: 40px; bottom: 40px; max-width: 1200px; background: rgba(10,10,10,0.78); border-radius: 18px; padding: 18px 26px; }
.legenda .rot { margin: 0 0 6px; }
.legenda h2 { font-family: ${marca.fonteTitulo}; font-size: 34px; }
`;
}

export function criarCartoes(marca) {
  const estilo = css(marca);
  const logo = marca.logo ? dataUri(marca.logo) : null;

  const base = (corpo, transparente = false) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${estilo}${
      transparente ? 'body{background:transparent}' : ''
    }</style></head><body>${corpo}</body></html>`;

  const blocoMarca = () => `<div class="marca">${logo ? `<img src="${logo}">` : ''}<span>${esc(marca.nome)}</span></div>`;
  const faixa = '<div class="faixa">' + '<i></i>'.repeat(7) + '</div>';
  const t = TELA_CELULAR;
  const caixaMoldura = `left:${t.x - BORDA}px;top:${t.y - BORDA}px;width:${t.w + 2 * BORDA}px;height:${t.h + 2 * BORDA}px;border-radius:64px`;

  return {
    vazio: () => base(''),

    cena(cena) {
      if (cena.tipo === 'capa' || cena.tipo === 'fechamento') {
        return base(
          `<section class="capa">${blocoMarca()}<h1>${esc(cena.titulo ?? marca.nome)}</h1><p>${esc(
            cena.subtitulo ?? marca.subtitulo,
          )}</p>${faixa}</section>`,
        );
      }
      if (cena.tipo === 'etapas') {
        const etapas = cena.etapas
          .map((e, i) => `<div class="etapa"><div class="num">${i + 1}</div><div class="rot">${esc(e.rotulo)}</div><p>${esc(e.texto)}</p></div>`)
          .join('');
        return base(
          `<section class="etapas"><h2>${esc(cena.titulo)}</h2><div class="grade" style="--n:${cena.etapas.length}">${etapas}</div>${
            cena.nota ? `<p class="nota">${esc(cena.nota)}</p>` : ''
          }</section>`,
        );
      }
      const itens = (cena.itens ?? []).map((txt, i) => `<li><b>${i + 1}</b><span>${esc(txt)}</span></li>`).join('');
      const moldura = `<div style="position:absolute;${caixaMoldura};background:#0b0b0b;box-shadow:0 40px 90px rgba(0,0,0,.5)"></div>`;
      return base(`<section class="lado"><p class="rot">${esc(cena.rotulo ?? '')}</p><h2>${esc(cena.titulo)}</h2><ol>${itens}</ol></section>${moldura}`);
    },

    // Só a borda do celular, com o miolo transparente: fica por cima do vídeo.
    molduraFrente: () => base(`<div style="position:absolute;${caixaMoldura};border:${BORDA}px solid #0b0b0b"></div>`, true),

    legenda: (cena) => base(`<div class="legenda"><p class="rot">${esc(cena.rotulo ?? '')}</p><h2>${esc(cena.titulo)}</h2></div>`, true),
  };
}
