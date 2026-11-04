// Grava as cenas: cartões estáticos viram PNG → MP4; cenas de navegação são gravadas pelo
// Playwright e compostas com fundo, moldura e legenda no ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ALTURA, LARGURA, TELA_CELULAR, criarCartoes } from './cartoes.mjs';
import { minimoParaNarrar } from './tempo.mjs';

export const FPS = 30;

export function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

export function duracao(arquivo) {
  const saida = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]);
  return Number(saida.toString().trim());
}

// Cursor e "ripple" de toque desenhados na própria página, para a gravação mostrar onde se clica.
const SCRIPT_TOQUE = `
(() => {
  const instalar = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    Object.assign(c.style, { position: 'fixed', left: '-100px', top: '-100px', width: '22px', height: '22px',
      borderRadius: '50%', background: 'rgba(30,30,30,.55)', border: '2px solid #fff', zIndex: 2147483647,
      pointerEvents: 'none', transform: 'translate(-50%,-50%)', transition: 'left .05s, top .05s' });
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('pointerdown', (e) => {
      const r = document.createElement('div');
      Object.assign(r.style, { position: 'fixed', left: e.clientX + 'px', top: e.clientY + 'px', width: '16px', height: '16px',
        borderRadius: '50%', background: 'rgba(255,255,255,.65)', border: '3px solid rgba(0,0,0,.35)', zIndex: 2147483647,
        pointerEvents: 'none', transform: 'translate(-50%,-50%) scale(1)', transition: 'transform .45s ease-out, opacity .45s' });
      document.body.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'translate(-50%,-50%) scale(3.2)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalar); else instalar();
})();`;

// Alvo de uma ação: { papel, nome } vira getByRole; texto solto vira getByText; o resto é seletor CSS.
export function alvo(pagina, seletor) {
  if (typeof seletor === 'object' && seletor.papel) {
    return pagina.getByRole(seletor.papel, { name: seletor.nome, exact: seletor.exato ?? false }).first();
  }
  if (typeof seletor === 'string' && !pareceSeletor(seletor)) return pagina.getByText(seletor).first();
  return pagina.locator(seletor).first();
}

export function pareceSeletor(texto) {
  return /^[.#[]|^\w+[=:]/.test(texto);
}

async function moverAte(pagina, loc) {
  await loc.scrollIntoViewIfNeeded();
  const caixa = await loc.boundingBox();
  if (!caixa) return;
  await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 18 });
}

async function executar(pagina, acao, base) {
  const espera = (s) => pagina.waitForTimeout(s * 1000);
  if (acao.ir) {
    await pagina.goto(new URL(acao.ir, base).toString(), { waitUntil: 'networkidle' });
  } else if (acao.clicar) {
    const loc = alvo(pagina, acao.clicar);
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    await moverAte(pagina, loc);
    await espera(0.35);
    await loc.click();
  } else if (acao.digitar) {
    const [seletor, texto] = acao.digitar;
    const loc = alvo(pagina, seletor);
    await moverAte(pagina, loc);
    await loc.click();
    await loc.pressSequentially(texto, { delay: 55 });
  } else if (acao.tecla) {
    await pagina.keyboard.press(acao.tecla);
  } else if (acao.rolar) {
    for (let i = 0; i < 12; i++) {
      await pagina.mouse.wheel(0, acao.rolar / 12);
      await espera(0.04);
    }
  } else if (acao.esperarTexto) {
    await pagina.getByText(acao.esperarTexto).first().waitFor({ timeout: 30000 });
  }
  await espera(acao.esperar ?? acao.pausa ?? 0.8);
}

export class Gravador {
  constructor(roteiro, pastaSaida) {
    this.roteiro = roteiro;
    this.saida = pastaSaida;
    this.trabalho = path.join(pastaSaida, '.trabalho');
    this.cartoes = criarCartoes(roteiro.marca);
    fs.mkdirSync(this.trabalho, { recursive: true });
  }

  async abrir() {
    // --lang faz datas e números dos campos saírem no formato do roteiro.
    this.navegador = await chromium.launch({ args: [`--lang=${this.roteiro.idioma ?? 'pt-BR'}`] });
  }

  async fechar() {
    await this.navegador?.close();
  }

  async png(html, arquivo, transparente = false) {
    const pagina = await this.navegador.newPage({ viewport: { width: LARGURA, height: ALTURA } });
    await pagina.setContent(html, { waitUntil: 'load' });
    await pagina.screenshot({ path: arquivo, omitBackground: transparente });
    await pagina.close();
  }

  async cena(cena, indice) {
    return ['capa', 'etapas', 'fechamento'].includes(cena.tipo) ? this.cenaParada(cena, indice) : this.cenaGravada(cena, indice);
  }

