"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import CommunityCards from "./CommunityCards";
import GameControls from "./GameControls";
import BettingPanel from "./BettingPanel";
import PlayingCard from "./PlayingCard";
import { formatMoney } from "../utils/formatters";

interface Player {
  id: string;
  name: string;
  chips: number;
  startingChips?: number;
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
  endReason?: "early_end" | "showdown" | null;
  roomCreator?: string;
  lastRaiserIndex?: number;
  roundStartIndex?: number;
  showAllCards?: boolean;
}

interface PokerTableProps {
  roomId: string;
  playerName: string;
  onExitToLobby: () => void;
}

// Confirmation Dialog Component
function ConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Yes",
  cancelText = "No",
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

export default function PokerTable({
  roomId,
  playerName,
  onExitToLobby,
}: PokerTableProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    roomId: "",
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    round: "preflop",
    gameState: "waiting",
    currentPlayerIndex: 0,
    dealerIndex: 0,
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showBettingPanel, setShowBettingPanel] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

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
      // Check if room creator changed
      if (
        gameState.roomCreator &&
        state.roomCreator &&
        gameState.roomCreator !== state.roomCreator
      ) {
        const oldCreator =
          gameState.players.find((p) => p.id === gameState.roomCreator)?.name ||
          "Unknown";
        const newCreator =
          state.players.find((p) => p.id === state.roomCreator)?.name ||
          "Unknown";
        setNotification(
          `Room creator changed from ${oldCreator} to ${newCreator}`
        );
        setTimeout(() => setNotification(null), 5000);
      }

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
      setErrorMessage(message);
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
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
    if (gameState?.gameState === "finished") {
      socket?.emit("continueGame");
    } else {
      socket?.emit("nextRound");
    }
  };

  const handleForceRestart = () => {
    socket?.emit("forceRestart");
  };

  const handleExitGame = () => {
    if (
      gameState?.gameState === "playing" &&
      currentPlayer &&
      (currentPlayer.bet ?? 0) > 0
    ) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 relative overflow-hidden min-w-[350px]">
      <div className="max-w-xl mx-auto w-full relative">
        {/* Error Message */}
        {errorMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-poker-red text-white px-4 py-2 rounded-lg shadow-lg">
            {errorMessage}
          </div>
        )}

        {/* Notification Message */}
        {notification && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            {notification}
          </div>
        )}

        {/* Players list layout */}
        <div className="block relative pt-28 sm:pt-36 pb-40 space-y-4 max-w-xl mx-auto w-full">
          {/* Community Cards */}
          <div className="flex justify-center">
            <CommunityCards
              cards={gameState.communityCards}
              round={gameState.round}
            />
          </div>

          {/* Pot info */}
          <div className="text-center">
            <div className="text-xl font-bold text-poker-gold">
              Pot: {formatMoney(gameState.pot)}
            </div>
            <div className="text-base text-gray-300">
              Current Bet: {formatMoney(gameState.currentBet)}
            </div>
            {gameState.showAllCards && (
              <div className="mt-2">
                <span className="bg-poker-gold text-black px-2 py-1 rounded text-base font-bold">
                  🃏 All Cards Revealed
                </span>
              </div>
            )}
          </div>

          {/* Players list */}
          <div className="space-y-3">
            {gameState.players.map((player, index) => {
              const isMe = currentPlayer?.id === player.id;
              const isTurn = index === gameState.currentPlayerIndex;
              const showFaceUp =
                (isMe && gameState.gameState === "playing" && !player.folded) ||
                (gameState.showAllCards && !player.folded);
              return (
                <div
                  key={player.id}
                  className={`rounded-lg border px-3 py-2 ${
                    isTurn ? "border-poker-gold" : "border-gray-700"
                  } bg-poker-dark/80`}
                >
                  <span className="font-bold text-sm">
                    {player.name}
                    {isMe ? " (YOU)" : ""}
                    {gameState.roomCreator === player.id ? " 👑" : ""}
                  </span>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-2 flex-col xs:flex-row">
                        {gameState.players.findIndex(
                          (p) => p.id === player.id
                        ) === gameState.dealerIndex && (
                          <span className="text-xs bg-poker-gold text-black px-1 rounded">
                            DEALER
                          </span>
                        )}
                        {/* Small Blind indicator */}
                        {gameState.players.findIndex(
                          (p) => p.id === player.id
                        ) === (gameState.dealerIndex + 1) % gameState.players.length && (
                          <span className="text-xs bg-blue-600 text-white px-1 rounded">
                            SB
                          </span>
                        )}
                        {/* Big Blind indicator */}
                        {gameState.players.findIndex(
                          (p) => p.id === player.id
                        ) === (gameState.dealerIndex + 2) % gameState.players.length && (
                          <span className="text-xs bg-red-600 text-white px-1 rounded">
                            BB
                          </span>
                        )}
                      </div>
                      {player.bet > 0 && (
                        <div className="ext-base">
                          <div className="text-xs text-poker-gold">Bet</div>
                          <div className="text-poker-gold">{formatMoney(player.bet)}</div>
                        </div>
                      )}
                      
                      {/* Won/Lost indicator - show above chips only when game is over */}
                      {gameState.showAllCards && player.startingChips !== undefined && (
                        <div className="mb-2">
                          {player.chips > player.startingChips ? (
                            <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                              +{formatMoney(player.chips - player.startingChips)} 🎉 WON
                            </div>
                          ) : player.chips < player.startingChips ? (
                            <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                              -{formatMoney(player.startingChips - player.chips)} 💸 LOST
                            </div>
                          ) : (
                            <div className="bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded">
                              {formatMoney(0)} ↔️ EVEN
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-base text-gray-300">
                        <div className="text-xs xs:text-sm sm:text-base">Chips</div>
                        <div>{formatMoney(player.chips)}</div>
                      </div>
                      <div className="mt-1 flex gap-2 text-xs">
                        {player.allIn && (
                          <span className="bg-poker-red text-white px-2 rounded">
                            ALL IN
                          </span>
                        )}
                        {player.folded && (
                          <span className="bg-gray-600 text-white px-2 rounded">
                            FOLDED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 relative">
                      {showFaceUp ? (
                        player.hand.map((c, i) => (
                          <PlayingCard
                            key={i}
                            suit={c.suit as any}
                            rank={c.rank}
                            showText={isMe || gameState.showAllCards}
                          />
                        ))
                      ) : (
                        <>
                          <PlayingCard faceDown className="other-player" />
                          <PlayingCard faceDown className="other-player" />
                        </>
                      )}
                      {gameState.showAllCards && player.folded && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                          <span className="text-white font-bold text-xs">
                            FOLDED
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player turn indicator */}
                  {isMe && gameState.gameState === "playing" && (
                    <div className="mt-3">
                      {currentPlayer &&
                        !currentPlayer.folded &&
                        !currentPlayer.allIn && (
                          <div className="text-center">
                            {gameState.players.findIndex(
                              (p) => p.id === currentPlayer.id
                            ) === gameState.currentPlayerIndex && (
                              <div className="text-poker-gold font-bold text-sm">
                                Your turn!
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Controls - Only show for current player */}
        {currentPlayer && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <GameControls
              gameState={gameState.gameState}
              currentPlayer={currentPlayer}
              isMyTurn={
                gameState.gameState === "playing" &&
                gameState.players.findIndex(
                  (p) => p.id === currentPlayer.id
                ) === gameState.currentPlayerIndex
              }
              roomCreator={gameState.roomCreator}
              endReason={gameState.endReason}
              currentBet={gameState.currentBet}
              onStartGame={handleStartGame}
              onFold={handleFold}
              onCall={handleCall}
              onBet={() => setShowBettingPanel(true)}
              onRaise={() => setShowBettingPanel(true)}
              onNextRound={handleNextRound}
              onForceRestart={handleForceRestart}
              onExitToLobby={onExitToLobby}
            />
          </div>
        )}

        {/* Exit Button */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <button
            onClick={handleExitGame}
            className="bg-poker-red text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors text-sm"
          >
            Exit Game
          </button>
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
        <div className="absolute top-2 left-2 bg-poker-dark bg-opacity-80 p-3 rounded-lg">
          <div className="text-sm sm:text-base">
            <p className="text-poker-gold">Room: {roomId}</p>
            <p className="text-gray-300">
              Players: {gameState.players.length} / 8 max
            </p>
          </div>
        </div>

        {/* Exit Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showExitConfirmation}
          onConfirm={confirmExit}
          onCancel={cancelExit}
          title="Exit Game"
          message={`Are you sure you want to exit? You will lose your current bet of ${
            currentPlayer ? formatMoney(currentPlayer.bet) : formatMoney(0)
          } and any chips in the pot.`}
          confirmText="Exit Game"
          cancelText="Stay"
        />
      </div>
    </div>
  );
}
