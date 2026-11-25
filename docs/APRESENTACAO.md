# IFhoot! | Roteiro para apresentar o Trabalho 4

**Disciplina de Arquitetura de Software · IFCE.** Reserve, como referência, 10 a 12 minutos para o código e 4 a 6 minutos para jogar. Abra o projeto no editor. Até terminar a primeira parte, projete apenas o código. No VS Code, use **Ctrl+P** para abrir um arquivo pelo nome e **Ctrl+F** para localizar o método indicado.

## Parte 1 · Mostrar o código

### 1. Apresentar a ideia e o ponto de entrada

**Abra** [servidor.js](../servidor.js). Mostre, na ordem, `lerPerguntas`, `GerenciadorPartida.obterInstancia`, `partida.inscrever`, `configurarRotas` e `configurarSockets`.

**Fala sugerida**

> O IFhoot! é um quiz ao vivo inspirado no Kahoot!. O professor projeta uma pergunta e cada participante responde pelo próprio celular. Se duas pessoas responderem quase juntas, elas precisam estar disputando a mesma pergunta, com o mesmo cronômetro e a mesma regra de pontos. É esse problema que organizou o projeto.
>
> Aqui é onde tudo começa. O servidor lê as perguntas de um arquivo de texto, obtém a sala do gerenciador e registra o console para acompanhar as mudanças. O Express entrega as páginas. O Socket.IO mantém a comunicação com elas durante o jogo. Reparem que a variável `partida` leva a mesma referência para as duas partes.
>
> O trabalho pede pelo menos três padrões de projeto. Neste jogo usamos quatro. Singleton resolve quem fornece a sala, State decide o que pode acontecer em cada fase, Strategy calcula os pontos e Observer comunica o que mudou.

### 2. Explicar o que existe dentro da sala

| Abra no editor | Trecho para destacar | Fala sugerida |
|---|---|---|
| [Pergunta.js](../src/Pergunta.js) | `lerPerguntas`, `validar` e `estaCorreta` | “Cada linha de `perguntas.txt` vira uma `Pergunta`. Ela guarda enunciado, opções, tempo e índice correto. Primeiro verifico se a opção existe. Depois verifico se ela corresponde ao gabarito. Uma alternativa válida pode estar errada e valer zero.” |
| [Jogador.js](../src/Jogador.js) | `constructor`, `registrarRodada` e `zerar` | “O apelido aparece no telão. O identificador guardado pelo celular permite retomar o mesmo participante. O jogador mantém o total e o ganho da última rodada. Um acerto de mil acrescenta mil ao total, e esse mesmo ganho aparece no resultado.” |
| [Partida.js](../src/Partida.js) | Campos `#estado`, `#pontuacao`, `#ouvintes`, `#jogadores` e `#respostas` | “A partida reúne as perguntas, os jogadores e as respostas da rodada. Um mapa encontra o participante pelo identificador. Outro guarda a resposta que ele já deu. O sinal de cerquilha indica que o campo é privado. Agora vou mostrar quais decisões essa classe delega.” |

### 3. Singleton · Quem fornece a partida?

**Abra** [GerenciadorPartida.js](../src/GerenciadorPartida.js). Aponte para `static #instancia`, `obterInstancia`, `constructor` e `get partida`. Volte à linha em `servidor.js` que lê `gerenciador.partida`.

> Imaginem que cada conexão criasse sua própria sala. O celular da Ana somaria pontos em uma partida e o projetor consultaria outra. O gerenciador existe para fornecer uma referência comum.
>
> `#instancia` pertence à classe. Na primeira chamada de `obterInstancia(perguntas)`, o campo está vazio. O gerenciador é criado, constrói uma `Partida` e fica guardado nesse campo. Nas próximas chamadas, o método devolve o mesmo objeto. A chave interna usada pelo construtor existe somente neste módulo.
>
> Quando alguém entra, o servidor reaproveita a partida. Quando clico em “Nova partida”, o estado final manda zerar o placar e a sala continua a mesma. Se eu desligar o processo do Node, esses dados em memória terminam com ele.

### 4. State · Por que o mesmo botão faz coisas diferentes?

**Comece por** [Partida.js](../src/Partida.js), em `avancar()`. Mostre a chamada `this.#estado.avancar(this)`. Abra [EstadoPartida.js](../src/estados/EstadoPartida.js) e depois percorra as quatro subclasses na ordem abaixo.

> Quando o apresentador avança, a partida entrega o pedido ao estado atual. O `this` passado como argumento é a própria partida. Assim, o estado consegue abrir a pergunta ou trocar de fase. A classe base `EstadoPartida` define as operações comuns e a resposta para uma ação indisponível. Cada subclasse implementa o comportamento da sua fase.

