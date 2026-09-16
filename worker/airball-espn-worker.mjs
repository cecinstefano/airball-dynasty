// Cloudflare Worker para a integração AirBall Honestômetro x ESPN Fantasy Basketball
// Rotas:
//   GET /players  -> retorna jogadores tratados para o front-end, aba Jogadores e Honestômetro
//   GET /trades   -> retorna últimas trades/transações processadas pela ESPN
//   GET /health   -> teste simples
//
// Configure os secrets/vars no Cloudflare:
//   ESPN_LEAGUE_ID=1245069102
//   ESPN_SEASON_ID=2027
//   ESPN_SWID={SEU_SWID}
//   ESPN_S2=SEU_ESPN_S2
//   ALLOWED_ORIGIN=https://seusite.com   opcional; se não configurar, libera *

const NBA_TEAMS = {
  1: 'ATL', 2: 'BOS', 3: 'NOP', 4: 'CHI', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
  9: 'GSW', 10: 'HOU', 11: 'IND', 12: 'LAC', 13: 'LAL', 14: 'MIA', 15: 'MIL', 16: 'MIN',
  17: 'BKN', 18: 'NYK', 19: 'ORL', 20: 'PHI', 21: 'PHX', 22: 'POR', 23: 'SAC', 24: 'SAS',
  25: 'OKC', 26: 'UTA', 27: 'WAS', 28: 'TOR', 29: 'MEM', 30: 'CHA'
};

const DEFAULT_POSITIONS = {
  1: 'PG',
  2: 'SG',
  3: 'SF',
  4: 'PF',
  5: 'C'
};

const SPECIFIC_POSITION_SLOTS = {
  0: 'PG',
  1: 'SG',
  2: 'SF',
  3: 'PF',
  4: 'C'
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300'
  };
}

function jsonResponse(payload, status = 200, env = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders(env),
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
}

function getPosition(player) {
  // A ESPN envia eligibleSlots com slots amplos/de escalação, como G, F, UTIL, BE e IR.
  // Esses slots podem fazer um PG aparecer errado como PG/C se forem interpretados como posição real.
  // Para a AirBall, só usamos as posições específicas da liga: PG, SG, SF, PF e C.
  const specificEligible = Array.isArray(player.eligibleSlots)
    ? player.eligibleSlots
        .map(id => SPECIFIC_POSITION_SLOTS[id])
        .filter(Boolean)
    : [];

  if (specificEligible.length) return [...new Set(specificEligible)].join('/');
  return DEFAULT_POSITIONS[player.defaultPositionId] || '-';
}

// ESPN seasonId uses the ending year: 2026 is the 2025–26 actual season.
function statNumber(value){return (typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;}
function seasonStat(player,seasonId,sourceId){return (Array.isArray(player.stats)?player.stats:[]).find(s=>Number(s.seasonId)===Number(seasonId)&&s.statSourceId!==undefined&&Number(s.statSourceId)===sourceId&&s.statSplitTypeId!==undefined&&Number(s.statSplitTypeId)===0&&(s.scoringPeriodId===undefined||Number(s.scoringPeriodId)===0))||null;}
function averageFromStat(stat){if(!stat)return null;const avg=statNumber(stat.appliedAverage);if(avg!==null)return avg;const total=statNumber(stat.appliedTotal),games=statNumber(stat.gamesPlayed??stat.stats?.['42']);return total!==null&&games!==null&&games>0?total/games:null;}
function extractFantasyAverage(player,seasonId){return averageFromStat(seasonStat(player,seasonId,0));}
function extractFantasyTotal(player,seasonId){return statNumber(seasonStat(player,seasonId,0)?.appliedTotal);}
function extractFantasyProjection(player,seasonId){return averageFromStat(seasonStat(player,seasonId,1));}
function rounded(value){return value===null?null:Number(value.toFixed(2));}

function calculateAgeFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 && age < 80 ? age : null;
}

function extractAge(player) {
  const direct = Number(player.age);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return calculateAgeFromBirthDate(player.birthDate || player.dateOfBirth || player.dob || player.birthdate);
}

function statSearchText(stat) {
  try {
    return JSON.stringify({
      name: stat.name,
      label: stat.label,
      displayName: stat.displayName,
      statSplitTypeId: stat.statSplitTypeId,
      splitTypeId: stat.splitTypeId,
      statSourceId: stat.statSourceId,
      externalId: stat.externalId,
      id: stat.id
    }).toLowerCase();
  } catch (e) {
    return '';
  }
}

