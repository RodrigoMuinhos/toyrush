# Toy Factory Rush

O aplicativo React + Vite está em `frontend/`.

## Rodar localmente

Requer Node.js 22.12+ ou 24 LTS.

```sh
cd frontend
npm ci
npm run dev
```

Acesse http://localhost:8443.

## Publicar na Vercel

Importe este repositório e selecione **Root Directory: frontend**.
Framework: Vite. Instalação: `npm ci`. Build: `npm run build`.
Output Directory: `dist`. A configuração está em `frontend/vercel.json`.

## Testes manuais

F8 adiciona uma ficha de teste: duas partidas solo ou uma em dupla.
Créditos e recorde ficam no navegador, em localStorage, separados por domínio.
O mecanismo de créditos é um protótipo local, sem integração de pagamentos.

## Validação

```sh
cd frontend
npx tsc --noEmit
npm run build
```

O instalador Windows ainda está em preparação; esta versão publica o jogo web.
