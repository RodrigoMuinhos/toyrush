# Pix: diagnóstico e correções — 13/09/2026

## Evidência em produção

- `https://toyrush-production.up.railway.app/api/payments/packages` sem chave: HTTP 401. Com a chave do serviço Railway: HTTP 200, `ready: true`, pacotes `pkg-2-5` (2/R$5), `pkg-4-10` (4/R$10), `pkg-6-15` (6/R$15).
- Nos dois domínios públicos da Vercel, `/api/payments/packages` retornava HTTP 200 **text/html**, o HTML da SPA. `response.json().catch(() => ({}))` convertia esse erro em objeto vazio. O modal interpretava `!catalog.ready` como configuração incompleta. Essa é a causa comprovada da mensagem atual.
- A única variável Production encontrada na Vercel era `VITE_API_URL`. O código não a utiliza. A URL existente no projeto é `PAYMENTS_API_TARGET`, usada no servidor Vite/kiosk e agora na função Vercel.
- O Access Token do Railway autenticou `/users/me`: conta real, `MP_LIVE_MODE=true`, webhook apontando ao domínio correto. `MP_PIX_PAYER_EMAIL` está preenchido e permanece no backend, sem formulário para o jogador, conforme solicitado.
- A tentativa real de `pkg-2-5` retornou HTTP 502 no backend antigo. Consulta da resposta do provedor, usando a mesma chave de idempotência e dados da intenção: HTTP 400, causa **13253**, `Collector user without key enabled for QR rendernull`. Não houve `paymentId` nem QR. A tentativa criada nesta verificação foi encerrada; saldo confirmado em zero.
- `/healthz` respondeu 404 no deploy observado, embora exista no código local. Conferir a revisão implantada; conectividade do catálogo não comprova que todo o código local foi publicado.

## Autenticação e arquitetura

`ApiSecurity.java` gera “Máquina não autenticada”. Exige somente **`X-Machine-Key`**, com comparação constante (`MessageDigest.isEqual`) à `TOY_MACHINE_KEY` configurada e tamanho mínimo de 32 caracteres. **Não existe header `X-Machine-Id`.** `TOY_MACHINE_ID` é selecionado pelo servidor, usado no saldo, sessões, referência externa e metadata. Uma instância atende uma máquina.

Todos os caminhos `/api/**` são protegidos, incluindo catálogo, criação, status, saldo, encerramento, game-sessions e admin. Apenas `/api/webhooks/mercadopago` é excluído desse interceptor e usa assinatura própria. OPTIONS de preflight é tratado por CORS e não concede acesso aos endpoints de dados.

A SPA pública não deve receber a chave da máquina. O novo caminho é:

`navegador ativado → /api na Vercel → função gateway → X-Machine-Key → Railway → Mercado Pago`

O operador abre `/api/terminal` no navegador do totem e informa `TERMINAL_ACCESS_KEY`, uma chave aleatória diferente da chave da máquina. A função emite cookie assinado `HttpOnly; Secure; SameSite=Strict`, válido por 30 dias. A assinatura depende das duas chaves; trocar uma delas revoga as sessões. A função verifica origem para POST e permite apenas as rotas necessárias ao jogo/Pix. Não encaminha cookies ou headers arbitrários ao Railway e não publica o webhook nem o admin através do gateway. O admin continua no terminal local. Nunca colocar essas chaves em `VITE_*` ou `NEXT_PUBLIC_*`.

Somente ative navegadores do totem: esta arquitetura continua sendo uma máquina por backend, não contas/saldos separados para visitantes de um site público. Para várias máquinas, será necessário cadastro, pareamento revogável por terminal e associação de saldo por credencial. A chave de ativação deve ter alta entropia; não usar PIN curto. O PIN administrativo é independente.

## Alterações desta correção

| Arquivo | Alteração |
| --- | --- |
| `frontend/vercel.json` | Encaminha `/api/*` à função antes do fallback da SPA. |
| `frontend/api/gateway.mjs` | Proxy com autenticação do terminal, cookie, allowlist, origem, limites e chave somente no servidor. |
| `frontend/src/shared/http.ts` | Rejeita HTML como erro de API, em vez de aceitar objeto vazio. |
| `frontend/src/payments/services/paymentApi.ts` | Valida o formato do catálogo. |
| `frontend/src/payments/components/PixPurchaseModal.tsx` | Link de ativação quando o servidor retorna terminal não ativado; nenhum campo de e-mail. |
| `frontend/src/payments/types.ts` | Tipagem do diagnóstico de configuração. |
| `frontend/.env.example` | Variáveis do gateway. |
| `backend/.../ApiSecurity.java` | CORS para os dois domínios, preflight, UTF-8 e logs de autenticação. |
| `backend/.../PaymentConfig.java`, `PaymentStatusService.java` | Lista de nomes das configurações ausentes/ inválidas no catálogo autenticado; não retorna valores secretos. |
| `backend/.../PixPaymentService.java`, `PaymentApprovalService.java`, `PaymentWebhookController.java` | Logs de intenção, reutilização, assinatura, consulta validada, duplicata e crédito após commit. |
| `backend/.../ApiErrors.java` | Registra apenas status/códigos do provedor; traduz 13253 para mensagem específica, sem retornar o corpo bruto. |
| `frontend/tests/payment-gateway.test.mjs` | Gate, cookie, origem, encaminhamento e regressão do HTML. |
| `backend/.../PaymentFlowTest.java`, `PaymentConfigurationTest.java` | CORS, fluxo de 2 créditos, replay, erro 13253 e diagnóstico. |

