# Pix da Toy Factory

Implementação local em Spring Boot 3.5 / Java 21. Não houve pagamento real nesta entrega: faltam credenciais, URL pública do webhook e validação do fluxo de pagador para totem. Nenhuma conta ou aplicação Mercado Pago foi criada ou alterada.

## Fluxo da máquina

Menu → Comprar créditos → selecionar pacote com ◀ / ▶ → A / X compra → QR Pix → confirmação do servidor → créditos e saldo → retorno automático ao menu em 2 segundos. B / Y cancela a sessão. Aprovar pagamento não consome créditos nem começa uma partida. O jogador escolhe o modo e aperta Jogar depois.

O catálogo tem três pacotes fixos, configurados no servidor: `pkg-2-5` (2 créditos / R$ 5,00), `pkg-4-10` (4 créditos / R$ 10,00) e `pkg-6-15` (6 créditos / R$ 15,00). Solo custa 1 crédito; coop e versus custam 2. O frontend envia somente `requestId` e `packageId`; preço, quantidade e identificação da máquina vêm do backend, que rejeita qualquer `packageId` fora do catálogo configurado.

A tela não pede e-mail, CPF, teclado ou formulário. A API v1/payments documenta o e-mail de pagador. `MP_PIX_PAYER_EMAIL` fica exclusivamente no backend e só deve ser preenchido com uma identidade explicitamente suportada pela integração de totem do Mercado Pago. Não inventar um e-mail nem informar o e-mail do lojista como se fosse o cliente. Enquanto esse contrato não for validado com a integração existente/provedor, a geração fica indisponível. Remover o campo da interface não elimina essa exigência da API.

## Configuração

1. Usar uma aplicação própria Toy Factory na conta Mercado Pago existente; obter o Access Token e a chave de assinatura do webhook.
2. Configurar as variáveis de `backend/.env.example` no ambiente do processo Java. O Spring não carrega esse arquivo automaticamente. `MP_LIVE_MODE` precisa corresponder ao ambiente real da transação. Não versionar credenciais.
3. Configurar `frontend/.env` usando o exemplo. A mesma `TOY_MACHINE_KEY` aleatória, com pelo menos 32 caracteres, autentica o terminal. Não usar prefixo `VITE_` para segredos.
4. Publicar por HTTPS o endpoint `/api/webhooks/mercadopago` diretamente para o backend e registrar notificações de pagamentos na aplicação Mercado Pago. Preservar query string, `x-signature` e `x-request-id`. Não publicar o servidor local do terminal.
5. Confirmar com a integração existente o contrato de pagador sem coleta de dados, configurar a identidade suportada e executar a homologação real abaixo.

Backend, com variáveis já definidas:

```powershell
cd backend
mvn test
mvn package
java -jar target/payments-1.0.0.jar
```

Terminal para desenvolvimento:

```powershell
cd frontend
npm run dev
```

Terminal para uso com o build:

```powershell
cd frontend
npm run build
npm run kiosk
```

O terminal abre em `http://127.0.0.1:8444`. O servidor Node escuta apenas no loopback, serve `dist/` e injeta a autenticação no proxy `/api`. A chave não é incluída no JavaScript do navegador. Backend remoto exige HTTPS. O proxy de desenvolvimento faz a mesma injeção na porta 8443.

Esta primeira versão atende uma máquina por instância do backend (`TOY_MACHINE_ID`). Não reutilizar uma chave/instância entre máquinas diferentes. A Vercel pode hospedar uma demonstração visual; o fluxo de terminal autenticado exige esse proxy local ou uma implantação equivalente. Não colocar uma chave compartilhada em um proxy público.

## Persistência e comportamento em falhas

- H2 em `backend/data/` persiste saldo, cobranças e autorizações. Execute o Java sempre com o mesmo diretório de trabalho. Em servidor remoto, configure PostgreSQL e armazenamento persistente. Não excluir o banco ao atualizar o jogo.
- A intenção de cobrança é gravada antes da chamada Mercado Pago. Repetir o mesmo UUID reutiliza o mesmo corpo e `X-Idempotency-Key`.
- Webhook exige HMAC-SHA256 e consulta `/v1/payments/{id}`. Valida ID, valor, moeda, Pix, ambiente, referência externa, máquina, sessão e data da aprovação.
- Uma transação com lock no saldo grava créditos e `creditsReleased` juntos. Webhooks repetidos ou concorrentes não duplicam créditos.
- O navegador consulta status a cada 2 segundos. O backend reconcilia com o provedor a cada 15 segundos e recupera intenções sem resposta, inclusive por referência externa. A fila alterna as sessões verificadas para não bloquear cobranças recentes.
- A sessão visível dura 180 segundos (configurável entre 120 e 300). Ao vencer, esconde o QR e tenta cancelar no provedor. A cobrança enviada ao provedor usa 30 minutos de expiração; portanto não se deve prometer que uma captura antiga do QR deixa de ser pagável exatamente quando o cronômetro termina.
- Uma aprovação validada que chegar após expiração/cancelamento preserva os créditos comprados, uma única vez. Nunca inicia jogo automaticamente. O saldo permanece no terminal.
- Ao reiniciar o navegador, o backend informa a cobrança ainda aberta. Uma partida autorizada e não encerrada pode ser retomada no mesmo modo sem novo débito; o tabuleiro recomeça, pois o estado da partida em andamento não é persistido.
- Encerramentos pendentes ficam numa fila local de IDs e são enviados antes da próxima autorização. `localStorage` não concede créditos. F8 não adiciona saldo.
- Reembolsos/contestações posteriores à liberação não têm reversão automática de créditos nesta versão; precisam de tratamento operacional. Não há painel administrativo de reembolso nesta entrega.

