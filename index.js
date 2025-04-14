// CS2 Discord RPC - Main script
const fs = require('fs');
const http = require('http');
const DiscordRPC = require('discord-rpc');

// Discord application settings
const CLIENT_ID = '1359905002658988209'; // Replace with your Discord Application Client ID
const RPC = new DiscordRPC.Client({ transport: 'ipc' });
const UPDATE_INTERVAL = 15000; // Update interval in ms

// Game state variables
let gameState = {
  map: '',
  phase: '',
  team: '',
  health: 0,
  playerName: '',  // Added player name field
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

// Map assets for Discord
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

// Helper function to capitalize first letter
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

// HTTP server to receive game state updates
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

// Process game state data
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
  
  // Update health
  if (data.player && data.player.state && data.player.state.health !== undefined) {
    gameState.health = data.player.state.health;
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
  
  // Update weapons
  if (data.player && data.player.weapons) {
    gameState.weapons = data.player.weapons;
  }
  
  console.log('Game state updated:', gameState);
}

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`CS2 GSI server listening on port ${PORT}`);
});

// Connect to Discord
RPC.login({ clientId: CLIENT_ID }).catch(console.error);

// Ensure proper cleanup
process.on('SIGINT', () => {
  RPC.destroy();
  process.exit(0);
});