| Classe e método para abrir | O que dizer ao apontar para o código |
|---|---|
| [AguardandoJogadores](../src/estados/AguardandoJogadores.js) · `trocarPontuacao` e `avancar` | “É a sala de espera. Podemos entrar e escolher a regra de pontos. Para começar, é preciso pelo menos uma pessoa. O primeiro avanço abre a pergunta de índice zero e troca o estado para `PerguntaAberta`.” |
| [PerguntaAberta](../src/estados/PerguntaAberta.js) · `responder`, `tempoEsgotado` e `#fecharPergunta` | “Aqui a resposta tem efeito. Depois de registrá-la, o estado confere se todos já responderam. A última resposta, o fim do tempo e o comando do apresentador chegam ao mesmo fechamento. Nesse momento aparece o resultado. Quem entrar enquanto a pergunta estiver aberta também pode participar.” |
| [MostrandoResultado](../src/estados/MostrandoResultado.js) · `avancar` | “A turma vê o gabarito e o placar. Se ainda houver uma pergunta, o avanço abre a próxima e volta a `PerguntaAberta`. Depois da última, ele leva ao fim da partida. Quem entra nesta fase começa a disputar a pergunta seguinte.” |
| [PartidaEncerrada](../src/estados/PartidaEncerrada.js) · `avancar` | “O telão exibe o pódio. Agora o mesmo comando representa ‘Nova partida’. Ele limpa as respostas, zera os pontos e devolve os mesmos jogadores à sala de espera.” |

**Mostre um limite concreto.** Em [erros.js](../src/erros.js), a classe `AcaoInvalida` representa um pedido que a regra do jogo impede. Na sala de espera, `responder` herda a implementação da classe base. Em [sockets.js](../src/web/sockets.js), `tratar` converte essa exceção em uma mensagem para a pessoa que fez o pedido.

### 5. Strategy · Quanto vale a mesma resposta?

**Abra, nesta ordem**, [EstrategiaPontuacao.js](../src/pontuacao/EstrategiaPontuacao.js), [PontuacaoSimples.js](../src/pontuacao/PontuacaoSimples.js), [PontuacaoVelocidade.js](../src/pontuacao/PontuacaoVelocidade.js) e [estrategias.js](../src/pontuacao/estrategias.js). Termine em [Partida.js](../src/Partida.js), no método `registrarResposta`.

> As duas regras dizem quantos pontos vale um acerto. O contrato `EstrategiaPontuacao` define o método `pontosPorAcerto`. `PontuacaoSimples` devolve mil. `PontuacaoVelocidade` parte de 500 e acrescenta até 500 de bônus, conforme a fração de tempo que sobrou. O relógio usado para esse cálculo é o do servidor.

| Exemplo de uma pergunta de 20 segundos | Simples | Velocidade |
|---|---:|---:|
| Acertou após 5 segundos | 1.000 | 875 |
| Acertou após 10 segundos | 1.000 | 750 |
| Errou ou deixou o tempo passar | 0 | 0 |

> Aos cinco segundos ainda restam quinze dos vinte, ou 75% do tempo. Por isso o bônus é 375. Em `estrategiasDisponiveis()` estão as opções do telão. Na sala de espera, `trocarPontuacao` localiza a opção e `definirPontuacao` guarda a estratégia escolhida. Em `registrarResposta`, a partida confere se a pessoa já respondeu, valida a opção e pede os pontos à estratégia em caso de acerto. O total muda antes do aviso às telas. No fechamento, só falta registrar zero para quem ficou sem responder.

### 6. Observer · Como o telão descobre que alguém respondeu?

**Abra** [OuvintePartida.js](../src/observadores/OuvintePartida.js), [LogConsole.js](../src/observadores/LogConsole.js) e [ConexaoSocket.js](../src/web/ConexaoSocket.js). Em [Partida.js](../src/Partida.js), destaque `inscrever`, `#notificar` e `cancelarInscricao`.

> A `Partida` é o objeto observado. Ela mantém um conjunto de ouvintes. O contrato `OuvintePartida` diz que um ouvinte recebe `atualizar(mensagem)`. O primeiro exemplo concreto é `LogConsole`: ao ser avisado, escreve a mensagem no terminal.
>
> O segundo é `ConexaoSocket`. Cada telão ou celular conectado ganha um desses objetos no servidor. Quando uma resposta foi aceita e os pontos já foram creditados, `#notificar` percorre os inscritos. A conexão agenda um envio para cerca de 30 milissegundos depois. Se chegar outro aviso nesse intervalo, ela aproveita o envio já marcado e as duas mudanças aparecem juntas na tela.
>
> O Socket.IO transporta a mensagem. O Observer está na relação entre a partida e seus inscritos. Se uma tela sai, `cancelarInscricao` a retira do conjunto. Se o celular recarrega e apresenta o mesmo identificador, a nova conexão recebe a pontuação que a partida já guardou.

### 7. Acompanhar uma resposta do clique até o placar

**Percorra esta sequência com o editor aberto.** Ela reúne os quatro padrões em um único lance do jogo.

