Crie um projeto completo de interface para um jogo cooperativo infantil chamado:

# TOY FACTORY RUSH

O jogo deve parecer um produto real em desenvolvimento, com interface de gameplay pronta para apresentação em feira.

A experiência é voltada para:

* crianças de 3 a 10 anos;
* pais jogando junto com os filhos;
* meninos e meninas;
* 2 jogadores;
* 2 controles;
* ambiente de feira / evento;
* leitura à distância;
* partidas rápidas de aproximadamente 2 a 4 minutos;
* cooperação obrigatória.

Formato principal:

```text
1920 × 1080 px
landscape
16:9
```

IMPORTANTE:

* não usar marcas reais;
* não usar personagens licenciados;
* não copiar interfaces existentes;
* criar identidade visual original;
* manter todos os elementos facilmente editáveis;
* usar Auto Layout sempre que fizer sentido;
* organizar frames, layers, components e variants;
* criar Color Styles / Variables;
* não transformar a interface inteira em uma única imagem;
* construir HUD, cards, botões, textos e painéis como elementos editáveis.

==================================================
CONCEITO DO JOGO
================

TOY FACTORY RUSH é um jogo cooperativo onde pai/mãe e criança trabalham juntos dentro de uma fábrica mágica para montar brinquedos.

A fantasia principal é:

```text
peças entram na esteira
↓
jogadores identificam a peça correta
↓
pegam a peça
↓
movem
↓
giram
↓
encaixam
↓
brinquedo é concluído
↓
realizam uma ação cooperativa final
↓
brinquedo ganha vida
↓
score de cooperação
```

Exemplos de brinquedos:

* foguete;
* robô;
* carrinho;
* dinossauro;
* avião;
* castelo;
* barco;
* máquina divertida.

O primeiro desafio principal deve ser:

# MONTE O FOGUETE

==================================================
PRINCIPAL DIFERENCIAL
=====================

O jogo deve exigir cooperação real.

Um jogador sozinho não deve conseguir realizar todas as ações.

Divisão principal:

### JOGADOR 1

Responsável por:

* mover a peça;
* posicionar;
* alinhar;
* transportar.

### JOGADOR 2

Responsável por:

* pegar;
* girar;
* soltar;
* confirmar;
* ativar ações especiais.

A intenção é estimular comunicação entre pai/mãe e criança:

* pega o azul;
* vai para esquerda;
* gira;
* solta;
* segura aí;
* agora!

A cooperação deve influenciar diretamente o score final.

==================================================
PERSONAGEM PRINCIPAL
====================

Criar uma mascote original chamada:

# CAPI

Capi é uma capivara simpática que trabalha como supervisora e guia da fábrica.

Visual:

* capivara cartoon;
* cabeça levemente maior;
* focinho arredondado;
* olhos grandes e expressivos;
* sorriso amigável;
* corpo compacto;
* estética de personagem 3D moderno de videogame infantil.

Roupa:

* macacão azul ciano;
* detalhes amarelos;
* boné azul;
* símbolo de engrenagem;
* crachá escrito:

CAPI

A personagem deve aparecer principalmente no lado direito da tela.

Criar variantes:

* idle;
* pointing;
* happy;
* celebrating;
* confused;
* surprised.

Capi deve reagir ao gameplay.

Exemplos de falas:

* PEGA O AZUL!
* GIRA!
* QUASE LÁ!
* BOA!
* FALTA UMA!
* PREPAREM O LANÇAMENTO!
* UAU!
* SUPER EQUIPE!

==================================================
DIREÇÃO VISUAL
==============

Criar uma estética:

```text
FÁBRICA MÁGICA DE BRINQUEDOS
+
3D CARTOON MODERNO
+
BRINQUEDOS PREMIUM
+
TECNOLOGIA AMIGÁVEL
+
PLAYGROUND
```

O cenário não deve parecer uma fábrica industrial pesada.

Usar:

* formas arredondadas;
* materiais com aparência de brinquedo;
* superfícies limpas;
* volumes grandes;
* iluminação suave;
* cores vivas;
* interface com profundidade;
* bordas iluminadas;
* sombras suaves;
* glow controlado.