## Cadastro do webhook no painel Mercado Pago

Para o código atual, que usa `/v1/payments` com `payment_method_id=pix`, selecionar **Payments / Pagamentos (`payment`)**. A opção de produto **QR Code** da documentação é outra integração; a presença de um QR Pix na tela não muda o tópico deste backend.

No painel **Suas integrações → aplicação Toy Factory → Webhooks → Configurar notificações**:

1. Cadastrar a URL HTTPS pública terminando em `/api/webhooks/mercadopago`. `localhost` não é acessível pelo Mercado Pago.
2. Selecionar o evento Pagamentos e salvar.
3. Guardar a assinatura secreta gerada em `MP_WEBHOOK_SECRET` no `backend/.env`; colocar a URL em `MP_WEBHOOK_URL` e reiniciar com `./run.ps1`.
4. Usar **Simular** no painel com um ID de pagamento consultável pelas credenciais do backend. A assinatura válida sozinha não libera créditos: a consulta ao provedor e a associação à sessão também precisam ser válidas.

A documentação enviada informa que pagamentos criados com credenciais de teste não enviam notificações automaticamente. Portanto, testar a entrega do webhook pelo simulador do painel separadamente; a reconciliação periódica do backend não comprova recebimento de webhook. O painel também distingue credenciais de teste de usuários produtivos das credenciais de usuários de teste: confirmar o ambiente correto da aplicação antes de homologar. Um resultado com ID fictício pode ser rejeitado na consulta ao pagamento, mesmo que o transporte funcione.

## Endpoints

Todos sob `/api`; somente o webhook dispensa `X-Machine-Key`.

| Método | Caminho | Uso |
| --- | --- | --- |
| GET | `/payments/packages` | Configuração disponível e pacote autorizado |
| POST | `/payments/pix` | `{ "requestId": "UUID", "packageId": "standard" }` |
| GET | `/payments/{sessionId}/status` | Status, QR ainda válido e saldo |
| POST | `/payments/{sessionId}/close` | Encerrar visualização / tentar cancelar |
| GET | `/machine/balance` | Saldo e cobrança aberta recuperável |
| POST | `/game-sessions` | `{ "requestId": "UUID", "mode": "1p" }`; também `coop` e `1v1` |
| POST | `/game-sessions/{id}/complete` | Encerrar autorização |
| POST | `/webhooks/mercadopago?data.id=...` | Notificação assinada; consulta o provedor antes de creditar |

## Validação realizada

16 testes Java: saldo não liberado enquanto pendente, idempotência na criação, 12 aprovações concorrentes, dados adulterados, outra integração, timeout, expiração, cancelamento concorrente com aprovação, débito/repetição, recuperação de rede, preço autoritativo, pacote inexistente rejeitado, catálogo expõe os três pacotes configurados, assinatura e persistência após fechar e reabrir o backend com H2 em arquivo.

Frontend: TypeScript, 25 testes das regras do jogo, build Vite e teste no navegador com API simulada. A verificação visual confirmou seleção sem formulário, QR central grande, aprovação, retorno automático sem chamar autorização de partida, expiração e cancelamento. QR e aprovação simulados servem apenas ao teste; não comprovam pagamento real.

## Homologação pendente

Gerar um Pix real pela máquina, pagar pelo banco, receber webhook assinado na URL pública, confirmar +3 créditos exatamente uma vez e retorno ao menu. Reenviar a notificação e conferir saldo. Repetir com internet interrompida, terminal reiniciado e sessão expirada, verificando que não há partida automática nem crédito perdido. Só então considerar o fluxo financeiro pronto para operação.

Referências oficiais consultadas: [Pix via Payments API](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix), [assinatura de webhooks](https://www.mercadopago.com.br/developers/pt/docs/wix/additional-content/your-integrations/notifications/webhooks), [requisitos Spring Boot](https://docs.spring.io/spring-boot/3.5/system-requirements.html).
