# Homologação Pix — 12/09/2026

**O ciclo com pagamento real ainda não foi concluído. Esta entrega não está homologada para operação.**

## Verificado localmente

- [x] Pacotes do servidor: 2/R$5, 4/R$10 e 6/R$15.
- [x] Componentes, hooks, HTTP, DTOs, controllers e serviços separados por responsabilidade.
- [x] Criação idempotente, intenção persistida antes do provedor e recuperação após timeout.
- [x] Assinatura do webhook validada e dados consultados no provedor antes de conceder saldo.
- [x] Conferência de valor, ID, Pix, ambiente, moeda, máquina e sessão.
- [x] Aprovações repetidas e concorrentes concedem créditos uma única vez.
- [x] Expiração/cancelamento/rejeição não concedem créditos automaticamente.
- [x] Auditoria persistente de criação, transição, concessão, encerramento e débito.
- [x] Partida com débito idempotente e bloqueio por saldo insuficiente.
- [x] Persistência verificada por teste de reinicialização do backend.
- [x] Estados do frontend: pendente, aprovado, expirado, cancelado, rejeitado e conferência.
- [x] TypeScript, build e 27 testes do frontend; 23 testes do backend.

Os testes do backend usam respostas controladas do provedor. O teste `frontend/tests/pix-flow.browser.mjs` intercepta todas as chamadas `/api/`: verifica controles, QR, recuperação da sessão, aprovação, retorno sem débito e cancelamento. Sua imagem de QR é uma fixture, não uma cobrança pagável. Esses testes não comprovam pagamento ou webhook real.

## Falta para concluir

- [ ] Configurar credenciais de produção da aplicação Toy Factory na conta vendedora.
- [ ] Confirmar o contrato de identificação do pagador para o totem sem formulário. Na verificação final, `MP_PIX_PAYER_EMAIL` estava preenchido e o catálogo retornou `ready: true`; isso comprova apenas a configuração sintática, não que essa identidade foi homologada pelo provedor.
- [ ] Criar uma cobrança real e validar leitura do QR pelo celular.
- [ ] Pagar e verificar a entrega real do webhook assinado pelo Mercado Pago.
- [ ] Confirmar crédito e auditoria no banco, retorno automático ao menu e débito ao jogar.
- [ ] Repetir a notificação real e atualizar a interface para comprovar saldo sem duplicação.

As credenciais disponíveis foram identificadas como conta de teste e o ambiente continua com `MP_LIVE_MODE=false`. A tentativa de criação sem pagador retornou `payer_cannot_be_nil`; não criou pagamento. A URL HTTPS temporária do webhook está configurada, mas sua existência não comprova a entrega de um pagamento real. O túnel precisa continuar ativo durante o teste.

O backend atualizado foi iniciado e aplicou a migração V4 ao banco local. O saldo observado foi zero, com uma intenção expirada sem ID do provedor; ela não foi apagada nem aprovada. O teste de navegador passou com seleção pelo direcional, recuperação automática ao recarregar, aprovação simulada e cancelamento por B/Y.

## Executar as verificações

```powershell
npm --prefix frontend test
npx --prefix frontend tsc --noEmit -p frontend/tsconfig.json
npm --prefix frontend run build
mvn -f backend/pom.xml test
```

Para o teste de navegador, usar o Vite existente na porta 8443, Edge e uma instalação de Playwright. Se Playwright não estiver nas dependências locais, definir `PLAYWRIGHT_MODULE` com a URL `file:///.../playwright/index.mjs` da instalação disponível e executar `node frontend/tests/pix-flow.browser.mjs`.

## Roteiro obrigatório com celular

Abrir o menu → comprar → selecionar pacote → confirmar A/X → ler QR → pagar → receber webhook → conferir saldo e evento `CREDITS_RELEASED` → aguardar retorno ao menu → iniciar partida → conferir débito e evento `GAME_STARTED`.

Não usar aprovação manual, saldo de teste ou payload simulado como evidência de homologação real.