A tela deve parecer:

* divertida;
* moderna;
* premium;
* segura;
* amigável;
* extremamente legível.

Evitar:

* cyberpunk;
* visual sombrio;
* excesso de neon;
* excesso de elementos;
* aparência infantil de bebê;
* texto pequeno;
* interfaces técnicas demais.

==================================================
PALETA
======

Criar Color Styles / Variables.

AZUL PRINCIPAL

```text
#1687F8
```

CIANO

```text
#28C8F5
```

AZUL ESCURO

```text
#103A78
```

AMARELO

```text
#FFC928
```

LARANJA

```text
#FF8A2A
```

VERDE

```text
#57D66B
```

ROXO

```text
#9D63F5
```

VERMELHO CORAL

```text
#F2514E
```

BRANCO

```text
#FFFFFF
```

FUNDO CLARO

```text
#EEF7FF
```

CINZA AZULADO

```text
#B9C9D8
```

Usar gradientes suaves em:

* HUD;
* cards;
* barras;
* painéis;
* botões.

==================================================
ESTRUTURA PRINCIPAL DA TELA
===========================

Dividir visualmente em:

```text
TOPO
HUD

ESQUERDA
MODELO / REFERÊNCIA

CENTRO
ZONA DE MONTAGEM

DIREITA
CAPI

INFERIOR
ESTEIRA

RODAPÉ
CONTROLES DOS JOGADORES
```

A hierarquia deve ser extremamente clara.

A ZONA DE MONTAGEM deve ocupar aproximadamente 50% a 60% da atenção visual.

==================================================
LOGO
====

No canto superior esquerdo criar um logo provisório:

# TOY

# FACTORY

# RUSH

Direção:

TOY
amarelo

FACTORY
branco / azul

RUSH
laranja / vermelho

Adicionar:

* pequenas engrenagens;
* formas de brinquedo;
* volume leve;
* lettering divertido.

==================================================
HUD SUPERIOR
============

Criar um grande componente central:

# 🚀 MONTE O FOGUETE

Visual:

* fundo azul;
* borda azul clara;
* cantos arredondados;
* sombra;
* tipografia branca;
* palavra FOGUETE em amarelo.

À direita criar:

### PROGRESSO

Barra horizontal parcialmente preenchida.

Exemplo:

```text
45%
```

Usar:

* verde para progresso;
* cinza para restante.

Criar também:

### BRINQUEDOS

```text
2/5
```

com ícone de caixa.

### TEMPO

```text
01:12
```

com ícone de relógio.

==================================================
LADO ESQUERDO — MODELO
======================

Criar painel vertical:

# MODELO

Mostrar miniatura do foguete completo.

Visual do foguete:

* ponta vermelha;
* corpo branco;
* janela azul;
* aro amarelo;
* detalhes verdes;
* asas coloridas.

Abaixo:

# PRÓXIMA PEÇA

Mostrar:

ASA AZUL

A peça deve possuir:

* glow amarelo;
* borda;
* fundo branco;
* destaque visual forte.

==================================================
CENTRO — ZONA DE MONTAGEM
=========================

Criar uma grande plataforma circular.

Adicionar placa:

# ⚙ ZONA DE MONTAGEM ⚙

Visual da plataforma:

* azul;
* branco;
* amarelo;
* luzes circulares;
* detalhes metálicos amigáveis;
* bordas arredondadas.

Mostrar um foguete parcialmente montado.

Peças atuais:

* topo vermelho;
* corpo branco;
* janela azul;
* aro amarelo;
* faixa verde;
* base amarela;
* uma asa vermelha encaixada.

A segunda asa:

* azul;
* sendo movimentada em direção ao foguete.

Mostrar:

* contorno do encaixe;
* tracejado azul;
* brilho;
* linhas de movimento.

Feedback:

# QUASE LÁ!

Adicionar:

# +100

com estrelas.

==================================================
BRAÇO ROBÓTICO
==============

Criar um braço mecânico vindo da parte superior direita.

Características:

* amarelo;
* cinza;
* azul;
* juntas arredondadas;
* aparência de brinquedo;
* pinça simples;
* sem elementos ameaçadores.

A pinça pode aparecer segurando ou indicando a peça.

==================================================
CAPI — LADO DIREITO
===================

Capi deve ocupar aproximadamente 20% da largura visual.

Pose:

* corpo voltado para a área central;
* braço apontando;
* expressão feliz.

Criar balão:

# PEGA O

# AZUL!

A palavra:

# AZUL!

deve aparecer maior e em azul vivo.

==================================================
ESTEIRA
=======

Criar uma grande esteira na parte inferior da área principal.

Direção:

```text
ESQUERDA → DIREITA
```

Visual:

* metal azul acinzentado;
* estrutura amarela;
* roletes;
* parafusos grandes;
* setas de direção.

Mostrar aproximadamente 8 ou 9 peças.

Exemplo:

1. cone vermelho;
2. bloco amarelo;
3. roda roxa;
4. cabeça de robô;
5. asa azul;
6. cauda verde;
7. hélice vermelha;
8. peça roxa;
9. cilindro verde.

A peça correta:

# ASA AZUL

deve ser claramente destacada com:

* glow amarelo;
* moldura;
* luz;
* estrelas.

==================================================
CONTROLES DOS JOGADORES
=======================

Criar painel na base da tela.

Dividir em dois lados.

### JOGADOR 1

Cor dominante:

VERMELHO CORAL

Mostrar:

```text
JOGADOR 1
MOVE
```

Adicionar:

* ícone de analógico ou D-Pad;
* setas ← → ↑ ↓.

### JOGADOR 2

Cor dominante:

AZUL

Mostrar:

```text
JOGADOR 2
PEGA / GIRA / SOLTA
```

Criar botões genéricos:

A — PEGA

Y — GIRA

B — SOLTA

Usar:

* A verde;
* Y amarelo;
* B vermelho.

Não copiar interface proprietária de consoles.

==================================================
FUNDO DA FÁBRICA
================

Criar cenário com profundidade.

Adicionar:

* grandes janelas;
* caixas;
* tubos;
* engrenagens;
* prateleiras;
* pequenos robôs;
* ursinho;
* dinossauro;
* bolas coloridas;
* máquinas;
* guindastes;
* estrelas luminosas.

Adicionar placas decorativas:

# PEQUENAS PEÇAS

# GRANDES AVENTURAS!

Outra:

# CONSTRUÍMOS

# SORRISOS

# JUNTOS

Manter o fundo com menor contraste para não competir com o gameplay.

==================================================
FEEDBACKS DE GAMEPLAY
=====================

Criar componentes:

### Feedback / Almost

```text
QUASE LÁ!
```

### Feedback / Success

```text
ENCAIXOU!
```

### Feedback / Wrong

```text
OPS!
TENTA OUTRA!
```

### Feedback / Score

```text
+100
```

### Feedback / Complete

```text
BRINQUEDO PRONTO!
```

### Feedback / Cooperation

```text
ÓTIMO TRABALHO EM EQUIPE!
```

==================================================
MECÂNICA FINAL — LANÇAMENTO
===========================

Depois que o foguete estiver totalmente montado, o jogo não termina.

Criar uma segunda etapa:

# ALINHAR E LANÇAR

Fluxo:

```text
última peça encaixa
↓
BRINQUEDO PRONTO!
↓
plataforma entra em modo lançamento
↓
jogadores alinham o foguete
↓
jogadores sincronizam a ação
↓
contagem regressiva
↓
lançamento
↓
score final
```

==================================================
TELA — ALINHAMENTO
==================

Transformar a plataforma central em:

# PLATAFORMA DE LANÇAMENTO

Adicionar:

* luzes piscando;
* fumaça suave;
* setas;
* mira de alinhamento;
* indicador de estabilidade;
* indicador de energia.

Texto principal:

# ALINHEM A NAVE!

Divisão cooperativa:

### JOGADOR 1

Responsável por:

* mover;
* alinhar;
* manter o foguete centralizado.

### JOGADOR 2

Responsável por:

* carregar energia;
* preparar ignição;
* executar lançamento.

==================================================
INDICADOR DE ALINHAMENTO
========================

Criar uma barra ou mira visual.

Estrutura:

```text
VERMELHO
AMARELO
VERDE
AMARELO
VERMELHO
```

A região central verde representa o alinhamento perfeito.

Quanto melhor o alinhamento:

* maior bônus;
* melhor estabilidade;
* lançamento mais forte.

==================================================
INDICADOR DE SINCRONIZAÇÃO
==========================

Criar um segundo indicador visual.

Pode ser:

* barra de energia;
* pulso;
* círculo carregando;
* zona de timing.

O jogador 2 precisa ativar o lançamento quando o indicador estiver na região correta.

Texto:

# PREPAREM O LANÇAMENTO!

==================================================
CONTAGEM REGRESSIVA
===================

Criar frames ou variants:

# 3

# 2

# 1

# LANÇAR!

Usar:

* números gigantes;
* fundo com leve escurecimento;
* luzes vermelhas/amarelas;
* fumaça;
* vibração visual.

==================================================
LANÇAMENTO
==========

Quando a ação cooperativa for concluída:

Mostrar:

* foguete decolando;
* fogo estilizado;
* fumaça cartoon;
* luzes;
* partículas;
* estrelas;
* confete;
* trilha luminosa.

A plataforma pode abrir o teto da fábrica.

O foguete sobe para o céu.

Capi comemora.

Fala:

# UAU!

# LANÇAMENTO PERFEITO!

ou:

# SUPER EQUIPE!

==================================================
SCORE BASEADO EM COOPERAÇÃO
===========================

O resultado deve levar em consideração:

* peças corretas;
* velocidade;
* precisão;
* quantidade de erros;
* qualidade dos encaixes;
* cooperação;
* alinhamento final;
* sincronização do lançamento.

Não mostrar cálculos complexos.

Transformar tudo em categorias visuais simples.

==================================================
TELA DE SCORE
=============

Criar tela final com grande hierarquia.

Título:

# MISSÃO CUMPRIDA!

ou:

# LANÇAMENTO CONCLUÍDO!

Mostrar:

### MONTAGEM

```text
300
```

### COOPERAÇÃO

```text
250
```

### LANÇAMENTO

```text
200
```

### SCORE FINAL

```text
750
```

Adicionar medalha ou ranking.

Possibilidades:

* BOA EQUIPE
* EQUIPE INCRÍVEL
* SUPER EQUIPE
* MESTRES DA FÁBRICA

Criar de 1 a 3 estrelas dependendo do desempenho.

==================================================
TELA DE RESULTADO VISUAL
========================

Mostrar:

* Capi comemorando;
* foguete no céu;
* brinquedos montados;
* estrelas;
* confete;
* score grande.

Adicionar CTA:

# JOGAR NOVAMENTE

Adicionar secundário:

# PRÓXIMA MISSÃO

==================================================
DIFICULDADE ADAPTATIVA
======================

Planejar a interface para permitir dificuldade adaptativa.

Se os jogadores estiverem com dificuldade:

* esteira desacelera;
* peça correta brilha mais;
* encaixe fica mais evidente;
* Capi dá dicas.

Se estiverem jogando muito bem:

* esteira acelera;
* mais peças aparecem;
* tempo fica mais importante;
* bônus aumentam.

O jogo não deve mostrar explicitamente:

FÁCIL
MÉDIO
DIFÍCIL

A adaptação deve acontecer de maneira invisível.

==================================================
TIPOGRAFIA
==========

Usar tipografia:

* sem serifa;
* arredondada;
* pesada;
* divertida;
* legível de longe.

Criar estilos:

DISPLAY

```text
48–64 px
```

HUD LARGE

```text
32–40 px
```

HUD

```text
24–28 px
```

LABEL

```text
18–22 px
```

Não criar textos pequenos.

==================================================
BORDAS
======

Usar radius alto.

Cards:

```text
20–28 px
```

Botões:

```text
18–24 px
```

HUD:

```text
24–32 px
```

Painéis grandes:

```text
28–36 px
```

==================================================
SOMBRAS E VOLUME
================

Usar:

* sombras suaves;
* inner highlight;
* bordas claras;
* gradientes leves;
* glow moderado.

A interface deve parecer feita de:

```text
PLÁSTICO PREMIUM
+
BRINQUEDO
+
VIDEOGAME
```

Não usar visual totalmente flat.

==================================================
COMPONENTES FIGMA
=================

Criar componentes:

Game / Logo

Game / Header

Game / Objective

Game / Progress

Game / Timer

Game / ToyCounter

Game / ModelPanel

Game / NextPiece

Game / Conveyor

Game / ConveyorPiece

Game / AssemblyPlatform

Game / LaunchPlatform

Game / AlignmentMeter

Game / EnergyMeter

Game / Character / Capi

Game / SpeechBubble

Game / PlayerControls

Game / Feedback

Game / ScorePopup

Game / Countdown

Game / FinalScore

==================================================
VARIANTS
========

### ConveyorPiece

* default
* highlighted
* selected
* wrong

### Feedback

* almost
* success
* wrong
* complete
* cooperation

### Capi

* idle
* pointing
* happy
* celebrating
* confused
* surprised

### Progress

* 0
* 25
* 50
* 75
* 100

### AlignmentMeter

* bad
* almost
* good
* perfect

### LaunchEnergy

* empty
* charging
* ready
* perfect

==================================================
FRAMES / TELAS
==============

Criar:

### 01 — SPLASH

Logo:

TOY FACTORY RUSH

Texto:

PRESSIONE START

### 02 — COMO JOGAR

Mostrar:

JOGADOR 1
MOVE

JOGADOR 2
PEGA / GIRA / SOLTA

Texto:

# TRABALHEM JUNTOS!

### 03 — INÍCIO DA MISSÃO

Texto:

# MONTE O FOGUETE!

### 04 — GAMEPLAY

Esteira ativa.

Capi:

PEGA O AZUL!

### 05 — PEÇA SELECIONADA

Glow.

### 06 — MOVIMENTANDO

Texto:

QUASE LÁ!

### 07 — ENCAIXE

Texto:

ENCAIXOU!

+100

### 08 — FOGUETE PRONTO

Texto:

BRINQUEDO PRONTO!

### 09 — ALINHAMENTO

Texto:

ALINHEM A NAVE!

### 10 — PREPARAÇÃO

Texto:

PREPAREM O LANÇAMENTO!

### 11 — CONTAGEM

3

2

1

LANÇAR!

### 12 — DECOLAGEM

Foguete subindo.

Capi comemorando.

### 13 — SCORE

MISSÃO CUMPRIDA!

Montagem

Cooperação

Lançamento

Score total

### 14 — JOGAR NOVAMENTE

Botões:

JOGAR NOVAMENTE

PRÓXIMA MISSÃO

==================================================
PROTÓTIPO
=========

Criar uma navegação conceitual entre os frames.

Fluxo:

```text
SPLASH
↓
COMO JOGAR
↓
MISSÃO
↓
GAMEPLAY
↓
ENCAIXE
↓
FOGUETE PRONTO
↓
ALINHAMENTO
↓
CONTAGEM
↓
LANÇAMENTO
↓
SCORE
↓
JOGAR NOVAMENTE
```

Usar Smart Animate em transições simples.

==================================================
SENSAÇÃO FINAL
==============

O projeto precisa parecer um jogo cooperativo familiar premium feito para uma grande feira.

Em aproximadamente 3 segundos, qualquer pessoa olhando para a tela precisa entender:

```text
há um foguete sendo montado;
há uma esteira com peças;
há uma capivara ajudando;
existem dois jogadores;
os dois precisam trabalhar juntos;
existe uma recompensa final;
o foguete será lançado.
```

O principal foco visual deve ser:

1. foguete;
2. peça correta;
3. Capi;
4. esteira;
5. feedback de cooperação.

O lançamento deve ser o maior momento visual da partida.

O score final deve reforçar:

# VOCÊS CONSEGUIRAM JUNTOS.
