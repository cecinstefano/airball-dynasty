# Projeção de playoffs AirBall — fotografia de 02/11/2026

Este diretório guarda os dados congelados e o cálculo usado na notícia `#/noticias/chances-playoffs-2027`.

## Reprodução

Requer Node.js. Não instala dependências, não consulta a rede e não exige credenciais.

```powershell
node analysis/playoff-2027/model.cjs work/playoffs-reproduzido.json
```

Sem argumento de saída, atualiza `assets/news/corrida-playoffs-2027/dados.json`. O texto e os dados incorporados ao HTML continuam sendo uma fotografia editorial; uma nova execução não publica alterações automaticamente.

`inputs.json` contém os 233 integrantes dos elencos consultados, as projeções existentes da I.A., os confrontos oficiais, as campanhas, os 788 jogos NBA futuros identificados, seis eventos TBD, as últimas atuações dos jogadores sinalizados e as janelas assumidas para a análise. Não contém cookies nem chaves do Worker.

## Modelo

- 16 times, oito vagas, 18 semanas, duas já concluídas. Campanhas e pontos conquistados são preservados.
- 128 confrontos futuros obtidos do Worker, relacionados pelo ID das equipes. Datas de 02/11/2026 a 28/02/2027; a última rodada tem 14 dias.
- Projeção principal: ESPN ajustada pela média atual com peso `jogos/(jogos+12)`. Sem ESPN: Season 2026, depois I.A., depois média atual.
- Cada semana seleciona até 13 integrantes atuais por volume esperado. Uma programação dinâmica usa sete titulares diários: PG, SG, SF, PF, C, UTIL, UTIL. É uma gestão idealizada, não uma previsão dos cortes reais; os nomes do recorte podem ser reorganizados nas semanas seguintes.
- Disponibilidade geral de 92% e incerteza persistente de 10% por equipe são premissas. A oscilação semanal de aproximadamente 13,4% é regularizada para lidar com a pequena amostra de duas rodadas.
- Retornos são janelas de disponibilidade do modelo. Datas genéricas da ESPN e reavaliações não são datas de alta. Porzingis fica indisponível na base; a reintegração otimista após 45–75 dias é apenas um teste.
- Cinco cenários comparáveis, 50.000 temporadas cada: base, ESPN, I.A., retornos rápidos e lentos. A menor e a maior chance formam a faixa de sensibilidade, sem interpretação de intervalo de confiança.
- Também há um cenário geral sem afastamentos e 16 controles que alteram somente a saúde de uma franquia. Total: 1.100.000 simulações. Os controles por time ficam fora da faixa comparativa.
- Empates na campanha usam o confronto direto entre os empatados; persistindo a igualdade, o modelo usa pontos acumulados como aproximação residual. Não replica integralmente o algoritmo ESPN para todos os empates múltiplos.

## Limites

Modelo experimental, sem validação histórica. A escalação é por valor esperado, não por conhecimento antecipado da pontuação real. Lesões futuras específicas, trades, entradas pelo waiver, mudanças de minutos/uso e correlações individuais entre jogadores não são previstas. O banco não recebe novos nomes externos. O cenário de saúde mede uma comparação condicional, não um efeito causal médico.

“Dias desde o último jogo” incluem os dias sem partidas e o intervalo entre temporadas. Não significam duração clínica da lesão. As 46 sinalizações incluem descanso, dúvida e suspensão.

Os seis eventos NBA sem participantes identificados não foram atribuídos a ninguém. A semana 8 segue no calendário mesmo com volume reduzido. As projeções são uma fotografia de 02/11/2026, não uma atualização em tempo real.

## Fontes

- Worker AirBall: `https://airball-espn-proxy.stefanocecin.workers.dev/players` e `/matchups?week=N`.
- Regras: `https://fantasy.espn.com/basketball/league/settings?leagueId=1245069102`.
- ESPN NBA scoreboard por data, boletim de lesões e game logs públicos.
- Informe oficial NBA de 02/11/2026, 10h15 ET: `https://ak-static.cms.nba.com/referee/injury/Injury-Report_2026-11-02_10_15AM.pdf`.

## Conferências

A reprodução foi comparada integralmente à saída publicada. Foram conferidos os 16 times, 233 jogadores, 46 alertas, 128 confrontos simétricos, limite de 13 nomes por semana, sete slots, soma de 800% das chances (oito vagas por temporada) e 144 vitórias médias distribuídas pela liga ao final das 18 rodadas. O site foi testado com todos os elencos, cenários, filtros médicos, busca, calendário e larguras de 320 e 390 pixels.
