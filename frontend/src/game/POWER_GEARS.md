# Power Gears

- Combinações normais continuam exigindo 4 peças, nas linhas e formas válidas do jogo.
- 5 ou mais células combinadas e conectadas da mesma cor criam uma engrenagem. Combinações separadas são resolvidas individualmente.
- A engrenagem nasce na última posição colocada, quando essa posição participa da combinação. Em cascatas sem uma peça recém-colocada, nasce na célula mais baixa da combinação; empates usam a célula mais à esquerda.
- Azul (ursinho): Freeze Gear, congela a linha por 750 ms antes de explodir.
- Vermelho (raposa): Fire Gear, percorre a linha com intervalo de 65 ms por célula.
- Laranja (flor): Blast Gear, área 3×3 centrada na engrenagem.
- Verde (sapinho): Cross Gear, centro e até 4 casas em cada direção.
- Roxo (borboleta): Hunter Gear, marca por 450 ms um tipo normal ainda presente e elimina suas peças. Nunca escolhe engrenagens como alvo.
- Azul e vermelho guardam a orientação da combinação. Em formas com mais de uma direção, prevalece a direção com mais células passando pelo ponto de criação; empates usam horizontal. Setas na engrenagem indicam a direção.
- Engrenagens contam como sua cor em combinações normais e também ativam ao receber outro efeito. Cada engrenagem ativa uma vez por resolução; a gravidade aguarda o término dos efeitos.
- Uma combinação que ativa uma engrenagem existente não cria outra. Destruições por poderes não contam como novas combinações.
- A pontuação segue `SCORING.md`: 4 peças = 500, 5 = 800, 6 = 1.200, 7 = 1.700, 8 = 2.300, 9 = 3.000, 10 = 4.000 e +500 por peça além da décima. Cascatas multiplicam por x1, x2, x3…; a criação da engrenagem não subtrai a peça do tamanho da combinação.

Verificação: `npm test` (Node.js 24+) e `npx tsc --noEmit`.
