# Ataques do versus

Cada combinação válida e conectada de 5 ou mais peças gera um ataque aleatório entre os sete principais. Combinações de 4 e peças destruídas por explosões não geram ataques. A criação de Power Gears continua funcionando.

O destinatário mantém uma fila. Cada ataque mostra o projétil saindo do lado do atacante por 700 ms, aguarda uma combinação local terminar, avisa por 500 ms (900 ms para embaralhar), aplica o efeito e mostra uma recuperação de 400 ms. Os ataques antigos por contagem de combos e por tempo foram removidos do versus.

- Freeze Block: 1 peça por 3 segundos; em 6 peças, 2 alvos; em 7+, uma região 3×3 em torno do alvo. Peças congeladas não combinam nem se movem pela gravidade.
- Rising Row: uma linha completa entra na base, deslocando o tabuleiro um nível. Não substitui a próxima linha periódica.
- Shuffle: as peças animam até suas novas posições durante 900 ms. Preserva tipos, quantidade de peças e células vazias. Controles e queda aguardam a animação.
- Board Freeze: bloqueia os controles e a queda automática por 2 segundos.
- Reverse: inverte esquerda/direita e cima/baixo por 3 segundos. Durante o efeito, cima desce e baixo sobe uma casa livre. Botões de confirmação e gatilhos continuam com suas funções.
- Locked Column: uma coluna diferente da peça em queda fica indisponível por 3 segundos. Impede entrada, combinações, remoção e gravidade naquela coluna, sem marcar derrota.
- Fog: cobre parcialmente o tabuleiro por 2,5 segundos, sem bloquear a jogabilidade.

Board Freeze, Reverse, Locked Column e Fog duram 20% mais em combos de 6 e 40% mais em 7+. Freeze Block escala pela quantidade de alvos. Rising Row continua adicionando exatamente um nível e Shuffle reorganiza o tabuleiro inteiro. As subidas periódicas aguardam bloqueios para não deslocar peças protegidas.

Screen Shake, Magnet e Jam ficam reservados para a etapa futura indicada na especificação.

Validação automatizada: `npm test`. Ainda é necessária avaliação visual e de dificuldade durante uma partida com dois controles reais.