function extractRecentAverage(player, days, fallback) {
  const directKeys = days === 30
    ? ['last30Avg', 'last30', 'avg30', 'averageLast30', 'fantasyPointsLast30']
    : ['last15Avg', 'last15', 'avg15', 'averageLast15', 'fantasyPointsLast15'];

  for (const key of directKeys) {
    const value = Number(player[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  const stats = Array.isArray(player.stats) ? player.stats : [];
  const candidates = stats.filter(s => typeof s.appliedAverage === 'number' || typeof s.average === 'number');
  const textTokens = days === 30
    ? ['last30', 'last 30', '30d', '30 days', 'ultimos 30', 'últimos 30']
    : ['last15', 'last 15', '15d', '15 days', 'ultimos 15', 'últimos 15'];

  const byText = candidates.find(s => textTokens.some(token => statSearchText(s).includes(token)));
  if (byText) return Number(byText.appliedAverage ?? byText.average) || fallback;

  // A ESPN pode variar os IDs por temporada/jogo. Estes IDs são tentativas comuns de splits recentes.
  const possibleSplitIds = days === 30 ? [3, 4, 30] : [2, 15];
  const bySplit = candidates.find(s => possibleSplitIds.includes(Number(s.statSplitTypeId ?? s.splitTypeId)));
  if (bySplit) return Number(bySplit.appliedAverage ?? bySplit.average) || fallback;

  return fallback;
}

function isFreeFantasyTeamName(teamName) {
  const normalized = String(teamName || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  return !normalized || ['livre', 'free agent', 'fa', 'waiver', 'waivers', '-', '—'].includes(normalized);
}

function getEspnHeadshotUrl(playerId) {
  if (!playerId || !/^\d+$/.test(String(playerId))) return '';
  return `https://a.espncdn.com/i/headshots/nba/players/full/${playerId}.png`;
}

function extractPlayerPhoto(player) {
  if (!player) return '';
  if (typeof player.headshot === 'string') return player.headshot;
  if (player.headshot?.href) return player.headshot.href;
  if (player.headshot?.url) return player.headshot.url;
  if (player.image) return player.image;
  if (player.photo) return player.photo;
  return getEspnHeadshotUrl(player.id);
}

function getEspnFantasyTeamName(team) {
  if (!team) return 'Time';

  // Em algumas respostas da ESPN, `team.name` já vem como o nome completo do time da fantasy.
  // Se usarmos `team.name || team.location && team.nickname ? ...` sem parênteses,
  // o JavaScript pode cair em `undefined undefined`. Por isso a ordem aqui é explícita.
  const directName = String(team.name || '').trim();
  if (directName && directName.toLowerCase() !== 'undefined undefined') return directName;

  const location = String(team.location || '').trim();
  const nickname = String(team.nickname || '').trim();
  const combinedName = `${location} ${nickname}`.trim();
  if (combinedName && combinedName.toLowerCase() !== 'undefined undefined') return combinedName;

  return `Time ${team.id || ''}`.trim();
}

function getFantasyTeamMap(leagueData) {
  const map = new Map();
  const teams = Array.isArray(leagueData.teams) ? leagueData.teams : [];

  for (const team of teams) {
    const teamName = getEspnFantasyTeamName(team);
    const entries = team.roster && Array.isArray(team.roster.entries) ? team.roster.entries : [];
    for (const entry of entries) {
      const playerId = entry.playerId || entry.playerPoolEntry?.player?.id;
      if (playerId) map.set(Number(playerId), teamName);
    }
  }

  return map;
}

function getFantasyTeamIdMap(leagueData) {
  const map = new Map();
  const teams = Array.isArray(leagueData.teams) ? leagueData.teams : [];
  for (const team of teams) {
    if (team && team.id !== undefined && team.id !== null) {
      map.set(Number(team.id), getEspnFantasyTeamName(team));
    }
  }
  return map;
}

function buildPlayerInfoMap(players) {
  const map = new Map();
  const list = Array.isArray(players) ? players : [];
  for (const player of list) {
    if (!player || !player.id) continue;
    map.set(Number(player.id), player);
  }
  return map;
}

function normalizeLookupText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

function buildPlayerNameMap(players) {
  const map = new Map();
  const list = Array.isArray(players) ? players : [];
  for (const player of list) {
    if (!player || !player.name) continue;
    map.set(normalizeLookupText(player.name), player);
  }
  return map;
}

function findKnownPlayerByName(name, playerNameMap) {
  const key = normalizeLookupText(name);
  if (!key) return null;
  if (playerNameMap && playerNameMap.has(key)) return playerNameMap.get(key);

  // Fallback flexível para casos em que a ESPN coloca algo como ", PHI SF" junto do nome.
  if (playerNameMap) {
    for (const [knownKey, player] of playerNameMap.entries()) {
      if (key === knownKey || key.startsWith(knownKey + ' ') || knownKey.startsWith(key + ' ')) return player;
    }
  }
  return null;
}

function collectTransactionText(value, out = [], depth = 0) {
  if (depth > 4 || value === null || value === undefined) return out;
  if (typeof value === 'string') {
    const trimmed = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (trimmed) out.push(trimmed);
    return out;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return out;
  if (Array.isArray(value)) {
    value.forEach(item => collectTransactionText(item, out, depth + 1));
    return out;
  }
  if (typeof value === 'object') {
    const preferredKeys = [
      'message', 'messages', 'detail', 'details', 'description', 'summary', 'text',
      'activity', 'activityDetail', 'activityDetails', 'displayMessage', 'displayText',
      'shortMessage', 'longMessage', 'title', 'transactionDetail'
    ];
    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) collectTransactionText(value[key], out, depth + 1);
    }
  }
  return out;
}

function splitTradeTextLines(tx) {
  const rawParts = collectTransactionText(tx, [], 0);
  const lines = [];
  for (const part of rawParts) {
    String(part)
      .split(/\n|\r|<br\s*\/?>/i)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .forEach(line => lines.push(line));
  }

  // Remove duplicadas preservando ordem.
  const seen = new Set();
  return lines.filter(line => {
    const key = normalizeLookupText(line);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanPlayerNameFromTradeText(rawPlayer) {
  let value = String(rawPlayer || '').replace(/,$/, '').trim();
  if (value.includes(',')) {
    const [namePart, metaPart] = value.split(',').map(part => part.trim());
    // Remove metadados da ESPN, exemplo: ", PHI SF".
    if (/^[A-Z]{2,3}(\s+(PG|SG|SF|PF|C|G|F|UTIL|BE|IR)){0,3}$/i.test(metaPart || '')) value = namePart;
  }
  return value.replace(/\s+/g, ' ').trim();
}

function parseTradeLineFromRecentActivity(line, maps) {
  const cleaned = String(line || '')
    .replace(/Trade Processed/ig, ' ')
    .replace(/Transaction/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!/\btraded\b/i.test(cleaned) || !/\bto\b/i.test(cleaned)) return null;

  const match = cleaned.match(/^(.+?)\s+traded\s+(.+?)\s*,?\s+to\s+(.+)$/i);
  if (!match) return null;

  const fromTeam = match[1].trim();
  const playerName = cleanPlayerNameFromTradeText(match[2]);
  let toTeam = match[3].trim().replace(/[.;]+$/, '').trim();

  // Se por algum motivo duas mensagens vierem na mesma linha, corta no próximo \"traded\".
  const nextTradeIndex = toTeam.search(/\s+[^\s].*?\s+traded\s+/i);
  if (nextTradeIndex > 0) toTeam = toTeam.slice(0, nextTradeIndex).trim();

  const known = findKnownPlayerByName(playerName, maps.playerNameMap);
  const player = known ? {
    id: known.id,
    name: known.name,
    proTeam: known.proTeam || known.team || 'NBA',
    team: known.team || known.proTeam || 'NBA',
    position: known.position || '-',
    avg: known.avg || known.fantasyPoints || 0,
    fantasyPoints: known.fantasyPoints || known.avg || 0,
    total: known.total || known.totalPoints || 0,
    totalPoints: known.totalPoints || known.total || 0,
    photoUrl: known.photoUrl || known.headshotUrl || (known.id ? getEspnHeadshotUrl(known.id) : '')
  } : {
    id: '',
    name: playerName || 'Jogador',
    proTeam: 'NBA',
    team: 'NBA',
    position: '-',
    avg: 0,
    fantasyPoints: 0,
    total: 0,
    totalPoints: 0,
    photoUrl: ''
  };

  return { fromTeam, toTeam, player };
}

function normalizeTradeFromText(tx, maps, index) {
  const lines = splitTradeTextLines(tx);
  const parsed = lines
    .map(line => parseTradeLineFromRecentActivity(line, maps))
    .filter(Boolean);

  if (parsed.length < 2) return null;

  const receivingByTeam = new Map();
  for (const item of parsed) {
    const teamName = item.toTeam;
    if (!receivingByTeam.has(teamName)) receivingByTeam.set(teamName, []);
    receivingByTeam.get(teamName).push(item.player);
  }

  const sides = [...receivingByTeam.entries()].filter(([, players]) => players.length > 0);
  if (sides.length < 2) return null;

  const [a, b] = sides;
  const rawDate = getTransactionDate(tx);
  const statusText = String(tx.status || tx.executionType || tx.type || 'OFICIAL').toUpperCase();
  const official = statusText.includes('EXECUT') || statusText.includes('PROCES') || statusText.includes('COMPLETE') || statusText.includes('ACCEPT') || statusText === 'OFICIAL';

  return {
    id: String(tx.id || tx.transactionId || tx.proposalId || `${rawDate || 'trade-text'}-${index}`),
    type: 'TRADE',
    status: official ? 'OFICIAL' : statusText,
    statusText: official ? 'OFICIAL' : statusText,
    cls: official ? 'trade-approved' : 'trade-pending',
    date: rawDate || null,
    dateText: formatTradeDate(rawDate),
    teamA: a[0],
    teamADisplay: a[0],
    teamB: b[0],
    teamBDisplay: b[0],
    sideAReceives: a[1],
    sideBReceives: b[1],
    summary: `${a[0]} recebe ${a[1].map(p => p.name).join(', ')}; ${b[0]} recebe ${b[1].map(p => p.name).join(', ')}.`,
    source: 'recent-activity-text'
  };
}

function formatTradeDate(value) {
  if (!value) return 'Data ESPN';
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0 && numeric < 10000000000) return 'Data ESPN';
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data ESPN';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getTransactionDate(tx) {
  return tx.processDate || tx.proposedDate || tx.createdDate || tx.date || tx.timestamp || null;
}

function getTransactionItems(tx) {
  const possible = [
    tx.items,
    tx.transactionItems,
    tx.transactionItemsList,
    tx.playerItems,
    tx.players,
    tx.changes,
    tx.actions
  ];
  for (const list of possible) {
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
}

function getItemPlayerId(item) {
  return Number(
    item.playerId ||
    item.player?.id ||
    item.player?.playerId ||
    item.playerPoolEntry?.player?.id ||
    item.playerPoolEntry?.playerId ||
    item.id
  ) || null;
}

function getItemPlayerName(item) {
  return (
    item.playerName ||
    item.fullName ||
    item.name ||
    item.player?.fullName ||
    item.player?.name ||
    item.playerPoolEntry?.player?.fullName ||
    item.playerPoolEntry?.player?.name ||
    'Jogador'
  );
}

function getItemTeamId(item, kind) {
  const keys = kind === 'to'
    ? ['toTeamId', 'toTeam', 'destinationTeamId', 'destinationTeam', 'newTeamId', 'targetTeamId', 'teamId']
    : ['fromTeamId', 'fromTeam', 'sourceTeamId', 'sourceTeam', 'oldTeamId', 'previousTeamId'];

  for (const key of keys) {
    const value = item[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object') {
      const objectId = Number(value.id || value.teamId || value.value);
      if (Number.isFinite(objectId) && objectId > 0) return objectId;
    }
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

function looksLikeTrade(tx) {
  const typeText = String(tx.type || tx.transactionType || tx.activityType || tx.status || '').toLowerCase();
  if (typeText.includes('trade')) return true;

  const textLines = splitTradeTextLines(tx);
  if (textLines.some(line => /\btraded\b/i.test(line) && /\bto\b/i.test(line))) return true;

  const items = getTransactionItems(tx);
  const movedTeams = new Set();
  for (const item of items) {
    const fromId = getItemTeamId(item, 'from');
    const toId = getItemTeamId(item, 'to');
    if (fromId) movedTeams.add(fromId);
    if (toId) movedTeams.add(toId);
  }
  return movedTeams.size >= 2 && items.some(item => getItemPlayerId(item));
}

function normalizeTradePlayerFromItem(item, playerMap) {
  const playerId = getItemPlayerId(item);
  const known = playerId ? playerMap.get(Number(playerId)) : null;
  const name = known?.name || getItemPlayerName(item);

  return {
    id: playerId ? String(playerId) : '',
    name,
    proTeam: known?.proTeam || known?.team || 'NBA',
    team: known?.team || known?.proTeam || 'NBA',
    position: known?.position || '-',
    avg: known?.avg || known?.fantasyPoints || 0,
    fantasyPoints: known?.fantasyPoints || known?.avg || 0,
    total: known?.total || known?.totalPoints || 0,
    totalPoints: known?.totalPoints || known?.total || 0,
    photoUrl: known?.photoUrl || known?.headshotUrl || (playerId ? getEspnHeadshotUrl(playerId) : '')
  };
}

function extractTransactions(leagueData) {
  const candidates = [
    leagueData.transactions,
    leagueData.transactionLog,
    leagueData.transactionHistory,
    leagueData.activity,
    leagueData.activities
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
    if (candidate && Array.isArray(candidate.items) && candidate.items.length) return candidate.items;
    if (candidate && Array.isArray(candidate.transactions) && candidate.transactions.length) return candidate.transactions;
  }
  return [];
}

function normalizeTradeTransaction(tx, maps, index) {
  const items = getTransactionItems(tx);
  const receivingByTeam = new Map();

  for (const item of items) {
    const playerId = getItemPlayerId(item);
    const toId = getItemTeamId(item, 'to');
    const fromId = getItemTeamId(item, 'from');
    if (!playerId || !toId || (fromId && Number(fromId) === Number(toId))) continue;

    if (!receivingByTeam.has(Number(toId))) receivingByTeam.set(Number(toId), []);
    receivingByTeam.get(Number(toId)).push(normalizeTradePlayerFromItem(item, maps.playerMap));
  }

  const sides = [...receivingByTeam.entries()].filter(([, players]) => players.length > 0);
  if (sides.length < 2) return normalizeTradeFromText(tx, maps, index);

  const [a, b] = sides;
  const teamAId = Number(a[0]);
  const teamBId = Number(b[0]);
  const teamAName = maps.teamIdMap.get(teamAId) || `Time ${teamAId}`;
  const teamBName = maps.teamIdMap.get(teamBId) || `Time ${teamBId}`;
  const rawDate = getTransactionDate(tx);
  const statusText = String(tx.status || tx.executionType || 'OFICIAL').toUpperCase();
  const official = statusText.includes('EXECUT') || statusText.includes('PROCES') || statusText.includes('COMPLETE') || statusText === 'OFICIAL';

  const sideAPlayers = a[1];
  const sideBPlayers = b[1];

  return {
    id: String(tx.id || tx.transactionId || tx.proposalId || `${rawDate || 'trade'}-${index}`),
    type: 'TRADE',
    status: official ? 'OFICIAL' : statusText,
    statusText: official ? 'OFICIAL' : statusText,
    cls: official ? 'trade-approved' : 'trade-pending',
    date: rawDate || null,
    dateText: formatTradeDate(rawDate),
    teamA: teamAName,
    teamADisplay: teamAName,
    teamB: teamBName,
    teamBDisplay: teamBName,
    sideAReceives: sideAPlayers,
    sideBReceives: sideBPlayers,
    summary: `${teamAName} recebe ${sideAPlayers.map(p => p.name).join(', ')}; ${teamBName} recebe ${sideBPlayers.map(p => p.name).join(', ')}.`
  };
}

function normalizeTrades(leagueData, players) {
  const teamIdMap = getFantasyTeamIdMap(leagueData);
  const playerMap = buildPlayerInfoMap(players);
  const playerNameMap = buildPlayerNameMap(players);
  const transactions = extractTransactions(leagueData);

  return transactions
    .filter(looksLikeTrade)
    .map((tx, index) => normalizeTradeTransaction(tx, { teamIdMap, playerMap, playerNameMap }, index))
    .filter(Boolean)
    .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
    .slice(0, 30);
}

function normalizePlayers(leagueData,env={}) {
  const projectionSeason=Number(env.ESPN_SEASON_ID||2027);
  const previousSeason=Number(env.ESPN_AVG_SEASON_ID||projectionSeason-1);
  const fantasyTeamMap = getFantasyTeamMap(leagueData);
  const pool = Array.isArray(leagueData.players) ? leagueData.players : [];

  return pool
    .map(entry => {
      const player = entry.player || entry;
      if (!player || !player.id || !player.fullName) return null;

      const avg = extractFantasyAverage(player,previousSeason);
      const projection = extractFantasyProjection(player,projectionSeason);
      const total = extractFantasyTotal(player,previousSeason);
      const last30 = extractRecentAverage(player, 30, avg);
      const last15 = extractRecentAverage(player, 15, avg);
      const fantasyTeam = fantasyTeamMap.get(Number(player.id)) || 'Livre';
      const age = extractAge(player);
      const photo = extractPlayerPhoto(player);

      return {
        id: String(player.id),
        name: player.fullName,
        proTeam: NBA_TEAMS[player.proTeamId] || String(player.proTeamId || 'NBA'),
        team: NBA_TEAMS[player.proTeamId] || String(player.proTeamId || 'NBA'),
        position: getPosition(player),
        fantasyTeam,
        isKeeper: !isFreeFantasyTeamName(fantasyTeam),
        keeperStatus: !isFreeFantasyTeamName(fantasyTeam) ? 'Keeper' : 'Livre',
        age: age || null,
        birthDate: player.birthDate || player.dateOfBirth || null,
        avg2025: rounded(avg),
        avgSeasonId: previousSeason,
        espnProjection: rounded(projection),
        projectedAvg: rounded(projection),
        projectionSeasonId: projectionSeason,
        avg: rounded(avg),
        fantasyPoints: rounded(avg),
        last30Avg: rounded(last30),
        last30: rounded(last30),
        last15Avg: rounded(last15),
        last15: rounded(last15),
        total: rounded(total),
        totalPoints: rounded(total),
        headshotUrl: photo,
        photoUrl: photo,
        status: player.injuryStatus || player.status || 'Ativo',
        percentOwned: entry.ownership?.percentOwned ?? null
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.avg - a.avg);
}

async function fetchEspnLeague(env) {
  const leagueId = env.ESPN_LEAGUE_ID || '1245069102';
  const seasonId = env.ESPN_SEASON_ID || '2027';
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=mRoster&view=kona_player_info`;

  const fantasyFilter = {
    players: {
      filterStatsForTopScoringPeriodIds: {value: 1, additionalValue: ['00'+String(Number(env.ESPN_AVG_SEASON_ID||Number(seasonId)-1)),'10'+seasonId]},
      limit: 2000,
      offset: 0,
      sortAppliedStatTotal: {
        sortAsc: false,
        sortPriority: 1,
        value: '00'+String(Number(seasonId)-1)
      }
    }
  };

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 AirBall-Honestometro/1.0',
    'x-fantasy-filter': JSON.stringify(fantasyFilter)
  };

  if (env.ESPN_SWID && env.ESPN_S2) {
    headers.Cookie = `SWID=${env.ESPN_SWID}; espn_s2=${env.ESPN_S2}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ESPN respondeu ${response.status}. Verifique a liga, temporada e os secrets no Cloudflare.`);
  }

  return response.json();
}

async function getFullPlayersPayload(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/players-cache-v9-separate-projections-'+(env.ESPN_LEAGUE_ID||'1245069102')+'-'+(env.ESPN_SEASON_ID||'2027')+'-'+(env.ESPN_AVG_SEASON_ID||Number(env.ESPN_SEASON_ID||2027)-1));
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const leagueData = await fetchEspnLeague(env);
  const players = normalizePlayers(leagueData,env);

  const payload = {
    leagueId: env.ESPN_LEAGUE_ID || '1245069102',
    seasonId: env.ESPN_SEASON_ID || '2027',
    updatedAt: new Date().toISOString(),
    avgSeasonId: Number(env.ESPN_AVG_SEASON_ID||Number(env.ESPN_SEASON_ID||2027)-1),
    projectionSeasonId: Number(env.ESPN_SEASON_ID||2027),
    projectionCount: players.filter(p=>p.espnProjection!==null).length,
    count: players.length,
    players
  };

  const response = jsonResponse(payload, 200, env);
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return payload;
}

async function fetchEspnLeagueWithTrades(env) {
  const leagueId = env.ESPN_LEAGUE_ID || '1245069102';
  const seasonId = env.ESPN_SEASON_ID || '2027';
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=mRoster&view=kona_player_info&view=mTransactions2`;

  const fantasyFilter = {
    players: {
      filterStatsForTopScoringPeriodIds: {value: 1, additionalValue: ['00'+String(Number(env.ESPN_AVG_SEASON_ID||Number(seasonId)-1)),'10'+seasonId]},
      limit: 2000,
      offset: 0,
      sortAppliedStatTotal: {
        sortAsc: false,
        sortPriority: 1,
        value: '00'+String(Number(seasonId)-1)
      }
    },
    transactions: {
      limit: 100,
      offset: 0,
      sortAsc: false
    }
  };

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 AirBall-Honestometro/1.0',
    'x-fantasy-filter': JSON.stringify(fantasyFilter)
  };

  if (env.ESPN_SWID && env.ESPN_S2) {
    headers.Cookie = `SWID=${env.ESPN_SWID}; espn_s2=${env.ESPN_S2}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ESPN respondeu ${response.status}. Verifique a liga, temporada e os secrets no Cloudflare.`);
  }

  return response.json();
}

async function handleTrades(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/trades-cache-v4-season-safe');
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const leagueData = await fetchEspnLeagueWithTrades(env);
  const players = normalizePlayers(leagueData,env);
  const trades = normalizeTrades(leagueData, players);

  const payload = {
    leagueId: env.ESPN_LEAGUE_ID || '1245069102',
    seasonId: env.ESPN_SEASON_ID || '2027',
    updatedAt: new Date().toISOString(),
    count: trades.length,
    trades
  };

  const response = jsonResponse(payload, 200, env);
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handlePlayers(request, env, ctx) {
  const payload = await getFullPlayersPayload(request, env, ctx);
  const url = new URL(request.url);
  const search = url.searchParams.get('q');

  if (!search || !search.trim()) {
    return jsonResponse(payload, 200, env);
  }

  const q = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = payload.players
    .filter(p => {
      const name = String(p.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const team = String(p.proTeam || '').toLowerCase();
      const pos = String(p.position || '').toLowerCase();
      return name.includes(q) || team.includes(q) || pos.includes(q);
    })
    .sort((a, b) => {
      const an = String(a.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const bn = String(b.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return b.avg - a.avg;
    })
    .slice(0, 25);

  return jsonResponse({ ...payload, q: search, count: filtered.length, players: filtered }, 200, env);
}

async function handlePlayerPhoto(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/player-photo\/(\d+)\/?$/);
  const playerId = match ? match[1] : '';
  if (!playerId) {
    return jsonResponse({ error: 'Informe o ID do jogador. Exemplo: /player-photo/4065648' }, 400, env);
  }

  const cache = caches.default;
  const cacheKey = new Request(url.origin + `/player-photo-cache/${playerId}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const espnUrl = getEspnHeadshotUrl(playerId);
  const response = await fetch(espnUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 AirBall-Honestometro/1.0' },
    cf: { cacheTtl: 86400, cacheEverything: true }
  });

  if (!response.ok) {
    return jsonResponse({ error: `Foto não encontrada para o jogador ${playerId}` }, 404, env);
  }

  const contentType = response.headers.get('Content-Type') || 'image/png';
  const imageResponse = new Response(response.body, {
    status: 200,
    headers: {
      ...corsHeaders(env),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    }
  });

  await cache.put(cacheKey, imageResponse.clone());
  return imageResponse;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health') {
        return jsonResponse({ ok: true, service: 'airball-espn-worker',
            version: 'player-table-v9-avg25-proj2027', leagueId: env.ESPN_LEAGUE_ID || '1245069102', seasonId: env.ESPN_SEASON_ID || '2027' }, 200, env);
      }

      if (url.pathname === '/' || url.pathname === '/players') {
        return await handlePlayers(request, env, ctx);
      }

      if (url.pathname === '/trades') {
        return await handleTrades(request, env, ctx);
      }

      if (url.pathname.startsWith('/player-photo/')) {
        return await handlePlayerPhoto(request, env);
      }

      return jsonResponse({ error: 'Rota não encontrada. Use /players, /trades ou /player-photo/ID.' }, 404, env);
    } catch (error) {
      return jsonResponse({ error: error.message || 'Erro desconhecido ao buscar ESPN.' }, 500, env);
    }
  }
};
