# Publicação: Vercel e Railway

Repositório: `RodrigoMuinhos/toyrush`, branch `main`.

## Vercel — interface

Importar o repositório com **Root Directory `frontend`**, framework Vite, Node.js 24, instalação `npm ci`, build `npm run build` e saída `dist`. O arquivo `frontend/vercel.json` já define o build e as rotas da interface.

Não adicionar Access Token, chave da máquina ou assinatura do webhook às variáveis `VITE_*`. A função `frontend/api/gateway.mjs` permite usar a Vercel com ativação autenticada do terminal, cookie HttpOnly e chave da máquina somente no servidor. Configure `PAYMENTS_API_TARGET`, `TOY_MACHINE_KEY`, `TERMINAL_ACCESS_KEY` e `TERMINAL_ALLOWED_ORIGINS` conforme [o diagnóstico e roteiro Pix](PIX_INTEGRATION_REVIEW.md). O proxy local do gabinete continua disponível como alternativa. Nunca publicar um proxy sem autenticação que injete a chave compartilhada.

## Railway — backend

### Deploy pela raiz do repositório

A raiz também contém `railway.json` e `Dockerfile`, que constroem somente o backend Java. Para essa opção, deixe **Root Directory** em `/` e **Config File** em `/railway.json`. O `.dockerignore` da raiz limita o contexto ao `backend/pom.xml` e `backend/src/`, excluindo credenciais, banco local e dependências do frontend.

Se o log mostrar `Railpack could not determine how to build the app` e listar `backend/` e `frontend/`, o serviço está analisando a raiz sem usar essa configuração. Envie os arquivos novos ao repositório conectado e faça um novo deploy. Como alternativa imediata, use **Root Directory: `/backend`**, **Config File: `/backend/railway.json`** e o Dockerfile dessa pasta, conforme abaixo. Não é necessário criar `start.sh`.

### Deploy pela pasta backend

1. Criar serviço a partir do mesmo repositório, branch `main`, com **Root Directory `/backend`**.
2. Usar o Dockerfile dessa pasta. Se precisar selecionar o arquivo de configuração explicitamente, informar `/backend/railway.json`.
3. Adicionar PostgreSQL com armazenamento persistente ao projeto e manter somente uma réplica deste backend por máquina.
4. No serviço Java, adicionar as referências abaixo. Se o serviço do banco tiver outro nome, substituir `Postgres` pelo nome escolhido.

```text
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
```

O Docker ativa o perfil `railway`, que exige PostgreSQL e monta uma URL JDBC. Não colar uma URL `postgresql://...` na configuração JDBC. O banco local H2 não é enviado nem migrado automaticamente para o Railway.

5. Configurar no serviço Java as variáveis `TOY_MACHINE_ID`, `TOY_MACHINE_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_WEBHOOK_URL`, `MP_LIVE_MODE` e `MP_PIX_PAYER_EMAIL`. `ADMIN_PIN` é opcional. Ver `backend/.env.example`. Os valores secretos precisam ser inseridos no Railway; não estão no GitHub.
6. Gerar um domínio HTTPS público e definir `MP_WEBHOOK_URL=https://SEU-DOMINIO/api/webhooks/mercadopago`. Cadastrar essa URL e o evento Pagamentos na aplicação Mercado Pago.
7. Fazer deploy. O processo escuta em `0.0.0.0` na porta `PORT` fornecida pelo Railway. `/healthz` retorna 200 quando o banco responde; não expõe saldo ou credenciais e não certifica a configuração do Mercado Pago.

## Banco Neon no Railway

Como alternativa ao serviço Postgres do Railway, configure `DATABASE_URL` com a URL JDBC do Neon (sem usuário/senha na query), `DATABASE_USER` e `DATABASE_PASSWORD`. Preserve `sslmode=require&channelBinding=require` na URL. Essas três variáveis têm prioridade sobre as referências `PG*`; remova as referências ao serviço Postgres se usar Neon. Mantenha `SPRING_PROFILES_ACTIVE=railway`. O arquivo local `backend/.env.railway-neon` pode ser usado no Raw Editor; ele é ignorado pelo Git e não deve ser publicado. Isso configura somente o banco, não as credenciais de produção do Mercado Pago.

## Terminal autenticado

Na máquina do jogo, configurar `frontend/.env`:

```text
PAYMENTS_API_TARGET=https://SEU-DOMINIO-RAILWAY
TOY_MACHINE_KEY=mesma-chave-aleatoria-configurada-no-backend
KIOSK_PORT=8444
```

Executar `npm ci`, `npm run build` e `npm run kiosk` dentro de `frontend/`. Abrir `http://127.0.0.1:8444`. O proxy local acrescenta a chave no servidor, sem incluí-la no JavaScript entregue ao navegador.

A integração na Vercel exige ativação do navegador em `/api/terminal`; o modelo continua sendo uma máquina por backend. Não ativar navegadores de visitantes como se fossem máquinas independentes.

## Validação após publicar

Conferir migrações Flyway, `/healthz`, catálogo e saldo pelo terminal. Executar o [checklist Pix](PIX_CHECKLIST.md) com pagamento real antes de operar. Os testes locais e o build não substituem a homologação de PostgreSQL hospedado, webhook e Pix real.

Referências oficiais: [Dockerfiles no Railway](https://docs.railway.com/builds/dockerfiles), [healthchecks](https://docs.railway.com/deployments/healthchecks), [variáveis](https://docs.railway.com/variables/reference) e [monorepos na Vercel](https://vercel.com/docs/monorepos).
