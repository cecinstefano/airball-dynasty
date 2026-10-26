# Classificação automática e resumo da rodada 1

O index usa agora o campo `standings` retornado pelo mesmo `/matchups` do carrossel. A tabela e a faixa de escudos compartilham essa resposta e atualizam a cada 30 segundos. A antiga classificação fixa não é usada como se fosse um dado ao vivo.

O Worker foi publicado em 26/10/2026 com a versão `league-v12-standings-week-recap`. A verificação pública confirmou os 16 times na ordem oficial da ESPN, os oito placares finais da semana 1 e 209 registros de jogadores no resumo da rodada. Os secrets e as variáveis existentes foram preservados.

## Publicação do Worker

1. Abra o Worker **airball-espn-proxy** no Cloudflare e escolha **Edit code**.
2. Substitua o código pelo conteúdo completo de `airball-espn-worker.mjs`.
3. Clique em **Deploy**. Mantenha os secrets existentes. Não copie credenciais para o HTML.
4. Confira `/health`: a versão deve ser `league-v12-standings-week-recap`.
5. Confira `/matchups`: `standings` deve conter os 16 times, suas posições, vitórias, derrotas e pontos a favor.
6. `/matchups?week=1` consulta os placares da primeira rodada. `/week-recap?week=1` consulta os totais reais do box score da rodada; se a ESPN não fornecer essas estatísticas, o campo `playerStatsStatus` informa a ausência, sem substituir por projeções.

## Notícia

Rota: `#/noticias/primeira-rodada-2026-27`.

Os oito placares finais e os Top Performers foram inicialmente conferidos na página oficial da ESPN e depois validados novamente pelo Worker publicado, por `/matchups?week=1` e `/week-recap?week=1`. Todos os 48 destaques citados nos confrontos e o top 10 da matéria coincidiram em IDs, pontos e franquia da rodada. Nomes completos e fotos foram relacionados pelo ID no `/players`.

Não foram usadas projeções. Os times dos destaques são os dos confrontos da primeira rodada, preservando o contexto histórico mesmo após trocas de jogadores.

## Validação

Testes locais de classificação oficial, registros ausentes, cache por rodada, estatísticas reais separadas de projeções, proteção dos secrets e rotas anteriores preservadas. No navegador: classificação e faixa sincronizadas, atualização de 30 segundos, oito resultados, dez destaques, ordenação e busca dos confrontos, busca de jogadores, tabela dos 16 times, fotos e responsividade.

O editor do Cloudflare ficou com carregamento permanente. Após autorização do usuário pelo fluxo oficial do Wrangler, o Worker foi publicado com sucesso. A autorização é guardada no cofre seguro do Windows, fora do projeto. A rota `/players` continua retornando 1.098 jogadores e 349 projeções ESPN.

O HTML e os arquivos de notícia ainda precisam de **Push origin** no GitHub Desktop. A publicação no Cloudflare não publica o GitHub Pages. Depois do envio ao GitHub, conferir no site a notícia e as duas superfícies da classificação.
