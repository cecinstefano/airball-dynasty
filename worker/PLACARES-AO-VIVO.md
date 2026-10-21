# Ativar os placares do carrossel

O site agora consulta `/matchups` no mesmo Worker dos jogadores. A rota retorna os pontos reais dos confrontos da rodada atual da liga AirBall. Não soma projeções dos jogadores.

1. No Cloudflare, abra o Worker **airball-espn-proxy** e clique em **Edit code**.
2. Substitua o código pelo conteúdo completo de `worker/airball-espn-worker.mjs` deste repositório e clique em **Deploy**.
3. Mantenha os secrets e variáveis existentes: ESPN_SWID, ESPN_S2, ESPN_LEAGUE_ID, ESPN_SEASON_ID e ALLOWED_ORIGIN. Não é necessário criar banco ou novos secrets. Não altere o Worker dos palpites.
4. Abra `https://airball-espn-proxy.stefanocecin.workers.dev/matchups`. A resposta deve conter `matchupPeriodId`, `updatedAt` e a lista `matchups` com os nomes e placares. Um placar zerado vindo da ESPN é válido; dados ausentes são null.
5. Publique a mudança do HTML com **Push origin** no GitHub Desktop. Abra o site e confira os placares.

O site consulta a cada 30 segundos, pausando as consultas em abas ocultas. O cache da nova rota dura 15 segundos; a pontuação também depende da atualização feita pela própria ESPN. O horário informado é de Brasília. A rodada segue `status.currentMatchupPeriod` da liga.

Se uma atualização falhar, o carrossel mantém os últimos valores recebidos, mostra “Último placar” e informa a falha. Antes da primeira consulta bem-sucedida, os placares ficam em branco (—), sem exibir os zeros da antiga lista fixa.

Referência de estrutura: código do projeto espn-api, `espn_api/basketball/league.py`, `espn_api/basketball/box_score.py` e `espn_api/base_league.py`: https://github.com/cwendt94/espn-api.
