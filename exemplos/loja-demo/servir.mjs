// Serve a loja de demonstração em http://127.0.0.1:8010 (só arquivos estáticos, sem dependências).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const porta = Number(process.env.PORTA ?? 8010);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const arquivo = path.join(raiz, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!arquivo.startsWith(raiz) || !fs.existsSync(arquivo)) {
      res.writeHead(404).end('não encontrado');
      return;
    }
    res.writeHead(200, { 'content-type': tipos[path.extname(arquivo)] ?? 'application/octet-stream' });
    fs.createReadStream(arquivo).pipe(res);
  })
  .listen(porta, '127.0.0.1', () => console.log(`loja demo em http://127.0.0.1:${porta}`));
