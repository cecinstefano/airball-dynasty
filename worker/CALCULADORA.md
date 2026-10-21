# Ativar as médias atuais na calculadora

O menu CALCULADORA fica na aba privada `#/ABA-INVISIBILITY`.

1. No Cloudflare, abra **airball-espn-proxy → Edit code**.
2. Substitua pelo arquivo completo `worker/airball-espn-worker.mjs` atualizado neste repositório e clique em **Deploy**. Preserve os secrets e variáveis que já existem. O arquivo inclui também os placares ao vivo; não altere o Worker dos palpites.
3. Confira `/health`: a versão deve ser `player-table-v11-current-averages`.
4. Confira `/players`: os jogadores agora têm `currentSeasonAverage`, `currentAvg`, `currentSeasonGames` e `currentAvgSeasonId`. O AVG anterior continua nos campos originais; média atual não usa valores da temporada passada. Se o jogador ainda não disputou jogos, não existe média atual para comparação.
5. No GitHub Desktop, publique o HTML com **Push origin** e clique em **Atualizar** no painel.

Na calculadora, escolha seu time e busque um jogador. Se ele for de outro time, os pacotes sugerem recebê-lo. Se for do seu time, sugerem oferecê-lo. Formatos: você envia × recebe (1x1, 2x1 e 3x2). O 3x2 para receber inclui um companheiro do time do jogador buscado.

As regras e valores são os mesmos do Honestômetro: AVG positivo do Worker, com Yahoo quando ausente, piso 20, multiplicadores, slots de 20 e os mesmos arredondamentos. O filtro só mostra pacotes aprovados. Os ganhos usam Hashtag; não alteram a aprovação. São analisadas as combinações dos elencos, preservando as 100 melhores sugestões.

Alvos: Hashtag − média atual. Quem tem Hashtag acima de 30 ganha prioridade. “Oferecer” mostra o cenário inverso. Jogadores sem Hashtag ou sem média atual ficam fora desta comparação. Nenhuma troca é executada automaticamente.