As outras alterações já presentes na árvore de trabalho não são todas desta correção.

## Variáveis Vercel — Production

```dotenv
PAYMENTS_API_TARGET=https://toyrush-production.up.railway.app
TOY_MACHINE_KEY=<MESMO_VALOR_DO_RAILWAY>
TERMINAL_ACCESS_KEY=<OUTRA_CHAVE_ALEATORIA_DE_PELO_MENOS_32_CARACTERES>
TERMINAL_ALLOWED_ORIGINS=https://www.toyfactory.dev.br,https://toyfactory.dev.br
```

`VITE_API_URL` não é necessária. Não configurar segredos Mercado Pago na Vercel. Depois de publicar código/variáveis, ativar o navegador em `https://www.toyfactory.dev.br/api/terminal`. O cookie é específico do domínio usado; prefira sempre o domínio canônico com `www`.

## Variáveis Railway

```dotenv
SPRING_PROFILES_ACTIVE=railway
DATABASE_URL=jdbc:postgresql://<HOST_NEON>/neondb?sslmode=require&channelBinding=require
DATABASE_USER=neondb_owner
DATABASE_PASSWORD=<SENHA_NEON>
TOY_MACHINE_ID=TF-001
TOY_MACHINE_KEY=<CHAVE_ALEATORIA_DE_PELO_MENOS_32_CARACTERES>
TOY_SESSION_SECONDS=180
MP_ACCESS_TOKEN=<ACCESS_TOKEN_DA_CONTA_REAL>
MP_LIVE_MODE=true
MP_WEBHOOK_SECRET=<ASSINATURA_SECRETA_WEBHOOK>
MP_WEBHOOK_URL=https://toyrush-production.up.railway.app/api/webhooks/mercadopago
MP_PIX_PAYER_EMAIL=<VALOR_CONFIGURADO_NO_BACKEND>
```

`PORT` é fornecida pelo Railway. `ADMIN_PIN` é opcional. O perfil railway escuta em `0.0.0.0`. O uso do e-mail configurado não adiciona cadastro ou formulário ao jogo; a resposta 13253 não certifica os demais requisitos do provedor, pois a criação ainda foi recusada.

## Contrato Pix e webhook

O código chama **POST `/v1/payments`**, e consulta **GET `/v1/payments/{paymentId}`**. Usar o evento **Pagamentos (legacy)** (`payment`), não Order. O webhook valida `x-signature` com `MP_WEBHOOK_SECRET`, `x-request-id` e `data.id`, com tolerância temporal de dez minutos. Verifica consistência entre query/body e consulta o provedor diretamente.

O status do Mercado Pago é `approved` em minúsculas. O backend valida ID, moeda BRL, valor exato, método Pix, `live_mode`, `external_reference`, `metadata.machine_id`, `metadata.session_id` e data da aprovação. Saldo e `creditsReleased` são gravados na mesma transação com lock da máquina. A coluna `payment_id` tem UNIQUE no banco. Reenvios consultam o provedor, mas não concedem crédito novamente.

O DTO retorna `sessionId`, `paymentId`, `status`, `qrCode` (Pix copia e cola), `qrCodeBase64`, `expiresAt`, `credits`, `amount`, `creditsReleased` e `balance`. `expiresAt` é o prazo da sessão visível (180s), enquanto a cobrança do provedor usa 30 minutos. Aprovações após expiração/cancelamento seguem para `PAID_LATE`, sem crédito automático, conforme a regra existente. O frontend consulta status a cada dois segundos e atualiza saldo/retorna ao menu após confirmação do servidor, sem iniciar ou debitar uma partida automaticamente.

## Comandos exatos de teste — PowerShell

Execute em terminal confiável com `TOY_MACHINE_KEY` já definida no ambiente. Não cole o segredo nos arquivos versionados. Depois de corrigir a chave Pix da conta recebedora:

```powershell
$api = 'https://toyrush-production.up.railway.app'
curl.exe -i "$api/api/payments/packages"
curl.exe --fail-with-body "$api/api/payments/packages" -H "X-Machine-Key: $env:TOY_MACHINE_KEY"
curl.exe --fail-with-body "$api/api/machine/balance" -H "X-Machine-Key: $env:TOY_MACHINE_KEY"

$pixRequestId = [guid]::NewGuid().ToString()
$pixBody = @{requestId=$pixRequestId;packageId='pkg-2-5'} | ConvertTo-Json -Compress
$pixJson = $pixBody | curl.exe --fail-with-body "$api/api/payments/pix" -H "X-Machine-Key: $env:TOY_MACHINE_KEY" -H 'Content-Type: application/json' --data-binary '@-'
if ($LASTEXITCODE -ne 0) { throw 'Pix recusado; confira a resposta antes de continuar.' }
$pix = $pixJson | ConvertFrom-Json
$pix | Select-Object sessionId,paymentId,status,amount,credits,expiresAt,qrCode

# Repetir a criação usa EXATAMENTE o mesmo requestId e pacote.
$pixBody | curl.exe --fail-with-body "$api/api/payments/pix" -H "X-Machine-Key: $env:TOY_MACHINE_KEY" -H 'Content-Type: application/json' --data-binary '@-'

curl.exe --fail-with-body "$api/api/payments/$($pix.sessionId)/status" -H "X-Machine-Key: $env:TOY_MACHINE_KEY"
curl.exe --fail-with-body "$api/api/machine/balance" -H "X-Machine-Key: $env:TOY_MACHINE_KEY"

# Preflight deve aceitar somente as origens permitidas.
curl.exe -i -X OPTIONS "$api/api/payments/pix" -H 'Origin: https://www.toyfactory.dev.br' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type,x-machine-key'

# Sem assinatura: deve retornar 401; nunca libera saldo.
curl.exe -i -X POST "$api/api/webhooks/mercadopago?data.id=$($pix.paymentId)" -H 'Content-Type: application/json' --data '{}'
```

Replay assinado de **um pagamento real já aprovado**, usando a assinatura secreta carregada apenas no ambiente local. Isto testa replay/consulta ao provedor; não substitui a entrega real pelo Mercado Pago:

```powershell
$providerId = [string]$pix.paymentId
$webhookRequestId = [guid]::NewGuid().ToString()
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
$manifest = "id:${providerId};request-id:${webhookRequestId};ts:${ts};"
$hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($env:MP_WEBHOOK_SECRET))
try { $sig = [Convert]::ToHexString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($manifest))).ToLowerInvariant() } finally { $hmac.Dispose() }
$webhookBody = @{type='payment';data=@{id=$providerId}} | ConvertTo-Json -Compress
1..2 | ForEach-Object {
  $webhookBody | curl.exe --fail-with-body "$api/api/webhooks/mercadopago?data.id=$providerId" -H "x-request-id: $webhookRequestId" -H "x-signature: ts=$ts,v1=$sig" -H 'Content-Type: application/json' --data-binary '@-'
}
curl.exe --fail-with-body "$api/api/machine/balance" -H "X-Machine-Key: $env:TOY_MACHINE_KEY"
```

## Checklist de aceite real

- [ ] Conferir/cadastrar chave Pix habilitada na mesma conta recebedora das credenciais (resolver 13253). Se já existe, solicitar ao Mercado Pago a habilitação para QR da integração.
- [ ] Publicar as correções do backend e frontend; configurar as quatro variáveis Vercel.
- [ ] Ativar somente o navegador do totem; confirmar catálogo JSON, três pacotes e `ready:true`.
- [ ] Selecionar 2 créditos/R$5 e gerar QR sem formulário de e-mail.
- [ ] Confirmar `paymentId`, QR/base64, copia e cola e prazo retornados.
- [ ] Pagar uma vez antes do prazo da sessão; conferir webhook real com assinatura válida e consulta `approved`.
- [ ] Confirmar `pix_credit_granted`, auditoria `CREDITS_RELEASED`, saldo inicial +2 e retorno automático ao menu.
- [ ] Reenviar o webhook e conferir `pix_duplicate_ignored`, somente um registro de concessão e saldo inalterado.
- [ ] Recarregar o navegador e confirmar persistência do saldo; iniciar solo e conferir débito de 1.

Validação local: 29 testes Node, 27 testes Java, TypeScript, build Vite, build completo `vercel build --prod` (incluindo função e rewrites) e teste Playwright do modal passaram. Os testes automatizados usam provedor controlado. A verificação real parou antes do QR pelo erro 13253; nenhum pagamento foi realizado e nenhum webhook real foi homologado nesta execução. As alterações de código ainda precisam ser publicadas; nenhuma variável remota foi modificada nesta revisão.

Referências: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [webhooks Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/wix/additional-content/your-integrations/notifications/webhooks), [cobrança Pix Mercado Pago](https://www.mercadopago.com.br/blog/cobrar-com-pix-mercado-pago-vendedores).
