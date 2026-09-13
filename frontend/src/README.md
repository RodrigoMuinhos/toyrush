# Organização do jogo

Consulte [SCREENS.md](./SCREENS.md) para o mapa das telas e o escopo atual:
**Tela 1 — Início**. Componentes compartilhados exigem estilos ou variantes
limitados a essa tela.

- `App.tsx`: reúne o painel, a sessão de jogo e o aviso de créditos.
- `game/GameApp.tsx`: escolhe a tela exibida conforme a fase da partida.
- `hooks/useGameSession.ts`: controla fases, modos, vitória e comunicação entre jogadores.
- `hooks/usePlayerGrid.ts`: controla as peças, combinações e ataques de um jogador.
- `hooks/useGameControllers.ts`: traduz os comandos dos controles.
- `hooks/useCredits.ts`: consulta o saldo no backend e solicita autorização para as partidas. O pagamento Pix fica em `components/screens/CreditDialog.tsx`.
- `game/grid.ts`: operações sobre a grade de peças.
- `game/constants.ts` e `game/types.ts`: configurações e tipos compartilhados.
- `components/screens/`: telas de início, história, contagem, resultado e créditos.
- `components/puzzle/`: tabuleiro, peças e painel do jogador.
- `components/race/`: corrida das naves.
- `components/hud/`: indicadores da partida, painel superior e cenário.
- `components/controls/`: botões de toque e ilustração da nave.
- `audio/sound.ts`: música, efeitos sonoros e vibração.
- `raceDifficulty.ts` e `racePlayers.ts`: regras de dificuldade e jogadores da corrida.
- `index.css`: estilos compartilhados.

Mantenha cada arquivo com uma responsabilidade e cerca de 500 linhas no máximo.
Novas regras devem ficar em `game/` ou em um hook; componentes de apresentação
devem receber os dados e as ações por propriedades.

Validação a partir da raiz do repositório:

```sh
npx tsc --noEmit -p frontend/tsconfig.json
npm --prefix frontend run build
```
