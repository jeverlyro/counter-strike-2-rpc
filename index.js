const fs = require('fs');
const http = require('http');
const DiscordRPC = require('discord-rpc');

const CLIENT_ID = '1359905002658988209'; 
const RPC = new DiscordRPC.Client({ transport: 'ipc' });
const UPDATE_INTERVAL = 15000;

let gameState = {
  map: '',
  phase: '',
  team: '',
  health: 0,
  playerName: '', 
  score: {
    ct: 0,
    t: 0
  },
  weapons: {},
  matchStats: {
    kills: 0,
    deaths: 0,
    assists: 0
  }
};

const mapAssets = {
  'de_dust2': 'de_dust2',
  'de_inferno': 'de_inferno',
  'de_mirage': 'de_mirage',
  'de_nuke': 'de_nuke',
  'de_overpass': 'de_overpass',
  'de_vertigo': 'de_vertigo',
  'de_ancient': 'de_ancient',
  'de_anubis': 'de_anubis'
};

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

RPC.on('ready', () => {
  console.log('Discord RPC Connected');
  updateRPC();
  setInterval(updateRPC, UPDATE_INTERVAL);
});

function updateRPC() {
  if (gameState.map && (gameState.phase === 'gameover' || !gameState.phase)) {
    RPC.setActivity({
      details: 'In Lobby',
      state: `Last match: ${gameState.score.ct} : ${gameState.score.t} | ${gameState.matchStats.kills}K/${gameState.matchStats.deaths}D/${gameState.matchStats.assists}A`,
      largeImageKey: 'cs2_logo',
      largeImageText: 'Counter-Strike 2',
      smallImageKey: gameState.team.toLowerCase(),
      smallImageText: `Last Team: ${gameState.team}`,
      instance: false
    });
    return;
  }
  
  if (!gameState.map) {
    RPC.setActivity({
      details: 'In Menu',
      largeImageKey: 'cs2_logo',
      largeImageText: 'Counter-Strike 2',
      instance: false
    });
    return;
  }

  const mapName = capitalizeFirstLetter(gameState.map.split('_').pop());
  const mapAsset = mapAssets[gameState.map] || 'cs2_logo';
  const capitalizedPhase = capitalizeFirstLetter(gameState.phase);
  
  const activity = {
    details: `${gameState.playerName ? gameState.playerName + ' | ' : ''}Map: ${mapName} | ${gameState.score.ct} : ${gameState.score.t}`,
    state: `${capitalizedPhase} | ${gameState.matchStats.kills}K/${gameState.matchStats.deaths}D/${gameState.matchStats.assists}A`,
    largeImageKey: mapAsset,
    largeImageText: `Playing on ${mapName}`,
    smallImageKey: gameState.team.toLowerCase(),
    smallImageText: `Team: ${gameState.team}`,
    instance: false
  };

  console.log(`Updating RPC: ${JSON.stringify(activity)}`);
  RPC.setActivity(activity);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        updateGameState(data);
        res.writeHead(200);
        res.end('OK');
      } catch (error) {
        console.error('Error parsing data:', error);
        res.writeHead(400);
        res.end('Invalid data');
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

function updateGameState(data) {
  // Update map
  if (data.map && data.map.name) {
    gameState.map = data.map.name;
  }
  
  // Update phase
  if (data.map && data.map.phase) {
    gameState.phase = data.map.phase;
  }
  
  // Update team
  if (data.player && data.player.team) {
    gameState.team = data.player.team;
  }
  
  // Update player name
  if (data.player && data.player.name) {
    gameState.playerName = data.player.name;
  }
  
  // Update score
  if (data.map && data.map.team_ct && data.map.team_t) {
    gameState.score.ct = data.map.team_ct.score;
    gameState.score.t = data.map.team_t.score;
  }
  
  // Update match stats
  if (data.player && data.player.match_stats) {
    gameState.matchStats.kills = data.player.match_stats.kills;
    gameState.matchStats.deaths = data.player.match_stats.deaths;
    gameState.matchStats.assists = data.player.match_stats.assists;
  }
  
  console.log('Game state updated:', gameState);
}

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`CS2 GSI server listening on port ${PORT}`);
});

// Connect to Discord
RPC.login({ clientId: CLIENT_ID }).catch(console.error);

process.on('SIGINT', () => {
  RPC.destroy();
  process.exit(0);
});