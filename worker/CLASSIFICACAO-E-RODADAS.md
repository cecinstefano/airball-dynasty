# Classificação automática e resumo da rodada 1

O index usa agora o campo `standings` retornado pelo mesmo `/matchups` do carrossel. A tabela e a faixa de escudos compartilham essa resposta e atualizam a cada 30 segundos. A antiga classificação fixa não é usada como se fosse um dado ao vivo.

O Worker precisa ser publicado para disponibilizar esse campo. A versão preparada é `league-v12-standings-week-recap`, em `airball-espn-worker.mjs`.

## Publicação do Worker

1. Abra o Worker **airball-espn-proxy** no Cloudflare e escolha **Edit code**.
2. Substitua o código pelo conteúdo completo de `airball-espn-worker.mjs`.
3. Clique em **Deploy**. Mantenha os secrets existentes. Não copie credenciais para o HTML.
4. Confira `/health`: a versão deve ser `league-v12-standings-week-recap`.
5. Confira `/matchups`: `standings` deve conter os 16 times, suas posições, vitórias, derrotas e pontos a favor.
6. `/matchups?week=1` consulta os placares da primeira rodada. `/week-recap?week=1` solicita estatísticas reais dos períodos da rodada; se a ESPN não fornecer essas estatísticas, o campo `playerStatsStatus` informa a ausência, sem substituir por projeções.

## Notícia

Rota: `#/noticias/primeira-rodada-2026-27`.

Os oito placares finais e os Top Performers foram conferidos no placar oficial da ESPN com **Matchup 1 (Oct 20 - 25)** selecionado, porque o Worker antigo devolvia a semana 2 mesmo ao receber `?week=1`. Nomes completos e fotos foram relacionados pelo ID no `/players` do Worker.

Não foram usadas projeções. Os times dos destaques são os dos confrontos da primeira rodada, preservando o contexto histórico mesmo após trocas de jogadores.

## Validação

Testes locais de classificação oficial, registros ausentes, cache por rodada, estatísticas reais separadas de projeções, proteção dos secrets e rotas anteriores preservadas. No navegador: classificação e faixa sincronizadas, atualização de 30 segundos, oito resultados, dez destaques, ordenação e busca dos confrontos, busca de jogadores, tabela dos 16 times, fotos e responsividade.

O editor do Cloudflare ficou com carregamento permanente na tentativa de publicação. A ferramenta oficial Wrangler também não estava autenticada. Publicação em produção ainda precisa ser concluída e verificada.
