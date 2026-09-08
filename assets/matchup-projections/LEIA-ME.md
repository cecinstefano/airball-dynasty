# Projeções de matchups

Rota sem item no menu: #/INVISBILITY-2

Fontes:
- Confrontos: anexo fornecido pelo usuário, 18 semanas e 8 confrontos por semana.
- Semana 18: corrigida para 15 a 28 de fevereiro de 2027 conforme pedido.
- Calendário: ESPN NBA scoreboard, temporada regular 2026–27. O endereço consultado está no JSON. Inclui 886 registros publicados de 20/10/2026 a 28/02/2027, alguns com participantes TBD.
- Referência oficial: https://www.nba.com/news/2026-27-schedule-team-by-team-index
- Elencos, posições e fotos: Worker ESPN do site; projeções: DRAFT_ANALYSIS_PROJECTIONS, também usada em Análise de Draft.

O botão Atualizar calendário NBA consulta novamente a fonte ESPN e atualiza a sessão. Se houver falha, mantém a versão local com data visível. Atualizar elencos carrega o Worker novamente e retorna o calendário à versão local.

Regras: PG, SG, SF, PF, PF, C, C, UTIL, UTIL. Programação dinâmica maximiza a soma das projeções por dia, respeitando elegibilidade e jogador único. Banco não pontua. Totais semanais somam escalações diárias. Ausências de projeção não são convertidas em AVG zero. Status de lesão é informativo; não se presume disponibilidade futura. Datas usam America/New_York, horários exibidos usam America/Sao_Paulo. Jogos adiados/cancelados não entram; TBD não é atribuído a jogadores. Sem garantias para jogos ainda não definidos ou mudanças futuras de calendário/elenco.
