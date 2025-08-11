"use client";

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

interface GameControlsProps {
  gameState: string;
  currentPlayer: Player | null;
  isMyTurn: boolean;
  roomCreator?: string;
  endReason?: "early_end" | "showdown" | null;
  currentBet: number;
  onStartGame: () => void;
  onFold: () => void;
  onCall: () => void;
  onBet: () => void;
  onRaise: () => void;
  onNextRound: () => void;
  onForceRestart?: () => void;
  onExitToLobby?: () => void;
}

export default function GameControls({
  gameState,
  currentPlayer,
  isMyTurn,
  roomCreator,
  endReason,
  currentBet,
  onStartGame,
  onFold,
  onCall,
  onBet,
  onRaise,
  onNextRound,
  onForceRestart,
  onExitToLobby,
}: GameControlsProps) {
  const canAct =
    currentPlayer &&
    !currentPlayer.folded &&
    !currentPlayer.allIn &&
    gameState === "playing" &&
    isMyTurn;

  return (
    <div className="bg-poker-dark bg-opacity-90 p-2 rounded-lg border-2 border-poker-gold sm:p-4">
      {gameState === "waiting" ? (
        <div className="text-center">
          {currentPlayer && roomCreator === currentPlayer.id ? (
            <>
              <button onClick={onStartGame} className="game-button">
                Start Game
              </button>
              <p className="text-xs text-gray-300 mt-2 sm:text-sm">
                Waiting for players... (You can start the game)
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-xs text-gray-300 sm:text-sm">
                Waiting for room creator to start the game...
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (Look for the 👑 crown icon)
              </p>
            </div>
          )}
        </div>
      ) : gameState === "playing" ? (
        <div className="flex gap-1 sm:gap-2">
          {canAct && (
            <>
              <button
                onClick={onFold}
                className="action-button bg-gray-600 hover:bg-gray-700"
              >
                Fold
              </button>

              {/* Show Bet button when there's no current bet (initial betting) */}
              {currentPlayer && currentPlayer.bet === 0 && (
                <button
                  onClick={onBet}
                  className="action-button bg-green-600 hover:bg-green-700"
                >
                  Bet
                </button>
              )}

              {/* Show Call button when there's a current bet to call */}
              {currentPlayer && currentBet > currentPlayer.bet && (
                <button
                  onClick={onCall}
                  className="action-button bg-blue-600 hover:bg-blue-700"
                >
                  Call
                </button>
              )}

              <button
                onClick={onRaise}
                className="action-button bg-poker-red hover:bg-red-700"
              >
                Raise
              </button>
            </>
          )}

          {currentPlayer?.allIn && (
            <div className="text-poker-gold font-bold sm:text-base text-sm">
              ALL IN!
            </div>
          )}

          {currentPlayer?.folded && (
            <div className="text-gray-500 font-bold sm:text-base text-sm">
              FOLDED
            </div>
          )}

          {gameState === "playing" && currentPlayer && !currentPlayer.folded && !currentPlayer.allIn && !isMyTurn && (
            <div className="text-center">
              <div className="text-gray-400 font-bold sm:text-base text-sm">
                Waiting for your turn...
              </div>
              <div className="text-gray-500 text-xs">
                Another player is making their move
              </div>
            </div>
          )}
        </div>
      ) : gameState === "finished" ? (
        <div className="text-center">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-poker-gold mb-2">
              {endReason === "early_end" ? "Hand Ended Early" : "Hand Finished"}
            </h3>
            <p className="text-sm text-gray-300">
              {endReason === "early_end"
                ? "All other players left or folded."
                : "Hand finished."}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={onNextRound} className="game-button">
              Continue
            </button>
            {onExitToLobby && (
              <button 
                onClick={onExitToLobby} 
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors text-sm"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      ) : gameState === "restarting" ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-gold mx-auto mb-2"></div>
          <p className="text-poker-gold font-bold text-sm">Restarting Game...</p>
          <p className="text-gray-300 text-xs">All players folded</p>
        </div>
      ) : gameState === "playing" && currentPlayer?.folded ? (
        <div className="text-center">
          <p className="text-gray-500 font-bold text-sm mb-2">You folded</p>
          {onForceRestart && (
            <button 
              onClick={onForceRestart} 
              className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700"
            >
              Force Restart
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
