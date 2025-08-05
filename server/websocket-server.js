const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Game state management
const games = new Map();
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

// AI Player names
const AI_NAMES = [
  'Ace', 'Bluff', 'Chip', 'Dealer', 'Flush', 'Royal', 'Straight', 'Pocket', 'River', 'Turn'
];

// Card deck and game logic
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class PokerGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.dealerIndex = 0;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.round = 'preflop'; // preflop, flop, turn, river, showdown
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.aiPlayers = new Set(); // Track AI players
    this.initializeDeck();
  }

  initializeDeck() {
    this.deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.deck.push({ suit, rank });
      }
    }
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCards() {
    this.players.forEach((player, playerId) => {
      if (player.isActive) {
        player.hand = [this.deck.pop(), this.deck.pop()];
      }
    });
  }

  dealCommunityCards(count) {
    for (let i = 0; i < count; i++) {
      this.communityCards.push(this.deck.pop());
    }
  }

  startNewRound() {
    this.initializeDeck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.round = 'preflop';
    
    // Reset player states
    this.players.forEach(player => {
      player.hand = [];
      player.bet = 0;
      player.folded = false;
      player.allIn = false;
    });

    this.dealCards();
    this.postBlinds();
  }

  postBlinds() {
    const playerArray = Array.from(this.players.values());
    const smallBlindIndex = (this.dealerIndex + 1) % playerArray.length;
    const bigBlindIndex = (this.dealerIndex + 2) % playerArray.length;

    if (playerArray[smallBlindIndex]) {
      playerArray[smallBlindIndex].bet = this.smallBlind;
      playerArray[smallBlindIndex].chips -= this.smallBlind;
      this.pot += this.smallBlind;
    }

    if (playerArray[bigBlindIndex]) {
      playerArray[bigBlindIndex].bet = this.bigBlind;
      playerArray[bigBlindIndex].chips -= this.bigBlind;
      this.pot += this.bigBlind;
      this.currentBet = this.bigBlind;
    }
  }

  addPlayer(playerId, playerName, isAI = false) {
    if (this.players.size >= MAX_PLAYERS) {
      return false;
    }

    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      chips: 1000,
      bet: 0,
      hand: [],
      folded: false,
      allIn: false,
      isActive: true,
      isAI: isAI
    });

    if (isAI) {
      this.aiPlayers.add(playerId);
    }

    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.aiPlayers.delete(playerId);
  }

  // AI decision making logic
  makeAIDecision(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.isAI || player.folded || player.allIn) {
      return null;
    }

    const playerArray = Array.from(this.players.values());
    const playerIndex = playerArray.findIndex(p => p.id === playerId);
    
    // Simple AI strategy based on hand strength and position
    const handStrength = this.evaluateHandStrength(player);
    const position = this.getPosition(playerIndex);
    const potOdds = this.calculatePotOdds(player);
    
    // Random factor for unpredictability
    const randomFactor = Math.random();
    
    // Decision logic
    if (handStrength > 0.8 || (handStrength > 0.6 && position === 'late')) {
      // Strong hand - raise or call
      if (randomFactor > 0.3) {
        const raiseAmount = Math.min(player.chips, this.currentBet * 2);
        return { action: 'raise', amount: raiseAmount };
      } else {
        return { action: 'call' };
      }
    } else if (handStrength > 0.4 || potOdds > 0.3) {
      // Medium hand - call if pot odds are good
      if (randomFactor > 0.5) {
        return { action: 'call' };
      } else {
        return { action: 'fold' };
      }
    } else {
      // Weak hand - fold most of the time
      if (randomFactor > 0.8) {
        return { action: 'call' };
      } else {
        return { action: 'fold' };
      }
    }
  }

  evaluateHandStrength(player) {
    if (!player.hand || player.hand.length < 2) return 0;
    
    // Simple hand evaluation based on card ranks
    const ranks = player.hand.map(card => RANKS.indexOf(card.rank));
    const isPair = ranks[0] === ranks[1];
    const isHighCard = Math.max(...ranks) >= 10; // J, Q, K, A
    const isSuited = player.hand[0].suit === player.hand[1].suit;
    
    let strength = 0;
    
    if (isPair) {
      strength = 0.7 + (ranks[0] / 13) * 0.3; // Higher pairs are stronger
    } else if (isHighCard && isSuited) {
      strength = 0.6;
    } else if (isHighCard) {
      strength = 0.5;
    } else if (isSuited) {
      strength = 0.4;
    } else {
      strength = 0.2;
    }
    
    return strength;
  }

  getPosition(playerIndex) {
    const playerArray = Array.from(this.players.values());
    const totalPlayers = playerArray.length;
    
    if (playerIndex <= Math.floor(totalPlayers / 3)) {
      return 'early';
    } else if (playerIndex <= Math.floor(2 * totalPlayers / 3)) {
      return 'middle';
    } else {
      return 'late';
    }
  }

  calculatePotOdds(player) {
    const callAmount = this.currentBet - player.bet;
    if (callAmount <= 0) return 1;
    
    return callAmount / (this.pot + callAmount);
  }

  // Add AI player when room is empty or only has one human player
  addAIPlayerIfNeeded() {
    const playerArray = Array.from(this.players.values());
    const humanPlayers = playerArray.filter(p => !p.isAI);
    
    // Add AI player if there are no players or only one human player
    if (this.players.size === 0 || humanPlayers.length === 1) {
      const aiName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
      const aiId = `ai_${uuidv4()}`;
      this.addPlayer(aiId, aiName, true);
      console.log(`AI player ${aiName} added to room ${this.roomId}`);
      return aiId;
    }
    return null;
  }

  // Process AI turns
  processAITurn() {
    const playerArray = Array.from(this.players.values());
    const currentPlayer = playerArray[this.currentPlayerIndex];
    
    console.log(`Processing AI turn for player: ${currentPlayer?.name}, isAI: ${currentPlayer?.isAI}, folded: ${currentPlayer?.folded}, allIn: ${currentPlayer?.allIn}`);
    
    if (currentPlayer && currentPlayer.isAI && !currentPlayer.folded && !currentPlayer.allIn) {
      const decision = this.makeAIDecision(currentPlayer.id);
      console.log(`AI decision for ${currentPlayer.name}:`, decision);
      
      if (decision) {
        setTimeout(() => {
          console.log(`Executing AI action for ${currentPlayer.name}:`, decision);
          this.executeAIAction(currentPlayer.id, decision);
        }, 1000 + Math.random() * 2000); // Random delay for realism
      }
    }
  }

  executeAIAction(playerId, decision) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (decision.action) {
      case 'fold':
        player.folded = true;
        break;
      case 'call':
        const callAmount = this.currentBet - player.bet;
        const actualCall = Math.min(callAmount, player.chips);
        player.chips -= actualCall;
        player.bet += actualCall;
        this.pot += actualCall;
        if (player.chips === 0) player.allIn = true;
        break;
      case 'raise':
        const raiseAmount = Math.min(decision.amount, player.chips);
        player.chips -= raiseAmount;
        player.bet += raiseAmount;
        this.pot += raiseAmount;
        this.currentBet = player.bet;
        if (player.chips === 0) player.allIn = true;
        break;
    }

    io.to(this.roomId).emit('gameState', this.getGameState());
    
    // Move to next player
    this.moveToNextPlayer();
  }

  moveToNextPlayer() {
    const playerArray = Array.from(this.players.values());
    let nextIndex = (this.currentPlayerIndex + 1) % playerArray.length;
    
    // Skip folded players
    while (playerArray[nextIndex] && playerArray[nextIndex].folded && nextIndex !== this.currentPlayerIndex) {
      nextIndex = (nextIndex + 1) % playerArray.length;
    }
    
    this.currentPlayerIndex = nextIndex;
    const nextPlayer = playerArray[nextIndex];
    console.log(`Moved to next player: ${nextPlayer?.name} (isAI: ${nextPlayer?.isAI})`);
    
    // Check if round is complete
    if (this.isRoundComplete()) {
      console.log('Round complete, moving to next round');
      this.nextRound();
    } else {
      // Process AI turn if next player is AI
      if (nextPlayer && nextPlayer.isAI) {
        console.log(`Next player is AI (${nextPlayer.name}), processing AI turn`);
        this.processAITurn();
      }
    }
  }

  isRoundComplete() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    if (activePlayers.length <= 1) return true;
    
    // Check if all active players have bet the same amount
    const firstBet = activePlayers[0].bet;
    return activePlayers.every(p => p.bet === firstBet || p.allIn);
  }

  nextRound() {
    switch (this.round) {
      case 'preflop':
        this.round = 'flop';
        this.dealCommunityCards(3);
        break;
      case 'flop':
        this.round = 'turn';
        this.dealCommunityCards(1);
        break;
      case 'turn':
        this.round = 'river';
        this.dealCommunityCards(1);
        break;
      case 'river':
        this.round = 'showdown';
        this.determineWinner();
        return;
    }
    
    // Reset bets for new round
    this.players.forEach(player => {
      player.bet = 0;
    });
    this.currentBet = 0;
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.size;
    
    io.to(this.roomId).emit('gameState', this.getGameState());
    
    // Process AI turn if current player is AI
    const playerArray = Array.from(this.players.values());
    const currentPlayer = playerArray[this.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isAI) {
      this.processAITurn();
    }
  }

  determineWinner() {
    // Simple winner determination - first non-folded player wins
    const playerArray = Array.from(this.players.values());
    const winner = playerArray.find(p => !p.folded);
    
    if (winner) {
      winner.chips += this.pot;
      this.pot = 0;
    }
    
    // Reset for next round
    setTimeout(() => {
      this.startNewRound();
      io.to(this.roomId).emit('gameState', this.getGameState());
    }, 3000);
  }

  getGameState() {
    return {
      roomId: this.roomId,
      players: Array.from(this.players.values()),
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      round: this.round,
      gameState: this.gameState,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex
    };
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', ({ roomId, playerName }) => {
    let game = games.get(roomId);
    
    if (!game) {
      game = new PokerGame(roomId);
      games.set(roomId, game);
    }

    if (game.addPlayer(socket.id, playerName)) {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerName = playerName;
      
      io.to(roomId).emit('gameState', game.getGameState());
      io.to(roomId).emit('playerJoined', { playerId: socket.id, playerName });
      
      console.log(`${playerName} joined room ${roomId}`);
    } else {
      socket.emit('error', { message: 'Room is full or invalid' });
    }
  });

  socket.on('startGame', () => {
    const game = games.get(socket.roomId);
    if (game) {
      // Add AI player if only one human player
      const playerArray = Array.from(game.players.values());
      const humanPlayers = playerArray.filter(p => !p.isAI);
      
      if (humanPlayers.length === 1) {
        game.addAIPlayerIfNeeded();
        // Update playerArray after adding AI
        const updatedPlayerArray = Array.from(game.players.values());
        console.log(`Game now has ${updatedPlayerArray.length} players (${humanPlayers.length} human + ${updatedPlayerArray.length - humanPlayers.length} AI)`);
      }
      
      if (game.players.size >= MIN_PLAYERS) {
        game.gameState = 'playing';
        game.startNewRound();
        io.to(socket.roomId).emit('gameState', game.getGameState());
        io.to(socket.roomId).emit('gameStarted');
        
        // Process AI turn if first player is AI
        const finalPlayerArray = Array.from(game.players.values());
        const firstPlayer = finalPlayerArray[game.currentPlayerIndex];
        if (firstPlayer && firstPlayer.isAI) {
          console.log(`First player is AI (${firstPlayer.name}), processing AI turn`);
          game.processAITurn();
        }
      } else {
        console.log(`Not enough players to start game. Current: ${game.players.size}, Required: ${MIN_PLAYERS}`);
      }
    }
  });

  socket.on('bet', ({ amount }) => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded && !player.isAI) {
        const actualBet = Math.min(amount, player.chips);
        player.chips -= actualBet;
        player.bet += actualBet;
        game.pot += actualBet;
        
        if (player.chips === 0) {
          player.allIn = true;
        }
        
        io.to(socket.roomId).emit('gameState', game.getGameState());
        game.moveToNextPlayer();
      }
    }
  });

  socket.on('fold', () => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.isAI) {
        player.folded = true;
        io.to(socket.roomId).emit('gameState', game.getGameState());
        game.moveToNextPlayer();
      }
    }
  });

  socket.on('call', () => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded && !player.isAI) {
        const callAmount = game.currentBet - player.bet;
        const actualCall = Math.min(callAmount, player.chips);
        player.chips -= actualCall;
        player.bet += actualCall;
        game.pot += actualCall;
        
        if (player.chips === 0) {
          player.allIn = true;
        }
        
        io.to(socket.roomId).emit('gameState', game.getGameState());
        game.moveToNextPlayer();
      }
    }
  });

  socket.on('raise', ({ amount }) => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded && !player.isAI) {
        const raiseAmount = Math.min(amount, player.chips);
        player.chips -= raiseAmount;
        player.bet += raiseAmount;
        game.pot += raiseAmount;
        game.currentBet = player.bet;
        
        if (player.chips === 0) {
          player.allIn = true;
        }
        
        io.to(socket.roomId).emit('gameState', game.getGameState());
        game.moveToNextPlayer();
      }
    }
  });

  socket.on('nextRound', () => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      game.nextRound();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomId) {
      const game = games.get(socket.roomId);
      if (game) {
        game.removePlayer(socket.id);
        
        if (game.players.size === 0) {
          games.delete(socket.roomId);
        } else {
          // Add AI player if only AI players remain
          const remainingPlayers = Array.from(game.players.values());
          const hasHumanPlayer = remainingPlayers.some(p => !p.isAI);
          
          if (!hasHumanPlayer) {
            // Remove all AI players and add one new AI player
            remainingPlayers.forEach(p => game.removePlayer(p.id));
            game.addAIPlayerIfNeeded();
          }
          
          io.to(socket.roomId).emit('gameState', game.getGameState());
          io.to(socket.roomId).emit('playerLeft', { playerId: socket.id });
        }
      }
    }
  });
});

console.log('WebSocket server running on port 3001'); 