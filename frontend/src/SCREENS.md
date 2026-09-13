# Mapa de telas e escopo atual

## Escopo definido pelo usuário

Estamos trabalhando somente na **Tela 1 — Início**, conforme a imagem enviada:
painel superior de pontos/vidas/energia, logo Toy Factory Rush, botão JOGAR,
botão de teste da corrida e seleção de modos.

Alterações visuais pedidas neste contexto devem afetar somente essa tela.
Não alterar outras telas ou regras de jogo sem uma nova instrução do usuário.

## Telas

| Nº | Tela | Fase | Componente principal |
| --- | --- | --- | --- |
| 1 | Início: logo, jogar e modos | `splash` | `components/screens/SplashScreen.tsx` |
| 2 | História em atos | `mission` | `components/screens/MissionDialog.tsx` |
| 3 | Contagem 3, 2, 1, GO | `countdown` | `components/screens/LaunchCountdown.tsx` |
| 4 | Jogo de blocos | `game` | `game/GameApp.tsx`, `components/puzzle/PlayerPanel.tsx` |
| 5 | Preparação da corrida, ato 4 | `ready` | `components/screens/RocketReady.tsx` |
| 6 | Corrida das naves | `race` | `components/race/RocketRace.tsx` |
| 7 | Resultado | `result` | `components/screens/ResultScreen.tsx` |

O aviso de créditos (`components/screens/CreditDialog.tsx`) é um modal,
controlado por `App.tsx`, não uma fase da partida.

## Partes da Tela 1

- Painel superior da referência: `components/hud/CockpitHeader.tsx`.
  Classes `.screen-toolbar`, `.hero-panel-grid`, `.hero-panel-card`.
- Logo: `/logo.png`, usada por `SplashScreen.tsx` em `.welcome-brand`.
- Botões: `.welcome-actions`, `.welcome-play`, `.welcome-test-race`.
- Modos: `.welcome-modes`, `.welcome-mode-options`, `.welcome-mode`.
- Personagens dos modos: `components/puzzle/Piece3D.tsx` e `FriendArt.tsx`.
- Fundo e moldura: `.welcome-screen` em `index.css`.
- Área da tela e status dos controles: ramo `phase === "splash"` em `game/GameApp.tsx`.

## Componentes compartilhados: cuidado com o alcance

`CockpitHeader` é montado em `App.tsx`, fora da seleção de fase.
O painel da imagem não é o hero da corrida (`.race-hero`) nem a cena da nave
do jogo de blocos (`TopHUD` / `SpaceScene`).

`Piece3D`, `FriendArt`, `index.css` e `--cockpit-height` também são compartilhados.
Para mudanças exclusivas da Tela 1, usar estilos limitados a `.welcome-screen`
ou uma variante explícita para `flight.phase === "splash"` no painel.
Não editar regras globais dessas peças para resolver um pedido apenas do início.

Este mapeamento não altera o comportamento ou o visual do jogo.
