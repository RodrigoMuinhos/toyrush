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

## Créditos e Pix

O saldo e o consumo de créditos agora são autorizados pelo backend Spring Boot em `backend/`. F8 não adiciona créditos. O menu tem **Comprar créditos**, com QR Pix dentro do jogo e retorno automático após aprovação.

Configuração, execução do terminal, testes e pendências da integração real estão em [backend/README.md](backend/README.md). A implantação estática na Vercel, sozinha, não fornece o backend nem a autenticação local da máquina.

## Validação

```sh
cd frontend
npx tsc --noEmit
npm run build
```

O instalador Windows ainda está em preparação; esta versão publica o jogo web.

## Arquitetura e homologação

Para publicar, siga [Vercel + Railway](docs/DEPLOY.md): frontend em `frontend/`, backend em `backend/` e PostgreSQL persistente.

Consulte [o mapa de módulos](docs/ARCHITECTURE.md) e [o checklist Pix](docs/PIX_CHECKLIST.md). O teste com pagamento real ainda está pendente.
