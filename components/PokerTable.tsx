"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import PlayerSeat from "./PlayerSeat";
import CommunityCards from "./CommunityCards";
import GameControls from "./GameControls";
import BettingPanel from "./BettingPanel";

interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  hand: Array<{ suit: string; rank: string }>;
  folded: boolean;
  allIn: boolean;
  isActive: boolean;
}

interface GameState {
  roomId: string;
  players: Player[];
  communityCards: Array<{ suit: string; rank: string }>;
  pot: number;
  currentBet: number;
  round: string;
  gameState: string;
  currentPlayerIndex: number;
  dealerIndex: number;
  endReason?: 'early_end' | 'showdown' | null;
}

interface PokerTableProps {
  roomId: string;
  playerName: string;
  onExitToLobby: () => void;
}

// Empty seat component
function EmptySeat({ position }: { position: number }) {
  const seatPosition = (() => {
    // Calculate positions around the table in a circle
    const angle = (position * 45) - 90; // 8 positions, 45 degrees apart, starting from top
    const radius = 35; // percentage from center
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  })();

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${seatPosition.x}%`,
        top: `${seatPosition.y}%`,
      }}
    >
      <div className="empty-seat text-center flex flex-col items-center justify-center">
        <div className="text-gray-400 text-xs font-medium">Seat</div>
        <div className="text-gray-400 text-xs">#{position + 1}</div>
      </div>
    </div>
  );
}

// Confirmation Dialog Component
function ConfirmationDialog({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title, 
  message, 
  confirmText = "Yes", 
  cancelText = "No" 
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-poker-dark border-2 border-poker-gold rounded-lg p-6 max-w-md mx-4">
        <h3 className="text-xl font-bold text-poker-gold mb-4">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-poker-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PokerTable({ roomId, playerName, onExitToLobby }: PokerTableProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showBettingPanel, setShowBettingPanel] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001"
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("joinRoom", { roomId, playerName });
    });

    newSocket.on("gameState", (state: GameState) => {
      setGameState(state);
      const player = state.players.find((p) => p.name === playerName);
      setCurrentPlayer(player || null);
    });

    newSocket.on("playerJoined", ({ playerId, playerName }) => {
      console.log(`${playerName} joined the game`);
    });

    newSocket.on("playerLeft", ({ playerId }) => {
      console.log("Player left the game");
    });

    newSocket.on("gameStarted", () => {
      console.log("Game started!");
    });

    newSocket.on("error", ({ message }) => {
      console.error("Game error:", message);
    });

    return () => {
      newSocket.close();
    };
  }, [roomId, playerName]);

  const handleStartGame = () => {
    socket?.emit("startGame");
  };

  const handleBet = (amount: number) => {
    socket?.emit("bet", { amount });
    setShowBettingPanel(false);
  };

  const handleFold = () => {
    socket?.emit("fold");
  };

  const handleCall = () => {
    socket?.emit("call");
  };

  const handleRaise = (amount: number) => {
    socket?.emit("raise", { amount });
    setShowBettingPanel(false);
  };

  const handleNextRound = () => {
    if (gameState?.gameState === 'finished') {
      socket?.emit('continueGame');
    } else {
      socket?.emit("nextRound");
    }
  };

  const handleForceRestart = () => {
    socket?.emit("forceRestart");
  };

  const handleExitGame = () => {
    if (gameState?.gameState === 'playing' && currentPlayer && (currentPlayer.bet ?? 0) > 0) {
      // Show confirmation dialog if player has bet money
      setShowExitConfirmation(true);
    } else {
      // Exit immediately if no active game or no bet
      confirmExit();
    }
  };

  const confirmExit = () => {
    socket?.emit("exitGame");
    socket?.disconnect();
    onExitToLobby();
  };

  const cancelExit = () => {
    setShowExitConfirmation(false);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-gold mx-auto mb-4"></div>
          <p className="text-poker-gold">Connecting to game server...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-poker-gold">Loading game...</p>
        </div>
      </div>
    );
  }

  // Create array of all 8 seat positions
  const allSeats = Array.from({ length: 8 }, (_, index) => index);
  const occupiedSeats = gameState.players.map((_, index) => index);
  const emptySeats = allSeats.filter(seatIndex => !occupiedSeats.includes(seatIndex));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 relative overflow-hidden min-w-[320px]">
      {/* Poker Table */}
      <div className="absolute inset-2 bg-green-700 rounded-full border-8 border-brown-800 shadow-2xl sm:inset-4">
        <div className="absolute inset-4 bg-green-600 rounded-full border-4 border-green-800 sm:inset-8">
          {/* Community Cards */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <CommunityCards
              cards={gameState.communityCards}
              round={gameState.round}
            />
          </div>

          {/* Pot */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-gold sm:text-2xl">
                Pot: ${gameState.pot}
              </div>
              <div className="text-sm text-gray-300 sm:text-sm">
                Current Bet: ${gameState.currentBet}
              </div>
            </div>
          </div>

          {/* Empty Seat Spots */}
          <div className="absolute inset-0">
            {emptySeats.map((seatIndex) => (
              <EmptySeat key={`empty-${seatIndex}`} position={seatIndex} />
            ))}
          </div>

          {/* Player Seats */}
          <div className="absolute inset-0">
            {gameState.players.map((player, index) => (
              <PlayerSeat
                key={player.id}
                player={player}
                position={index}
                totalPlayers={gameState.players.length}
                isCurrentPlayer={currentPlayer?.id === player.id}
                isDealer={index === gameState.dealerIndex}
                isCurrentTurn={index === gameState.currentPlayerIndex}
                gameState={gameState.gameState}
                currentPlayerIndex={gameState.players.findIndex(
                  (p) => p.id === currentPlayer?.id
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Exit Button */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
        <button
          onClick={handleExitGame}
          className="bg-poker-red text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors text-sm"
        >
          Exit Game
        </button>
      </div>

      {/* Game Controls */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 sm:bottom-4">
        <GameControls
          gameState={gameState.gameState}
          currentPlayer={currentPlayer}
          isMyTurn={currentPlayer ? gameState.players.findIndex(p => p.id === currentPlayer.id) === gameState.currentPlayerIndex : false}
          onStartGame={handleStartGame}
          onFold={handleFold}
          onCall={handleCall}
          onRaise={() => setShowBettingPanel(true)}
          onNextRound={handleNextRound}
          onForceRestart={handleForceRestart}
        />
      </div>

      {/* Betting Panel */}
      {showBettingPanel && currentPlayer && (
        <BettingPanel
          player={currentPlayer}
          currentBet={gameState.currentBet}
          onBet={handleBet}
          onRaise={handleRaise}
          onClose={() => setShowBettingPanel(false)}
        />
      )}

      {/* Room Info */}
      <div className="absolute top-2 left-2 bg-poker-dark bg-opacity-80 p-3 rounded-lg sm:top-4 sm:left-4">
        <div className="text-xs sm:text-sm">
          <p className="text-poker-gold">Room: {roomId}</p>
          <p className="text-gray-300">
            Players: {gameState.players.length}/8
          </p>
          <p className="text-gray-300">Round: {gameState.round}</p>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirmation}
        onConfirm={confirmExit}
        onCancel={cancelExit}
        title="Exit Game"
        message={`Are you sure you want to exit? You will lose your current bet of $${currentPlayer ? currentPlayer.bet : 0} and any chips in the pot.`}
        confirmText="Exit Game"
        cancelText="Stay"
      />

      {/* Finish Modal: show when game ends (e.g., early_end when other players quit) */}
      <ConfirmationDialog
        isOpen={gameState.gameState === 'finished'}
        onConfirm={() => socket?.emit('continueGame')}
        onCancel={onExitToLobby}
        title={gameState.endReason === 'early_end' ? 'Hand Ended Early' : 'Hand Finished'}
        message={gameState.endReason === 'early_end' ? 'All other players left or folded. Do you want to continue with a new hand or exit to lobby?' : 'Hand finished. Do you want to play another hand or exit to lobby?'}
        confirmText="Continue"
        cancelText="Exit"
      />
    </div>
  );
}
