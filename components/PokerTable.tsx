"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import CommunityCards from "./CommunityCards";
import GameControls from "./GameControls";
import BettingPanel from "./BettingPanel";
import PlayingCard from "./PlayingCard";
import { formatMoney } from "../utils/formatters";
import {
  evaluateHand,
  formatHandDescription,
} from "../utils/pokerHandEvaluator";
import { Player, GameState, PokerTableProps } from "../types";

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-poker-dark/90 backdrop-blur-md border border-poker-gold/60 rounded-lg p-6 max-w-md mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-poker-gold mb-4">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-colors border border-gray-400/20"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-poker-red/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-700/90 transition-colors border border-red-400/20"
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
    bigBlind: 20,
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showBettingPanel, setShowBettingPanel] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);

  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
      newSocket.emit("joinRoom", { roomId, playerName });
    });

    newSocket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setErrorMessage(
        "Connection failed. Please check your internet connection and try again."
      );
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        setErrorMessage("Disconnected from server. Please refresh the page.");
      }
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

    newSocket.on("playerJoined", ({ playerName }) => {
      console.log(`${playerName} joined the game`);
    });

    newSocket.on("playerLeft", () => {
      console.log("Player left the game");
    });

    newSocket.on("gameStarted", () => {
      console.log("Game started!");
      setIsStartingGame(false);
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
  }, [roomId, playerName, gameState.roomCreator, gameState.players]);

  const handleStartGame = () => {
    if (!isConnected || isStartingGame) return;

    setIsStartingGame(true);
    socket?.emit("startGame");

    // Reset loading state after 10 seconds if no response
    setTimeout(() => {
      setIsStartingGame(false);
    }, 10000);
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

  const handleCheck = () => {
    socket?.emit("check");
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
    <div className="min-h-screen bg-gradient-to-br from-teal-800 to-teal-900 relative overflow-hidden min-w-[360px]">
      <div className="max-w-xl mx-auto w-full relative">
        {/* Error Message */}
        {errorMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-poker-red/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg border border-red-300/20">
            {errorMessage}
          </div>
        )}

        {/* Notification Message */}
        {notification && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-cyan-600/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg border border-cyan-300/20">
            {notification}
          </div>
        )}

        {/* Players list layout */}
        <div className="block relative pt-28 sm:pt-36 pb-40 space-y-4 max-w-xl mx-auto w-full">
          {/* Community Cards */}
          <div className="w-full">
            <CommunityCards
              cards={gameState.communityCards}
              round={gameState.round}
            />
          </div>

          {/* Pot info */}
          <div className="text-center">
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 mb-4">
              {/* Turn indicator */}
              {gameState.gameState === "playing" &&
                gameState.currentPlayerIndex !== -1 && (
                  <div className="mb-3">
                    {gameState.players[gameState.currentPlayerIndex]?.name ===
                    playerName ? (
                      <div className="bg-poker-gold/90 backdrop-blur-sm text-black px-4 py-2 rounded-lg text-lg font-bold border border-yellow-300/30 turn-pulse">
                        YOUR TURN TO PLAY
                      </div>
                    ) : (
                      <div className="bg-cyan-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-lg font-bold border border-cyan-300/30">
                        🎮{" "}
                        {gameState.players[gameState.currentPlayerIndex]?.name}
                        &apos;s Turn
                      </div>
                    )}
                  </div>
                )}

              <div className="text-xl font-bold text-poker-gold">
                Pot: {formatMoney(gameState.pot)}
              </div>
              <div className="text-base text-gray-300">
                Current Bet: {formatMoney(gameState.currentBet)}
              </div>
              {gameState.blindsPosted && (
                <div className="text-xs text-gray-400 mt-1">
                  Blinds: {formatMoney(gameState.bigBlind / 2)} /{" "}
                  {formatMoney(gameState.bigBlind)}
                </div>
              )}
              {gameState.showAllCards && (
                <div className="mt-2">
                  <span className="bg-poker-gold/90 backdrop-blur-sm text-black px-2 py-1 rounded text-base font-bold border border-yellow-300/30">
                    🃏 All Cards Revealed
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Players list */}
          <div className="space-y-3 px-2 sm:px-0">
            {gameState.players.map((player, index) => {
              const isMe = currentPlayer?.id === player.id;
              const isTurn = index === gameState.currentPlayerIndex;
              const showFaceUp =
                (isMe && gameState.gameState === "playing" && !player.folded) ||
                (gameState.showAllCards && !player.folded);
              return (
                <div
                  key={player.id}
                  className={`rounded-lg border px-3 py-2 backdrop-blur-md transition-all duration-300 ${
                    isMe
                      ? "border-purple-400 bg-purple-900/40"
                      : "bg-poker-dark"
                  } ${
                    isTurn
                      ? "border-poker-gold shadow-lg shadow-poker-gold/25 turn-glow"
                      : "border-white/20 bg-poker-dark"
                  } shadow-lg relative`}
                >
                  {/* Turn indicator overlay */}
                  {gameState.gameState === "playing" && isTurn && (
                    <div className="absolute -top-2 -left-2 bg-poker-gold text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                      {isMe ? "YOUR TURN" : "TURN"}
                    </div>
                  )}

                  <span
                    className={`font-bold text-sm ${
                      isMe ? "text-purple-300" : isTurn ? "text-poker-gold" : ""
                    }`}
                  >
                    {player.name}
                    {isMe ? " (YOU)" : ""}
                    {gameState.roomCreator === player.id ? " 👑" : ""}
                    {!isTurn &&
                      gameState.gameState === "playing" &&
                      !player.folded &&
                      !player.allIn && (
                        <span className="ml-2 bg-gray-600 text-gray-300 text-xs font-bold px-2 py-1 rounded">
                          WAITING
                        </span>
                      )}
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
                        ) ===
                          (gameState.dealerIndex + 1) %
                            gameState.players.length && (
                          <span className="text-xs bg-cyan-600 text-white px-1 rounded">
                            SB
                          </span>
                        )}
                        {/* Big Blind indicator */}
                        {gameState.players.findIndex(
                          (p) => p.id === player.id
                        ) ===
                          (gameState.dealerIndex + 2) %
                            gameState.players.length && (
                          <span className="text-xs bg-red-600 text-white px-1 rounded">
                            BB
                          </span>
                        )}
                      </div>
                      {/* Bet and Chips Group */}
                      <div className="flex gap-2 mb-2">
                        {/* Bet Box */}
                        <div
                          className={`px-3 py-2 rounded-lg border backdrop-blur-sm ${
                            player.bet > 0
                              ? "bg-poker-gold/20 border-poker-gold/40"
                              : "bg-gray-800/30 border-gray-600/30"
                          }`}
                        >
                          <div className="text-xs text-poker-gold font-semibold mb-1">
                            Bet
                          </div>
                          <div
                            className={`text-sm font-bold ${
                              player.bet > 0
                                ? "text-poker-gold"
                                : "text-gray-400"
                            }`}
                          >
                            {player.bet > 0
                              ? formatMoney(player.bet)
                              : "No bet"}
                          </div>
                        </div>

                        {/* Chips Box */}
                        <div className="px-3 py-2 rounded-lg border bg-cyan-900/20 border-cyan-600/40 backdrop-blur-sm">
                          <div className="text-xs text-cyan-300 font-semibold mb-1">
                            Chips
                          </div>
                          <div className="text-sm font-bold text-cyan-200">
                            {formatMoney(player.chips)}
                          </div>
                        </div>
                      </div>

                      {/* Won/Lost indicator and hand info - show above chips only when game is over */}
                      {gameState.gameState === "finished" &&
                        player.startingChips !== undefined && (
                          <div className="mb-2 space-y-1">
                            {/* Hand information */}
                            {!player.folded &&
                              player.hand.length > 0 &&
                              gameState.communityCards.length >= 3 && (
                                <div className="bg-cyan-600 text-white text-xs font-bold px-2 py-1 rounded">
                                  {formatHandDescription(
                                    evaluateHand(
                                      player.hand,
                                      gameState.communityCards
                                    )
                                  )}
                                </div>
                              )}

                            {/* Win/Loss indicator */}
                            {player.chips > player.startingChips ? (
                              <div className="bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded">
                                +
                                {formatMoney(
                                  player.chips - player.startingChips
                                )}{" "}
                                🎉 WON
                              </div>
                            ) : player.chips < player.startingChips ? (
                              <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                                -
                                {formatMoney(
                                  player.startingChips - player.chips
                                )}{" "}
                                💸 LOST
                              </div>
                            ) : (
                              <div className="bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded">
                                {formatMoney(0)} ↔️ EVEN
                              </div>
                            )}
                          </div>
                        )}
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
                            suit={c.suit as "hearts" | "diamonds" | "clubs" | "spades"}
                            rank={c.rank}
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
              players={gameState.players}
              isMyTurn={
                gameState.gameState === "playing" &&
                gameState.players.findIndex(
                  (p) => p.id === currentPlayer.id
                ) === gameState.currentPlayerIndex
              }
              roomCreator={gameState.roomCreator}
              endReason={gameState.endReason}
              currentBet={gameState.currentBet}
              isStartingGame={isStartingGame}
              onStartGame={handleStartGame}
              onFold={handleFold}
              onCall={handleCall}
              onCheck={handleCheck}
              onRaise={() => setShowBettingPanel(true)}
              onNextRound={handleNextRound}
              onForceRestart={handleForceRestart}
              onExitToLobby={onExitToLobby}
            />
          </div>
        )}

        {/* Exit Button */}
        <div className="absolute top-2 right-2 sm:right-0">
          <button
            onClick={handleExitGame}
            className="bg-poker-red/90 backdrop-blur-md text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700/90 transition-colors text-sm border border-red-300/20 shadow-lg"
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
        <div className="absolute top-2 left-2 bg-poker-dark/40 backdrop-blur-md p-3 rounded-lg sm:left-0 border border-white/10 shadow-lg">
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
