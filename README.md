# IFhoot! (Node.js + Socket.IO)

Quiz em tempo real para a turma, no estilo de jogo de auditório e com as cores do IFCE. O **telão** (projetor) mostra a pergunta, o cronômetro e o placar; cada pessoa responde pelo **celular**, no mesmo Wi-Fi do notebook.

Trabalho de **Arquitetura de Software**, com **3 padrões de projeto**: State, Observer e Strategy.

Tecnologias: Node.js 18+, Express 5 (páginas), Socket.IO 4 (tempo real) e `qrcode` (QR codes gerados no próprio servidor). As telas são HTML, CSS e JavaScript puro.

## Como rodar

1. Instale o **Node.js LTS** (https://nodejs.org).
2. Dê dois cliques em **`iniciar.bat`** (na primeira vez ele instala as dependências). Pelo terminal: `npm install` e `npm start`.

O telão abre sozinho no navegador, e o console mostra o endereço dos celulares. `npm test` joga uma partida inteira de mentira e confere as regras.

> Na primeira vez, o Windows pergunta se o Node.js pode usar a rede: marque **Redes privadas e públicas** e clique em *Permitir*.

## No dia: roteador do celular

A rede da faculdade isola os aparelhos, então o jogo roda no **roteador (hotspot) do seu celular**:

1. Ligue o roteador do celular e conecte o **notebook** nele **antes** de rodar o `iniciar.bat`.
2. (Opcional) Copie `config.exemplo.json` para `config.json` com o nome e a senha da rede: o telão passa a mostrar também um QR code que conecta no Wi-Fi.
3. O jogo não gasta dados móveis. O roteador do celular aceita poucos aparelhos (8 a 10): com turma grande, joguem em duplas.

## Como jogar

- A turma entra pelo QR code e escolhe um apelido.
- Escolha a pontuação e aperte **Espaço**. Cada Espaço avança: pergunta → resultado → próxima → pódio.
- A pergunta fecha sozinha quando todos respondem ou o tempo acaba.
- **B** mostra os **Bastidores** (os padrões agindo ao vivo). **+5 robôs** cria jogadores de teste (plano B se a rede falhar). Clicar num nome na sala de espera remove a pessoa.
- Só o notebook do servidor controla o jogo.

## Os padrões de projeto

| Padrão | Onde | O que faz no jogo |
|---|---|---|
| **State** | `src/estados/` | A partida passa por `AguardandoJogadores → PerguntaAberta → MostrandoResultado → PartidaEncerrada`. Cada estado decide o que é permitido; a `Partida` não tem `if (estado == ...)`. |
| **Observer** | `src/observadores/` e `src/web/ConexaoSocket.js` | A `Partida` avisa todos os ouvintes a cada mudança: o telão e cada celular (pelo Socket.IO), o console e os robôs. |
| **Strategy** | `src/pontuacao/` | Duas regras de pontuação trocáveis: Simples e Velocidade. |

## Estrutura

```
servidor.js          liga tudo
perguntas.txt        as perguntas
public/              telas: telao.html, jogador.html, estilo.css
teste/fluxo.mjs      teste automático (npm test)
src/
  Partida.js         contexto do State e do Strategy, sujeito do Observer
  Pergunta.js        a pergunta e a leitura do perguntas.txt
  Jogador.js, erros.js, configuracao.js
  estados/           STATE
  observadores/      OBSERVER
  pontuacao/         STRATEGY
  web/               rotas (Express), sockets (Socket.IO), ConexaoSocket, Visao, rede
```

## Editar as perguntas

Uma por linha em `perguntas.txt` (linhas com erro são ignoradas e o console avisa):

```
ME | 25 | Pergunta? | opção | *opção certa | opção | opção
VF | 20 | Uma afirmação. | V
```

## Problemas comuns

| Problema | O que fazer |
|---|---|
| O celular não abre a página | Ele está no mesmo Wi-Fi do notebook? O firewall liberou o Node.js? |
| Endereço errado no telão | O notebook entrou no Wi-Fi depois de ligar o servidor: feche e rode de novo. |
| "A porta 3000 já está em uso" | Feche o outro servidor ou rode `npm start -- --porta 3001`. |
| Celular mostra "Sem conexão" | Ele reconecta sozinho e a pessoa continua com os mesmos pontos. |