  async cenaParada(cena, indice) {
    const imagem = path.join(this.trabalho, `cena-${indice}.png`);
    await this.png(this.cartoes.cena(cena), imagem);
    const dur = Math.max(cena.duracao ?? 5, minimoParaNarrar(cena));
    const saida = path.join(this.trabalho, `cena-${indice}.mp4`);
    ffmpeg(['-loop', '1', '-i', imagem, '-t', dur.toFixed(2), '-r', String(FPS), '-vf', 'format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', saida]);
    return saida;
  }

  async gravarNavegacao(cena, indice) {
    const { roteiro } = this;
    const celular = cena.tipo === 'celular';
    // O vídeo do Playwright sai no tamanho da janela; se pedir maior, a página fica num canto.
    const viewport = celular ? { width: 390, height: 844 } : { width: 1600, height: 900 };
    const pastaVideo = path.join(this.trabalho, `bruto-${indice}`);
    fs.rmSync(pastaVideo, { recursive: true, force: true });

    const contexto = await this.navegador.newContext({
      viewport,
      deviceScaleFactor: celular ? 2 : 1,
      isMobile: celular,
      hasTouch: false,
      locale: roteiro.idioma ?? 'pt-BR',
      timezoneId: roteiro.fuso ?? 'America/Sao_Paulo',
      recordVideo: { dir: pastaVideo, size: viewport },
      serviceWorkers: 'block',
    });
    const t0 = Date.now();
    if (roteiro.sessao && cena.logado) {
      await contexto.addInitScript(
        ([chave, valor]) => {
          try { localStorage.setItem(chave, valor); } catch {}
        },
        [roteiro.sessao.chave, roteiro.sessao.valor],
      );
    }
    await contexto.addInitScript(SCRIPT_TOQUE);
    const pagina = await contexto.newPage();
    await pagina.goto(new URL(cena.url ?? '/', roteiro.base_url).toString(), { waitUntil: 'networkidle' });
    if (cena.esperarTexto) await pagina.getByText(cena.esperarTexto).first().waitFor({ timeout: 30000 });
    await pagina.waitForTimeout(400);
    const inicio = (Date.now() - t0) / 1000; // o que veio antes disso é carregamento e sai no corte
    await pagina.mouse.move(viewport.width / 2, viewport.height * 0.7);
    for (const acao of cena.acoes ?? []) await executar(pagina, acao, roteiro.base_url);
    await pagina.waitForTimeout((cena.final ?? 1.5) * 1000);
    const video = pagina.video();
    await contexto.close();
    return { bruto: await video.path(), inicio };
  }

  async cenaGravada(cena, indice) {
    const { bruto, inicio } = await this.gravarNavegacao(cena, indice);
    const durBruto = duracao(bruto) - inicio;
    const falta = Math.max(0, minimoParaNarrar(cena) - durBruto); // segura o último quadro até caber a narração
    const saida = path.join(this.trabalho, `cena-${indice}.mp4`);
    const fundo = path.join(this.trabalho, `fundo-${indice}.png`);
    const frente = path.join(this.trabalho, `frente-${indice}.png`);

    const corte = `[1:v]trim=start=${inicio.toFixed(2)},setpts=PTS-STARTPTS,fps=${FPS}`;
    const segurar = `tpad=stop_mode=clone:stop_duration=${falta.toFixed(2)}[v]`;
    let filtro;
    if (cena.tipo === 'celular') {
      await this.png(this.cartoes.cena(cena), fundo);
      await this.png(this.cartoes.molduraFrente(), frente, true);
      const t = TELA_CELULAR;
      filtro = `${corte},scale=${t.w}:${t.h},${segurar};[0:v][v]overlay=${t.x}:${t.y}:shortest=1[a];[a][2:v]overlay=0:0,format=yuv420p`;
    } else {
      await this.png(this.cartoes.vazio(), fundo);
      await this.png(this.cartoes.legenda(cena), frente, true);
      filtro = `${corte},scale=${LARGURA}:${ALTURA},${segurar};[0:v][v]overlay=0:0:shortest=1[a];[a][2:v]overlay=0:0,format=yuv420p`;
    }
    ffmpeg(['-loop', '1', '-i', fundo, '-i', bruto, '-loop', '1', '-i', frente, '-filter_complex', filtro,
      '-t', (durBruto + falta).toFixed(2), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-an', saida]);
    return saida;
  }

  concatenar(arquivos) {
    const lista = path.join(this.trabalho, 'lista.txt');
    fs.writeFileSync(lista, arquivos.map((a) => `file '${path.resolve(a)}'`).join('\n'));
    const video = path.join(this.saida, 'video.mp4');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', video]);
    return video;
  }
}
