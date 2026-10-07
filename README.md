# 🦖 Dino Game

O clássico jogo do dinossauro do Google Chrome (aquele de quando você fica sem internet), repaginado com visual caprichado e muita personalização.

**Jogar:** abra o arquivo `index.html` em qualquer navegador. Não precisa instalar nada.

## Novidades em relação ao original

- **6 personagens**: Dino, Gato, Cachorro, Coelho, Pinguim e Raposa. Cada um tem seu próprio nome e visual salvos.
- **Nome personalizado**, que aparece acima do personagem durante a corrida (dá pra desligar).
- **Acessórios para qualquer personagem**
  - Chapéu: boné, cartola, coroa, cowboy, gorro, festa, laço, viking
  - Óculos: escuros, redondos, nerd, estrela, máscara de herói
  - Roupa: camiseta, listrada, colete, capa, cachecol, gravatinha, gravata
  - Calçado: tênis, cano alto, botas, patins
  - Cores para o corpo e para cada acessório (incluindo cor personalizada)
- **5 cenários**, cada um com obstáculos e inimigo voador próprios:
  - Deserto: cactos, pedras e abutres
  - Floresta: tocos, cogumelos, arbustos e pássaros
  - Oceano: corais, ouriços, anêmonas e águas-vivas
  - Neve: bonecos de neve, blocos de gelo, pinheiros e corujas
  - Espaço: cristais, rochas lunares, cactos alienígenas e OVNIs
- **4 velocidades**: Lento, Normal, Rápido e Insano. A velocidade aumenta aos poucos durante a partida, como no Chrome.
- **Ciclo dia e noite** a cada 700 pontos (opcional).
- **Tema claro, escuro ou automático** (segue o sistema).
- **Teclas configuráveis**: pular, pular (alternativa), abaixar e pausar.
- **Recordes**: top 10 local com personagem, cenário, velocidade e data.
- **Celular**: toque para pular, botões de Pular/Abaixar na tela.
- Efeitos sonoros gerados na hora (sem arquivos de áudio).

## Controles padrão

| Ação | Tecla |
| --- | --- |
| Pular (segure para pular mais alto) | `Espaço` ou `↑` |
| Abaixar / cair mais rápido no ar | `↓` |
| Pausar | `P` ou `Esc` |
| Reiniciar após o game over | `Espaço` ou `Enter` |

Todas podem ser trocadas em **Configurações**.

## Estrutura do projeto

```
DinoGame/
├── index.html          # página do jogo
├── css/style.css       # visual da interface (claro/escuro)
├── js/
│   ├── utils.js        # funções auxiliares (cores, formas, teclas)
│   ├── characters.js   # personagens e acessórios (desenho vetorial)
│   ├── themes.js       # cenários, obstáculos e paletas dia/noite
│   ├── storage.js      # configurações e recordes (localStorage)
│   ├── audio.js        # efeitos sonoros (Web Audio)
│   ├── game.js         # motor do jogo: física, colisão, pontuação
│   └── ui.js           # menus, personalização e controles
└── assets/favicon.svg
```

Tudo é desenhado com Canvas 2D, sem imagens nem bibliotecas externas. As configurações ficam salvas no navegador.

## Publicar no GitHub Pages (opcional)

Com o repositório público no GitHub: **Settings → Pages → Branch: `main` / `(root)` → Save**. Em um ou dois minutos o jogo fica disponível em `https://SEU-USUARIO.github.io/dino-game/`.
