# Estrutura da Toy Factory

## Separação principal

| Caminho | Responsabilidade |
| --- | --- |
| `frontend/src` | React, navegação, controles, jogo, painel e apresentação dos pagamentos |
| `frontend/public` | Imagens, fontes e outros recursos públicos |
| `frontend/scripts/kiosk-server.mjs` | Servidor local do terminal e proxy autenticado para o backend |
| `frontend/tests` | Testes das regras do jogo e estados do Pix; teste de navegador com API simulada |
| `backend/src/main/java/br/com/toyfactory/payments` | API Spring Boot, integração Mercado Pago, saldo e sessões persistentes |
| `backend/src/main/resources/db/migration` | Migrações Flyway; V4 adiciona a auditoria de pagamentos e créditos |
| `backend/src/test` | Integração HTTP, concorrência, assinatura, validação e persistência |
| `backend/scripts` | Proxy restrito do webhook usado pelo túnel de teste |
| `backend/data` | Banco local persistente, fora do versionamento |
| `docs` | Mapa da arquitetura e checklist de homologação |

`node_modules`, `dist` e `target` são artefatos gerados. As cópias antigas na raiz não são fontes do aplicativo. O build ativo está em `frontend/`; o serviço Java está em `backend/`.

## Frontend

`App.tsx` conecta a sessão do jogo, saldo, modal Pix e painel administrativo. `game/` contém regras de combinação, pontuação, ranking, ataques e subida das linhas. `hooks/` controla as partidas e os dispositivos. `components/` agrupa telas, tabuleiro, corrida, HUD e administração. `audio/` cuida dos efeitos sonoros.

O fluxo Pix foi extraído do antigo `CreditDialog.tsx`:

| Arquivo em `frontend/src/payments/` | Responsabilidade |
| --- | --- |
| `components/PixPurchaseModal.tsx` | Composição visual do modal |
| `components/CreditPackageSelector.tsx` | Pacotes recebidos do servidor |
| `components/PixQrCode.tsx` | QR, valor, quantidade e cronômetro |
| `components/PaymentSuccess.tsx` | Confirmação e saldo liberado |
| `components/PaymentStatus.tsx` | Expiração, cancelamento, rejeição e conferência |
| `hooks/useCreatePix.ts` | Criação idempotente e recuperação após falha de rede |
| `hooks/usePaymentStatus.ts` | Recuperação da sessão e consulta a cada 2 segundos |
| `hooks/usePixPurchase.ts` | Coordenação, cancelamento e retorno ao menu |
| `hooks/usePaymentControls.ts` | Direcional, A/X confirma e B/Y cancela |
| `hooks/useCredits.ts` | Saldo e autorização das partidas |
| `services/paymentApi.ts` | Contrato HTTP do pagamento |
| `types.ts` | DTOs do cliente e estados de apresentação |
| `pixPayment.css` | Estilos existentes do modal |

`shared/http.ts` centraliza transporte e erros HTTP. Não contém credenciais. O frontend envia UUID e ID do pacote; não escolhe o preço ou a quantidade liberada.

## Backend

| Classe | Responsabilidade |
| --- | --- |
| `PaymentController` | Catálogo, saldo, criação, consulta e fechamento |
| `PixPaymentService` | Intenção persistente e chamada de criação/cancelamento |
| `MercadoPago` | HTTP do provedor, autenticação e idempotência |
| `PaymentStatusService` | Catálogo e consulta do estado local |
| `PaymentWebhookController` | Recebimento da notificação e verificação de identidade do evento |
| `WebhookSignature` | HMAC, timestamp e rejeição de assinaturas inválidas |
| `PaymentValidator` | Valor, moeda, método, ambiente, IDs, máquina e sessão |
| `PaymentApprovalService` | Transação que valida e concede créditos uma única vez |
| `PaymentReconciliation` | Recuperação periódica quando o webhook ou a rede falham |
| `PaymentStore` | Transações, lock da máquina, expiração e projeção de DTOs |
| `PaymentAuditService`, `PaymentAudit` | Eventos persistentes com variação e saldo final |
| `GameSessionController`, `GameSessionService` | Débito idempotente, retomada e conclusão de partida |
| `PaymentService` | Fachada interna pequena para os consumidores existentes e testes |
| `Models`, `Repositories` | Entidades e acesso ao banco |
| `dto/PaymentDtos` | Entrada e saída da API, separadas das entidades |
| `PaymentConfig`, `ApiSecurity`, `ApiErrors` | Configuração, autenticação da máquina e erros globais |

`AdminApi`, `ReportsApi` e `HealthApi` continuam isolados do fluxo de concessão. Não foram acrescentadas funcionalidades secundárias ao painel nesta reorganização.

## Confirmação e saldo

1. A intenção é persistida antes de chamar o Mercado Pago, com UUID e referência `máquina:sessão`.
2. O QR é mostrado somente enquanto a sessão pode receber pagamento.
3. Webhook assinado e reconciliação consultam o provedor. A mensagem recebida do navegador nunca aprova pagamento.
4. A aprovação validada, o saldo e a auditoria são gravados na mesma transação, com lock da máquina. `creditsReleased` impede duplicação.
5. O frontend representa `CREDITS_RELEASED` como `APPROVED`, mostra a confirmação e volta ao menu após 2 segundos.
6. Jogar exige outra autorização; solo custa 1 crédito e coop/versus custam 2.

Sessões expiradas, canceladas ou rejeitadas não recebem créditos automaticamente. Uma aprovação posterior fica em `PAID_LATE` / conferência, auditada, sem incrementar saldo. O tratamento operacional de um valor pago nesse estado ainda exige conferência; não há estorno automático.

Os componentes do pagamento foram divididos nesta entrega. Arquivos extensos preexistentes de áudio, CSS global e regras do jogo continuam separados por domínio; não foram reescritos para evitar aumentar o escopo além do ciclo Pix.
