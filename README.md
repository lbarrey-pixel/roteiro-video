# roteiro-video

Records a video manual of a web system from a JSON script. The result is a
1920×1080 MP4 without audio, plus the narration text scene by scene with the
timing of each one, so the voice can be generated separately (human voiceover
or TTS).

Each scene is one of five types: opening card, step flow, phone (a screen
recorded in a frame, with the numbered steps beside it), computer screen with
a caption, and closing card. The script states the brand, the system URL, and
what happens in each scene; the program navigates, records, and assembles the
video.

![Phone scene](docs/cena-celular.png)

> Portfolio version. The tool was built to record the manual of a production
> system; the example here uses a fictional store included in the repository,
> and the production code is private under contract.

## Stack

- Node 18+ (ESM), no framework
- [Playwright](https://playwright.dev) with Chromium: renders the cards, records
  navigation, and injects a cursor and a tap "ripple" on the page
- ffmpeg: compositing (background + video + frame/caption), `tpad` to hold the
  last frame until the narration fits, and final concatenation
- Tests with `node:test`, no extra dependencies

## Run the example

```bash
npm install
npx playwright install chromium     # uma vez
npm run demo:site                   # loja fictícia em http://127.0.0.1:8010
npm run demo:gravar                 # em outro terminal → saida/video.mp4
```

Requires `ffmpeg` and `ffprobe` on PATH. Output in `saida/`: `video.mp4`,
`narracao.md` (text, start, end, and duration of each scene), and
`narracao.srt` (subtitles).

To adjust a scene without re-recording everything:

```bash
CENAS=3,4 node gravar.mjs exemplos/loja-demo/roteiro.json saida/
```

## Script

```jsonc
{
  "titulo": "Nome do manual",
  "base_url": "http://127.0.0.1:8010",   // o sistema a gravar (de preferência uma demonstração)
  "sessao": "sessao.json",                // opcional: {"chave": "...", "valor": "..."} no localStorage
  "idioma": "pt-BR",
  "fuso": "America/Sao_Paulo",
  "marca": {
    "nome": "Marca", "subtitulo": "…", "logo": "logo.webp",
    "fundo": "#173b25", "fundo2": "#2f7d4a", "destaque": "#f2c14e", "texto": "#f7fbf5",
    "fonte": "'Figtree', sans-serif", "fonteTitulo": "'Fraunces', serif",
    "fontes": [{ "familia": "Figtree", "arquivo": "figtree.woff2" }]
  },
  "cenas": [
    { "tipo": "capa", "titulo": "…", "subtitulo": "…", "duracao": 5, "narracao": "…" },
    { "tipo": "etapas", "titulo": "…", "etapas": [{ "rotulo": "CLIENTE", "texto": "…" }], "nota": "…", "narracao": "…" },
    {
      "tipo": "celular",                    // ou "tela" (computador, 1600×900)
      "rotulo": "LOJA · CELULAR", "titulo": "…", "itens": ["passo 1", "passo 2"],
      "url": "/", "logado": true, "esperarTexto": "Cestas da semana",
      "acoes": [
        { "clicar": { "papel": "button", "nome": "Adicionar" }, "esperar": 1 },
        { "clicar": "texto visível" },
        { "digitar": [{ "papel": "textbox", "nome": "Nome" }, "Marina"] },
        { "tecla": "Enter" }, { "rolar": 400 }, { "ir": "/outra-pagina" }, { "esperarTexto": "Pronto" }
      ],
      "final": 2,
      "narracao": "…"
    },
    { "tipo": "fechamento", "titulo": "…", "subtitulo": "…", "narracao": "…" }
  ]
}
```

- Paths (logo, fonts, session) are relative to the script file.
- Action targets: `{ "papel", "nome" }` uses `getByRole`; a plain string uses
  `getByText`; anything else is a CSS selector.
- Each scene lasts at least as long as it takes to narrate its text (2.4 words
  per second + 1 s); if the recording is shorter, the last frame is held.
- The script is validated before the browser opens: a field error is reported
  with the scene number and the action number, not in the middle of the
  recording.

## How it's organized

| File | What it does |
| --- | --- |
| `gravar.mjs` | CLI: reads the script, records scene by scene, concatenates, and writes the narration |
| `src/roteiro.mjs` | Loads, validates, and resolves the script's paths |
| `src/cartoes.mjs` | HTML/CSS for the cards, the phone frame, and the caption |
| `src/gravador.mjs` | Playwright (contexts, actions, cursor) and ffmpeg calls |
| `src/tempo.mjs` | Narration timing, SRT timestamps, and generation of `narracao.md`/`.srt` |
| `test/` | Tests of the pure parts (validation, cards, timings) |
| `exemplos/loja-demo/` | Fictional store (static HTML) and the script that records it |

## Decisions

- **Cards in HTML, not in ffmpeg `drawtext`.** Typography, grid, and embedded
  fonts are trivial in the browser; ffmpeg only receives finished PNGs.
- **Video recorded at window size.** Playwright records the page at the viewport
  size; scaling to the frame is done in ffmpeg, which handles that better than
  recording at a larger size.
- **Narration separate from the video.** The MP4 comes out without audio and
  with the timings in `narracao.md`, so the voice can be swapped (narrator,
  TTS, another language) without re-recording anything.
- **Injected session, never automated login.** For screens that require login,
  the script injects a demo session into `localStorage`; a production password
  does not go into the script.

## Precautions

- Record against a demo with fictional data, never against real customer data.
- The raw Playwright video stays in `saida/.trabalho/`; the folder is disposable.