1. Em [jogador.js](../public/js/jogador.js), ache `responder`. **Fala sugerida** — “Quando Ana toca em B, o celular envia o índice da alternativa e a identificação da rodada. Quem decide a pontuação é o servidor.”
2. Em [sockets.js](../src/web/sockets.js), ache `socket.on('responder'`. **Fala sugerida** — “A conexão identifica a Ana e chama `partida.responder` na sala obtida do Singleton.”
3. Em [PerguntaAberta.js](../src/estados/PerguntaAberta.js), ache `responder`. **Fala sugerida** — “O State permite a jogada enquanto há tempo. A partida registra uma única resposta dessa pessoa e usa a Strategy para creditar um acerto.”
4. Em [Visao.js](../src/web/Visao.js), ache `paraTelao` e `paraJogador`. **Fala sugerida** — “Quando o Observer avisa a conexão, ela monta os dados do destinatário. O telão recebe a classificação da turma. O celular recebe seus pontos e a confirmação da escolha. O gabarito vai no resultado.”
5. Em [telao.js](../public/js/telao.js), ache `socket.on('tela'`, `desenharPergunta` e `desenharBastidores`. **Fala sugerida** — “O telão redesenha o contador e os três primeiros do placar. Se era a última resposta, a tela já pode mostrar o resultado, porque os avisos próximos são agrupados.”

As páginas [telao.html](../public/telao.html) e [jogador.html](../public/jogador.html) definem os elementos que serão projetados ou tocados. [interface.js](../public/js/interface.js) reúne a formatação dos pontos e o tratamento do texto exibido. Se pedirem a infraestrutura, mostre [rotas.js](../src/web/rotas.js) para as páginas e QR codes, [rede.js](../src/web/rede.js) para o endereço de entrada e [configuracao.js](../src/configuracao.js) para a porta e o Wi-Fi opcional.

**Para passar do código ao jogo**, diga “Agora que vimos o caminho de uma resposta no código, vamos acompanhar esse mesmo caminho jogando.”

## Parte 2 · Projetar o telão e jogar

Antes da aula, instale as dependências com `npm ci` na pasta do projeto. Conecte o notebook e os celulares à mesma rede. Durante a exposição do código, o navegador pode ficar fechado.

| Momento | O que fazer | O que mostrar ou dizer |
|---|---|---|
| Abrir a sala | No terminal, rode `npm start`. Projete `http://localhost:3000/telao`. | Aponte para o QR e para o endereço alternativo. Convide duas pessoas a entrar, cada uma com um apelido. Com duas, a primeira resposta continua visível enquanto a segunda pessoa pensa. |
| Situar a turma | Clique em **Bastidores** ou pressione **B**. Escolha **Simples** na sala de espera. | Mostre o horário da sala em Singleton, a fase em State e a regra em Strategy. Em Observer, o número inclui o console e as telas conectadas. Com um telão, dois celulares e o console, são quatro ouvintes. |
| Começar | Clique em **Começar**. Peça à primeira pessoa que responda e à segunda que aguarde alguns segundos. | Aponte para “1 de 2 responderam”, o último aviso e o placar ao vivo. Se a primeira pessoa acertar, os 1.000 pontos aparecem com a pergunta ainda aberta. Se errar, o contador avança e o total fica igual. |
| Revelar o resultado | Peça a resposta da segunda pessoa. | O estado muda sozinho. Mostre a alternativa correta, a quantidade de votos e o total de cada participante. No celular, quem acertou vê o ganho. Os mesmos pontos continuam no placar. |
| Concluir o jogo | Clique em **Próxima pergunta** ou pressione **→**. Joguem as demais. Também é possível usar **Encerrar pergunta** ou aguardar o cronômetro. Após a última, escolha **Ver resultado final**. | Mostre o pódio e a posição no celular. O empate de pontos divide a colocação. |
| Demonstrar a outra regra | Em **Nova partida**, confira os mesmos apelidos, os pontos zerados e o horário da sala. Selecione **Velocidade** e abra a primeira pergunta. Peça às duas pessoas que escolham a alternativa correta com alguns segundos de diferença. | “A sala e a pergunta são as mesmas. Mudamos a estratégia. Os dois acertaram e receberam bônus diferentes pelo tempo de resposta.” |

Se estiver apresentando sozinho, mantenha o telão em uma janela e jogue manualmente no próprio celular ou em `http://localhost:3000/` no notebook. Para duas identidades no mesmo computador, use um perfil comum e outro perfil ou uma janela privativa. Duas abas do mesmo perfil compartilham o identificador do jogador.

**Fala de encerramento**

> Vocês acabaram de ver a mesma jogada por dentro e por fora. A resposta entrou na sala mantida pelo Singleton. O State permitiu a ação, a Strategy calculou os pontos e o Observer levou a mudança ao telão e aos celulares. Foi assim que os quatro padrões resolveram problemas concretos deste quiz.
