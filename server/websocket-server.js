const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

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
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;

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
    this.endReason = null; // 'early_end' | 'showdown' | null
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
    console.log('Starting new round...');
    // Remove any players who have exited/inactive before starting a new round
    for (const [playerId, player] of this.players.entries()) {
      if (player.isActive === false) {
        this.players.delete(playerId);
      }
    }

    // If we do not have enough players after cleanup, wait for more players
    if (this.players.size < MIN_PLAYERS) {
      this.gameState = 'waiting';
      this.communityCards = [];
      this.pot = 0;
      this.currentBet = 0;
      this.round = 'preflop';
      this.dealerIndex = 0;
      this.currentPlayerIndex = 0;
      io.to(this.roomId).emit('gameState', this.getGameState());
      return;
    }

    this.initializeDeck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.round = 'preflop';
    this.gameState = 'playing';
    this.endReason = null;
    
    // Reset player states
    this.players.forEach(player => {
      player.hand = [];
      player.bet = 0;
      player.folded = false;
      player.allIn = false;
    });

    this.dealCards();
    this.postBlinds();
    
    // Update game state for all players
    io.to(this.roomId).emit('gameState', this.getGameState());
    console.log('New round started, game state updated');
  }

  restartGame() {
    console.log('Restarting game after all players folded...');
    this.gameState = 'restarting';
    io.to(this.roomId).emit('gameState', this.getGameState());
    
    // Wait a moment then start new round
    setTimeout(() => {
      this.startNewRound();
    }, 1000);
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

  addPlayer(playerId, playerName) {
    if (this.players.size >= MAX_PLAYERS) {
      return false;
    }

    const player = {
      id: playerId,
      name: playerName,
      chips: 1000,
      bet: 0,
      hand: [],
      folded: false,
      allIn: false,
      isActive: true
    };

    this.players.set(playerId, player);
    console.log(`${playerName} added to room ${this.roomId}`);
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    console.log(`Player ${playerId} removed from room ${this.roomId}`);
  }

  moveToNextPlayer() {
    const playerArray = Array.from(this.players.values());
    
    // Check if all players have folded FIRST - before trying to move to next player
    if (this.haveAllPlayersFolded()) {
      console.log('All players have folded - restarting the game');
      // Return pot to players proportionally to their bets
      this.returnPotToPlayers();
      this.restartGame();
      return;
    }
    
    let nextIndex = (this.currentPlayerIndex + 1) % playerArray.length;
    
    // Skip folded players
    while (playerArray[nextIndex] && playerArray[nextIndex].folded && nextIndex !== this.currentPlayerIndex) {
      nextIndex = (nextIndex + 1) % playerArray.length;
    }
    
    this.currentPlayerIndex = nextIndex;
    const nextPlayer = playerArray[nextIndex];
    console.log(`Moved to next player: ${nextPlayer?.name}`);
    
    // Check if game should end early due to all players folding except one
    if (this.shouldEndGameEarly()) {
      console.log('Game ending early - only one player remains active');
      this.determineWinner();
      return;
    }
    
    // Check if round is complete
    if (this.isRoundComplete()) {
      console.log('Round complete, moving to next round');
      this.nextRound();
    } else {
      console.log(`Next player: ${nextPlayer?.name}`);
    }
  }

  isRoundComplete() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    // If no active players (all folded), round is not complete - game should restart
    if (activePlayers.length === 0) return false;
    
    if (activePlayers.length <= 1) return true;
    
    // Check if all active players have bet the same amount
    const firstBet = activePlayers[0].bet;
    return activePlayers.every(p => p.bet === firstBet || p.allIn);
  }

  shouldEndGameEarly() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    // If only one player remains active, end the game immediately
    return activePlayers.length <= 1;
  }

  haveAllPlayersFolded() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    console.log(`Checking if all players folded: ${activePlayers.length} active players out of ${playerArray.length} total`);
    playerArray.forEach(player => {
      console.log(`${player.name}: folded=${player.folded}, allIn=${player.allIn}`);
    });
    
    // If all players have folded (no active players), restart the game
    return activePlayers.length === 0;
  }

  returnPotToPlayers() {
    const playerArray = Array.from(this.players.values());
    const totalBets = playerArray.reduce((sum, player) => sum + player.bet, 0);
    
    if (totalBets > 0) {
      // Return each player's bet to them
      playerArray.forEach(player => {
        if (player.bet > 0) {
          const betAmount = player.bet;
          player.chips += betAmount;
          player.bet = 0;
          console.log(`Returned $${betAmount} to ${player.name}`);
        }
      });
    }
    
    this.pot = 0;
    console.log('Pot returned to players - all players folded');
    
    // Update game state after returning pot
    io.to(this.roomId).emit('gameState', this.getGameState());
  }

  nextRound() {
    // Check if all players have folded - restart the game
    if (this.haveAllPlayersFolded()) {
      console.log('All players have folded in nextRound - restarting the game');
      this.returnPotToPlayers();
      this.restartGame();
      return;
    }
    
    // Check if game should end early due to all players folding except one
    if (this.shouldEndGameEarly()) {
      console.log('Game ending early - only one player remains active');
      this.determineWinner();
      return;
    }

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
  }

  determineWinner() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
      // Only one player remains - they win by default
      const winner = activePlayers[0];
      winner.chips += this.pot;
      this.pot = 0;
      console.log(`${winner.name} wins by default - all other players folded`);
      this.endReason = 'early_end';
      this.gameState = 'finished';
      io.to(this.roomId).emit('gameState', this.getGameState());
      return;
    } else {
      // Multiple players remain - determine winner by hand strength
      // Simple winner determination - first non-folded player wins
      const winner = playerArray.find(p => !p.folded);
      
      if (winner) {
        winner.chips += this.pot;
        this.pot = 0;
      }
      this.endReason = 'showdown';
      this.gameState = 'finished';
      io.to(this.roomId).emit('gameState', this.getGameState());
      return;
    }
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
      dealerIndex: this.dealerIndex,
      endReason: this.endReason
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
      
      if (game.players.size >= MIN_PLAYERS) {
        game.gameState = 'playing';
        game.startNewRound();
        io.to(socket.roomId).emit('gameState', game.getGameState());
        io.to(socket.roomId).emit('gameStarted');
        
      } else {
        console.log(`Not enough players to start game. Current: ${game.players.size}, Required: ${MIN_PLAYERS}`);
      }
    }
  });

  socket.on('bet', ({ amount }) => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded) {
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
      if (player && !player.folded) {
        console.log(`${player.name} is folding`);
        player.folded = true;
        io.to(socket.roomId).emit('gameState', game.getGameState());
        
        // Check if all players have folded after this fold
        if (game.haveAllPlayersFolded()) {
          console.log('All players have folded after human fold - restarting game');
          game.returnPotToPlayers();
          game.restartGame();
        } else {
          game.moveToNextPlayer();
        }
      }
    }
  });

  socket.on('call', () => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded) {
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
      if (player && !player.folded) {
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

  socket.on('forceRestart', () => {
    const game = games.get(socket.roomId);
    if (game) {
      console.log('Force restart triggered by player');
      game.returnPotToPlayers();
      game.restartGame();
    }
  });



  socket.on('exitGame', () => {
    const game = games.get(socket.roomId);
    if (game) {
      const player = game.players.get(socket.id);
      if (player) {
        console.log(`${player.name} is exiting the game`);

        if (game.gameState === 'playing' && player.bet > 0) {
          // Mark as folded/inactive for the rest of the hand
          player.folded = true;
          player.isActive = false;
          io.to(socket.roomId).emit('gameState', game.getGameState());

          // Advance turn if it was their turn
          if (game.shouldEndGameEarly()) {
            game.determineWinner();
          } else {
            game.moveToNextPlayer();
          }
        } else {
          // Safe to remove immediately (not mid-hand with money in pot)
          game.removePlayer(socket.id);
          
          if (game.gameState === 'playing') {
            if (game.shouldEndGameEarly()) {
              game.determineWinner();
            } else if (game.haveAllPlayersFolded()) {
              game.returnPotToPlayers();
              game.restartGame();
            } else {
              game.moveToNextPlayer();
              io.to(socket.roomId).emit('gameState', game.getGameState());
            }
          } else {
            io.to(socket.roomId).emit('gameState', game.getGameState());
          }

          io.to(socket.roomId).emit('playerLeft', { playerId: socket.id, playerName: player.name });

          if (game.players.size === 0) {
            games.delete(socket.roomId);
            console.log(`Game room ${socket.roomId} deleted - no players remaining`);
          }
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomId) {
      const game = games.get(socket.roomId);
      if (game) {
        const player = game.players.get(socket.id);
        if (player) {
          if (game.gameState === 'playing' && (player.bet > 0)) {
            // Treat as folded/inactive for remainder of the hand
            player.folded = true;
            player.isActive = false;
            io.to(socket.roomId).emit('gameState', game.getGameState());

            // If everyone else folded, handle restart; else advance turn
            if (game.shouldEndGameEarly()) {
              game.determineWinner();
            } else if (game.haveAllPlayersFolded()) {
              game.returnPotToPlayers();
              game.restartGame();
            } else {
              game.moveToNextPlayer();
            }
          } else {
            game.removePlayer(socket.id);
            
            if (game.gameState === 'playing') {
              if (game.shouldEndGameEarly()) {
                game.determineWinner();
              } else if (game.haveAllPlayersFolded()) {
                game.returnPotToPlayers();
                game.restartGame();
              } else {
                game.moveToNextPlayer();
                io.to(socket.roomId).emit('gameState', game.getGameState());
              }
            } else {
              io.to(socket.roomId).emit('gameState', game.getGameState());
            }

            if (game.players.size === 0) {
              games.delete(socket.roomId);
            } else {
              io.to(socket.roomId).emit('playerLeft', { playerId: socket.id });
            }
          }
        }
      }
    }
  });

  socket.on('continueGame', () => {
    const game = games.get(socket.roomId);
    if (!game) return;
    
    if (game.players.size >= MIN_PLAYERS) {
      game.startNewRound();
      io.to(socket.roomId).emit('gameState', game.getGameState());
    } else {
      // Not enough players to continue
      game.gameState = 'waiting';
      io.to(socket.roomId).emit('gameState', game.getGameState());
    }
  });
});

console.log('WebSocket server running on port 3001'); 