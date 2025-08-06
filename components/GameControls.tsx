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
  isAI?: boolean;
}

interface GameControlsProps {
  gameState: string;
  currentPlayer: Player | null;
  onStartGame: () => void;
  onFold: () => void;
  onCall: () => void;
  onRaise: () => void;
  onNextRound: () => void;
}

export default function GameControls({
  gameState,
  currentPlayer,
  onStartGame,
  onFold,
  onCall,
  onRaise,
  onNextRound,
}: GameControlsProps) {
  const canAct =
    currentPlayer &&
    !currentPlayer.folded &&
    !currentPlayer.allIn &&
    gameState === "playing" &&
    !currentPlayer.isAI;

  return (
    <div className="bg-poker-dark bg-opacity-90 p-2 rounded-lg border-2 border-poker-gold sm:p-4">
      {gameState === "waiting" ? (
        <div className="text-center">
          <button onClick={onStartGame} className="game-button">
            Start Game
          </button>
          <p className="text-xs text-gray-300 mt-2 sm:text-sm">
            Waiting for players...
          </p>
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

              <button
                onClick={onCall}
                className="action-button bg-blue-600 hover:bg-blue-700"
              >
                Call
              </button>

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

          {currentPlayer?.isAI && (
            <div className="ai-thinking font-bold sm:text-base text-sm">
              AI is thinking...
            </div>
          )}
        </div>
      ) : gameState === "finished" ? (
        <div className="text-center">
          <button onClick={onNextRound} className="game-button">
            Next Round
          </button>
        </div>
      ) : null}
    </div>
  );
}
