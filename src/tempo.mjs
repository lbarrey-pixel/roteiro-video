// Tempo de narração, carimbos de legenda e geração de narracao.md / narracao.srt.

export const PALAVRAS_POR_SEGUNDO = 2.4; // ritmo calmo em português
export const FOLGA_NARRACAO_S = 1;

export function palavras(texto = '') {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

// Menor duração que uma cena pode ter para caber a narração dela.
export function minimoParaNarrar(cena, ritmo = PALAVRAS_POR_SEGUNDO) {
  return palavras(cena.narracao) / ritmo + FOLGA_NARRACAO_S;
}

// 0:07.5, 1:02.0
export function hms(segundos) {
  const m = Math.floor(segundos / 60);
  return `${m}:${(segundos - m * 60).toFixed(1).padStart(4, '0')}`;
}

// 00:01:02,500
export function srt(segundos) {
  const ms = Math.round(segundos * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(h)}:${dois(m)}:${dois(s)},${String(ms % 1000).padStart(3, '0')}`;
}

// Recebe [{ cena, dur }] na ordem do vídeo e devolve os dois textos de apoio à narração.
export function montarNarracao(segmentos, { titulo, duracaoTotal, ritmo = PALAVRAS_POR_SEGUNDO }) {
  const md = [
    `# Narração: ${titulo}`,
    '',
    `Vídeo: \`video.mp4\`, ${hms(duracaoTotal)}, 1920×1080, sem áudio. Ritmo de referência: ${ritmo} palavras por segundo; cada cena tem tempo para o texto dela.`,
    '',
  ];
  const legendas = [];
  let t = 0;
  segmentos.forEach((s, i) => {
    const fim = t + s.dur;
    const nome = s.cena.titulo ?? s.cena.tipo;
    md.push(`## ${i + 1}. ${nome} (${hms(t)} a ${hms(fim)}, ${s.dur.toFixed(1)} s)`, '');
    md.push(s.cena.narracao?.trim() || '_(sem narração)_', '');
    if (s.cena.narracao) {
      legendas.push(String(legendas.length / 4 + 1), `${srt(t)} --> ${srt(fim - 0.2)}`, s.cena.narracao.trim(), '');
    }
    t = fim;
  });
  return { md: md.join('\n'), srt: legendas.join('\n'), total: t };
}
