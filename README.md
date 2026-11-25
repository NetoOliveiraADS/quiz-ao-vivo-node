# IFhoot!

Quiz ao vivo para a disciplina de Arquitetura de Software do IFCE. A turma entra pelo celular, responde às perguntas e acompanha o placar no telão. O projeto demonstra **Singleton, State, Strategy e Observer**.

Para apresentar em sala, abra o [roteiro de apresentação](docs/APRESENTACAO.md). Ele indica a ordem dos arquivos, os métodos para destacar, uma fala para cada classe e os passos para jogar com a turma.

## Rodar o projeto

Use Node.js 18 ou superior. Na pasta que contém `package.json`, execute os comandos abaixo.

```sh
npm ci
npm start
```

No Windows, também é possível dar dois cliques em `iniciar.bat`. Na primeira execução, ele instala as dependências. Conecte o notebook e os celulares à mesma rede antes de ligar o servidor.

| Quem | Onde abrir |
|---|---|
| Apresentador | No notebook que executa o servidor, abra `http://localhost:3000/telao`. O navegador abre automaticamente quando possível. |
| Jogador | Leia o QR do telão ou digite o endereço de rede mostrado nele. Para jogar no próprio notebook, abra `http://localhost:3000/` em outra janela. |

Para usar outra porta, execute `npm start -- --porta 3001`. Para escolher o momento de abrir o telão, use `npm start -- --sem-navegador`. O endereço usado aparece no terminal. Encerre com **Ctrl+C**.

## Conduzir uma partida

1. Cada participante escolhe um apelido. Na sala de espera, o apresentador pode clicar em um nome para removê-lo.
2. Escolha **Simples** (1.000 por acerto) ou **Velocidade** (500 de base e até 500 de bônus por rapidez). Uma resposta errada vale zero. Clique em **Começar**.
3. Durante a pergunta, o telão mostra quantas pessoas responderam e os três primeiros do placar. Cada resposta aceita atualiza os pontos.
4. Quando todos respondem, o tempo termina ou o apresentador clica em **Encerrar pergunta**, aparece o gabarito, a distribuição dos votos e o placar da rodada.
5. Avance até **Ver resultado final**. **Nova partida** zera os pontos e mantém os participantes na mesma sala.

**B** abre e fecha os **Bastidores**. O painel exibe o horário de abertura da sala, a fase, a regra de pontos e o último aviso aos ouvintes. A tecla **→** avança a etapa. **Espaço** também avança quando o foco está na página. Os botões de condução funcionam no computador que executa o servidor.

## Onde fica cada parte

| Local | Responsabilidade |
|---|---|
| `servidor.js` | Lê as perguntas, obtém a partida e liga Express e Socket.IO. |
| `src/GerenciadorPartida.js` | **Singleton**. Fornece a mesma partida durante a execução do servidor. |
| `src/Partida.js`, `src/Jogador.js`, `src/Pergunta.js` | Regras do jogo, participantes e perguntas. |
| `src/estados/` | **State**. Define as ações permitidas e as transições de cada fase. |
| `src/pontuacao/` | **Strategy**. Define as duas formas de calcular os pontos. |
| `src/observadores/`, `src/web/ConexaoSocket.js` | **Observer**. Liga as mudanças da partida ao console e às telas inscritas. |
| `src/web/` | Páginas, QR codes, identificação da rede e mensagens entre servidor e navegadores. |
| `public/` | HTML do telão e do jogador. Os estilos ficam em `css/` e o comportamento em `js/`. |

## Perguntas e rede

Edite `perguntas.txt` e reinicie o servidor. Cada linha define uma pergunta com duração entre 5 e 300 segundos. Use de duas a quatro opções para múltipla escolha e marque a correta com `*`. Para verdadeiro ou falso, termine com `V` ou `F`.

```text
ME | 25 | Qual padrão define as fases da partida? | *State | Strategy | Observer
VF | 20 | Um acerto na regra Simples vale 1.000 pontos. | V
```

Se a rede da sala isolar os aparelhos, conecte o notebook e os celulares ao mesmo ponto de acesso móvel. O jogo funciona na rede local após a instalação. Para exibir também um QR de acesso ao Wi-Fi, copie `config.exemplo.json` para `config.json`, preencha o nome e a senha da rede que deseja apresentar e reinicie. Se os celulares não abrirem o endereço, confira a rede usada, o IP mostrado no terminal e a permissão do Node.js nessa rede.
