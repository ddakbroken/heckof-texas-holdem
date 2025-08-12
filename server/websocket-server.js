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
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Hand rankings
const HAND_RANKINGS = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

class PokerGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = []; // Array of side pots for all-in situations
    this.currentBet = 0;
    this.dealerIndex = 0;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.round = 'preflop'; // preflop, flop, turn, river, showdown
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.endReason = null; // 'early_end' | 'showdown' | null
    this.roomCreator = null;
    this.lastRaiserIndex = -1;
    this.roundStartIndex = 0;
    this.showAllCards = false;
    this.roundStartChips = new Map();
    this.blindsPosted = false;
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

  postBlinds() {
    const playerArray = Array.from(this.players.values());
    const smallBlindIndex = (this.dealerIndex + 1) % playerArray.length;
    const bigBlindIndex = (this.dealerIndex + 2) % playerArray.length;

    // Post small blind
    if (playerArray[smallBlindIndex]) {
      const smallBlindAmount = Math.min(this.smallBlind, playerArray[smallBlindIndex].chips);
      playerArray[smallBlindIndex].bet = smallBlindAmount;
      playerArray[smallBlindIndex].chips -= smallBlindAmount;
      this.pot += smallBlindAmount;
      
      if (playerArray[smallBlindIndex].chips === 0) {
        playerArray[smallBlindIndex].allIn = true;
      }
    }

    // Post big blind
    if (playerArray[bigBlindIndex]) {
      const bigBlindAmount = Math.min(this.bigBlind, playerArray[bigBlindIndex].chips);
      playerArray[bigBlindIndex].bet = bigBlindAmount;
      playerArray[bigBlindIndex].chips -= bigBlindAmount;
      this.pot += bigBlindAmount;
      this.currentBet = bigBlindAmount;
      
      if (playerArray[bigBlindIndex].chips === 0) {
        playerArray[bigBlindIndex].allIn = true;
      }
    }

    // Set first player to act (after big blind in preflop)
    if (playerArray.length === 2) {
      // Heads-up: dealer acts first after big blind
      this.currentPlayerIndex = this.dealerIndex;
    } else {
      // More than 2 players: first player after big blind
      this.currentPlayerIndex = (bigBlindIndex + 1) % playerArray.length;
    }

    // Skip folded players
    while (playerArray[this.currentPlayerIndex] && playerArray[this.currentPlayerIndex].folded && this.currentPlayerIndex !== bigBlindIndex) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % playerArray.length;
    }

    this.roundStartIndex = this.currentPlayerIndex;
    this.blindsPosted = true;
  }

  startNewRound() {
    console.log('Starting new round...');
    
    // Remove inactive players
    for (const [playerId, player] of this.players.entries()) {
      if (player.isActive === false) {
        this.players.delete(playerId);
      }
    }

    if (this.players.size < MIN_PLAYERS) {
      this.gameState = 'waiting';
      this.communityCards = [];
      this.pot = 0;
      this.sidePots = [];
      this.currentBet = 0;
      this.round = 'preflop';
      this.dealerIndex = 0;
      this.currentPlayerIndex = 0;
      this.blindsPosted = false;
      io.to(this.roomId).emit('gameState', this.getGameState());
      return;
    }

    this.initializeDeck();
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.round = 'preflop';
    this.gameState = 'playing';
    this.endReason = null;
    this.blindsPosted = false;
    
    // Rotate dealer
    const playerArray = Array.from(this.players.values());
    this.dealerIndex = (this.dealerIndex + 1) % playerArray.length;
    
    // Reset player states
    this.players.forEach(player => {
      player.hand = [];
      player.bet = 0;
      player.folded = false;
      player.allIn = false;
      player.startingChips = player.chips;
    });

    this.dealCards();
    this.postBlinds();
    
    io.to(this.roomId).emit('gameState', this.getGameState());
    console.log('New round started with blinds posted');
  }

  restartGame() {
    console.log('Restarting game after all players folded...');
    this.gameState = 'restarting';
    io.to(this.roomId).emit('gameState', this.getGameState());
    
    setTimeout(() => {
      this.startNewRound();
    }, 1000);
  }

  addPlayer(playerId, playerName) {
    if (this.players.size >= MAX_PLAYERS) {
      return false;
    }

    const player = {
      id: playerId,
      name: playerName,
      chips: 1000,
      startingChips: 1000,
      bet: 0,
      hand: [],
      folded: false,
      allIn: false,
      isActive: true
    };

    this.players.set(playerId, player);
    
    if (this.players.size === 1) {
      this.roomCreator = playerId;
    }
    
    console.log(`${playerName} added to room ${this.roomId}`);
    return true;
  }

  removePlayer(playerId) {
    if (this.roomCreator === playerId && this.players.size > 1) {
      const remainingPlayers = Array.from(this.players.keys()).filter(id => id !== playerId);
      if (remainingPlayers.length > 0) {
        this.roomCreator = remainingPlayers[0];
        console.log(`Room creator left. New creator assigned: ${this.roomCreator}`);
      }
    }
    
    this.players.delete(playerId);
    console.log(`Player ${playerId} removed from room ${this.roomId}`);
  }

  moveToNextPlayer() {
    const playerArray = Array.from(this.players.values());
    
    if (this.haveAllPlayersFolded()) {
      console.log('All players have folded - restarting the game');
      this.returnPotToPlayers();
      this.restartGame();
      return;
    }
    
    let nextIndex = (this.currentPlayerIndex + 1) % playerArray.length;
    let attempts = 0;
    const maxAttempts = playerArray.length;
    
    while (playerArray[nextIndex] && playerArray[nextIndex].folded && nextIndex !== this.currentPlayerIndex && attempts < maxAttempts) {
      nextIndex = (nextIndex + 1) % playerArray.length;
      attempts++;
    }
    
    if (attempts >= maxAttempts || playerArray[nextIndex]?.folded) {
      console.log('All players have folded - restarting the game');
      this.returnPotToPlayers();
      this.restartGame();
      return;
    }
    
    this.currentPlayerIndex = nextIndex;
    const nextPlayer = playerArray[nextIndex];
    console.log(`Moved to next player: ${nextPlayer?.name}`);
    
    if (this.shouldEndGameEarly()) {
      console.log('Game ending early - only one player remains active');
      this.determineWinner();
      return;
    }
    
    if (this.isRoundComplete()) {
      console.log('Round complete, moving to next round');
      this.nextRound();
    } else {
      console.log(`Next player: ${nextPlayer?.name}`);
      io.to(this.roomId).emit('gameState', this.getGameState());
    }
  }

  isRoundComplete() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    if (activePlayers.length === 0) return false;
    if (activePlayers.length <= 1) return true;
    
    // Check if all active players have bet the same amount
    const firstBet = activePlayers[0].bet;
    const allBetsEqual = activePlayers.every(p => p.bet === firstBet || p.allIn);
    
    if (!allBetsEqual) return false;
    
    if (this.lastRaiserIndex === -1) {
      return this.currentPlayerIndex === this.roundStartIndex;
    }
    
    return this.currentPlayerIndex === this.lastRaiserIndex;
  }

  shouldEndGameEarly() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    return activePlayers.length <= 1;
  }

  haveAllPlayersFolded() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    return activePlayers.length === 0;
  }

  returnPotToPlayers() {
    const playerArray = Array.from(this.players.values());
    const totalBets = playerArray.reduce((sum, player) => sum + player.bet, 0);
    
    if (totalBets > 0) {
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
    this.sidePots = [];
    console.log('Pot returned to players - all players folded');
    io.to(this.roomId).emit('gameState', this.getGameState());
  }

  nextRound() {
    if (this.haveAllPlayersFolded()) {
      console.log('All players have folded in nextRound - restarting the game');
      this.returnPotToPlayers();
      this.restartGame();
      return;
    }
    
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
    
    // Set first player to act (left of dealer after preflop)
    const playerArray = Array.from(this.players.values());
    this.currentPlayerIndex = (this.dealerIndex + 1) % playerArray.length;
    
    // Skip folded players
    while (playerArray[this.currentPlayerIndex] && playerArray[this.currentPlayerIndex].folded && this.currentPlayerIndex !== this.dealerIndex) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % playerArray.length;
    }
    
    this.roundStartIndex = this.currentPlayerIndex;
    this.lastRaiserIndex = -1;
    
    console.log(`New round ${this.round} started. First player to act: ${playerArray[this.currentPlayerIndex]?.name}`);
    io.to(this.roomId).emit('gameState', this.getGameState());
  }

  // Hand evaluation functions
  evaluateHand(playerHand, communityCards) {
    const allCards = [...playerHand, ...communityCards];
    const combinations = this.getCombinations(allCards, 5);
    let bestHand = null;
    let bestRank = 0;

    for (const combination of combinations) {
      const handRank = this.getHandRank(combination);
      if (handRank > bestRank) {
        bestRank = handRank;
        bestHand = combination;
      }
    }

    return { rank: bestRank, hand: bestHand };
  }

  getCombinations(cards, r) {
    if (r === 0) return [[]];
    if (cards.length === 0) return [];
    
    const combinations = [];
    for (let i = 0; i <= cards.length - r; i++) {
      const head = cards[i];
      const tailCombinations = this.getCombinations(cards.slice(i + 1), r - 1);
      for (const tailCombination of tailCombinations) {
        combinations.push([head, ...tailCombination]);
      }
    }
    return combinations;
  }

  getHandRank(cards) {
    const sortedCards = cards.sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const ranks = sortedCards.map(card => card.rank);
    const suits = sortedCards.map(card => card.suit);
    
    // Check for flush
    const isFlush = suits.every(suit => suit === suits[0]);
    
    // Check for straight
    const isStraight = this.isStraight(ranks);
    
    // Count rank frequencies
    const rankCounts = {};
    ranks.forEach(rank => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const uniqueRanks = Object.keys(rankCounts);
    
    // Royal Flush
    if (isFlush && isStraight && ranks[0] === 'A' && ranks[4] === '10') {
      return HAND_RANKINGS.ROYAL_FLUSH;
    }
    
    // Straight Flush
    if (isFlush && isStraight) {
      return HAND_RANKINGS.STRAIGHT_FLUSH;
    }
    
    // Four of a Kind
    if (counts[0] === 4) {
      return HAND_RANKINGS.FOUR_OF_A_KIND;
    }
    
    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
      return HAND_RANKINGS.FULL_HOUSE;
    }
    
    // Flush
    if (isFlush) {
      return HAND_RANKINGS.FLUSH;
    }
    
    // Straight
    if (isStraight) {
      return HAND_RANKINGS.STRAIGHT;
    }
    
    // Three of a Kind
    if (counts[0] === 3) {
      return HAND_RANKINGS.THREE_OF_A_KIND;
    }
    
    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
      return HAND_RANKINGS.TWO_PAIR;
    }
    
    // Pair
    if (counts[0] === 2) {
      return HAND_RANKINGS.PAIR;
    }
    
    // High Card
    return HAND_RANKINGS.HIGH_CARD;
  }

  isStraight(ranks) {
    const values = ranks.map(rank => RANK_VALUES[rank]).sort((a, b) => a - b);
    
    // Check for regular straight
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i + 1] - values[i] !== 1) {
        return false;
      }
    }
    return true;
  }

  getHandName(rank) {
    const names = {
      [HAND_RANKINGS.HIGH_CARD]: 'High Card',
      [HAND_RANKINGS.PAIR]: 'Pair',
      [HAND_RANKINGS.TWO_PAIR]: 'Two Pair',
      [HAND_RANKINGS.THREE_OF_A_KIND]: 'Three of a Kind',
      [HAND_RANKINGS.STRAIGHT]: 'Straight',
      [HAND_RANKINGS.FLUSH]: 'Flush',
      [HAND_RANKINGS.FULL_HOUSE]: 'Full House',
      [HAND_RANKINGS.FOUR_OF_A_KIND]: 'Four of a Kind',
      [HAND_RANKINGS.STRAIGHT_FLUSH]: 'Straight Flush',
      [HAND_RANKINGS.ROYAL_FLUSH]: 'Royal Flush'
    };
    return names[rank] || 'Unknown';
  }

  determineWinner() {
    const playerArray = Array.from(this.players.values());
    const activePlayers = playerArray.filter(p => !p.folded);
    
    this.showAllCards = true;
    
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      winner.chips += this.pot;
      this.pot = 0;
      console.log(`${winner.name} wins by default - all other players folded`);
      this.endReason = 'early_end';
      this.gameState = 'finished';
      io.to(this.roomId).emit('gameState', this.getGameState());
      return;
    }
    
    // Evaluate hands for all active players
    const playerHands = activePlayers.map(player => {
      const evaluation = this.evaluateHand(player.hand, this.communityCards);
      return {
        player,
        rank: evaluation.rank,
        hand: evaluation.hand,
        handName: this.getHandName(evaluation.rank)
      };
    });
    
    // Sort by hand rank (highest first)
    playerHands.sort((a, b) => b.rank - a.rank);
    
    // Find winners (players with the same highest rank)
    const highestRank = playerHands[0].rank;
    const winners = playerHands.filter(ph => ph.rank === highestRank);
    
    // If multiple winners, split the pot
    const winAmount = Math.floor(this.pot / winners.length);
    winners.forEach(winner => {
      winner.player.chips += winAmount;
      console.log(`${winner.player.name} wins with ${winner.handName}`);
    });
    
    // Handle remainder (if pot doesn't divide evenly)
    const remainder = this.pot % winners.length;
    if (remainder > 0) {
      winners[0].player.chips += remainder;
    }
    
    this.pot = 0;
    this.endReason = 'showdown';
    this.gameState = 'finished';
    io.to(this.roomId).emit('gameState', this.getGameState());
  }

  getGameState() {
    return {
      roomId: this.roomId,
      players: Array.from(this.players.values()),
      communityCards: this.communityCards,
      pot: this.pot,
      sidePots: this.sidePots,
      currentBet: this.currentBet,
      round: this.round,
      gameState: this.gameState,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      endReason: this.endReason,
      roomCreator: this.roomCreator,
      lastRaiserIndex: this.lastRaiserIndex,
      roundStartIndex: this.roundStartIndex,
      showAllCards: this.showAllCards,
      bigBlind: this.bigBlind,
      blindsPosted: this.blindsPosted
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
      
      if (game.gameState === 'playing') {
        const player = game.players.get(socket.id);
        if (player) {
          player.startingChips = player.chips;
        }
      }
      
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
      if (game.roomCreator !== socket.id) {
        socket.emit('error', { message: 'Only the room creator can start the game' });
        return;
      }
      
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

  socket.on('check', () => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded && !player.allIn) {
        // Can only check if no current bet or if player has already matched the current bet
        if (game.currentBet === 0 || player.bet === game.currentBet) {
          console.log(`${player.name} checks`);
          io.to(socket.roomId).emit('gameState', game.getGameState());
          game.moveToNextPlayer();
        } else {
          socket.emit('error', { message: 'Cannot check - there is a bet to call' });
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
        
        if (actualCall > 0) {
          player.chips -= actualCall;
          player.bet += actualCall;
          game.pot += actualCall;
          
          if (player.chips === 0) {
            player.allIn = true;
          }
          
          console.log(`${player.name} calls $${actualCall}`);
          io.to(socket.roomId).emit('gameState', game.getGameState());
          game.moveToNextPlayer();
        } else {
          socket.emit('error', { message: 'No bet to call' });
        }
      }
    }
  });

  socket.on('bet', ({ amount }) => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded && !player.allIn) {
        // Can only bet if no current bet
        if (game.currentBet === 0) {
          const actualBet = Math.min(amount, player.chips);
          if (actualBet >= game.bigBlind) {
            player.chips -= actualBet;
            player.bet += actualBet;
            game.pot += actualBet;
            game.currentBet = actualBet;
            game.lastRaiserIndex = game.currentPlayerIndex;
            
            if (player.chips === 0) {
              player.allIn = true;
            }
            
            console.log(`${player.name} bets $${actualBet}`);
            io.to(socket.roomId).emit('gameState', game.getGameState());
            game.moveToNextPlayer();
          } else {
            socket.emit('error', { message: `Bet must be at least $${game.bigBlind}` });
          }
        } else {
          socket.emit('error', { message: 'Cannot bet - there is already a bet. Use call or raise.' });
        }
      }
    }
  });

  socket.on('raise', ({ amount }) => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded && !player.allIn) {
        const currentPlayerBet = player.bet;
        const minRaise = game.currentBet + game.bigBlind;
        const raiseToAmount = Math.max(minRaise, amount);
        const raiseAmount = raiseToAmount - currentPlayerBet;
        
        if (raiseAmount <= player.chips && raiseToAmount > game.currentBet) {
          const actualRaise = Math.min(raiseAmount, player.chips);
          player.chips -= actualRaise;
          player.bet += actualRaise;
          game.pot += actualRaise;
          game.currentBet = player.bet;
          game.lastRaiserIndex = game.currentPlayerIndex;
          
          if (player.chips === 0) {
            player.allIn = true;
          }
          
          console.log(`${player.name} raises to $${player.bet}`);
          io.to(socket.roomId).emit('gameState', game.getGameState());
          game.moveToNextPlayer();
        } else {
          socket.emit('error', { message: `Raise must be at least $${minRaise} and you must have enough chips` });
        }
      }
    }
  });

  socket.on('fold', () => {
    const game = games.get(socket.roomId);
    if (game && game.gameState === 'playing') {
      const player = game.players.get(socket.id);
      if (player && !player.folded) {
        console.log(`${player.name} folds`);
        player.folded = true;
        
        io.to(socket.roomId).emit('gameState', game.getGameState());
        
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
          player.folded = true;
          player.isActive = false;
          
          if (game.roomCreator === socket.id) {
            const remainingPlayers = Array.from(game.players.keys()).filter(id => id !== socket.id);
            if (remainingPlayers.length > 0) {
              game.roomCreator = remainingPlayers[0];
              console.log(`Room creator left during gameplay. New creator assigned: ${game.roomCreator}`);
            }
          }
          
          io.to(socket.roomId).emit('gameState', game.getGameState());

          if (game.shouldEndGameEarly()) {
            game.determineWinner();
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
            player.folded = true;
            player.isActive = false;
            
            if (game.roomCreator === socket.id) {
              const remainingPlayers = Array.from(game.players.keys()).filter(id => id !== socket.id);
              if (remainingPlayers.length > 0) {
                game.roomCreator = remainingPlayers[0];
                console.log(`Room creator disconnected during gameplay. New creator assigned: ${game.roomCreator}`);
              }
            }
            
            io.to(socket.roomId).emit('gameState', game.getGameState());

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
      game.gameState = 'waiting';
      io.to(socket.roomId).emit('gameState', game.getGameState());
    }
  });
});

console.log('WebSocket server running on port 3001'); 