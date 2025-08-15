"use client";

import { formatMoney } from "../utils/formatters";
import { GameControlsProps } from "../types";

export default function GameControls({
  gameState,
  currentPlayer,
  players,
  isMyTurn,
  roomCreator,
  endReason,
  currentBet,
  isStartingGame = false,
  winners,
  onStartGame,
  onFold,
  onCall,
  onCheck,
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
    <div className="bg-poker-dark/80 backdrop-blur-md p-2 rounded-lg border border-poker-gold/60 shadow-lg sm:p-4">
      {gameState === "waiting" ? (
        <div className="text-center">
          {currentPlayer && roomCreator === currentPlayer.id ? (
            <>
              <button
                onClick={onStartGame}
                disabled={players.length < 2 || isStartingGame}
                className="game-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStartingGame ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-1"></div>
                    Starting...
                  </>
                ) : (
                  "Start Game"
                )}
              </button>
              <p className="text-xs text-gray-300 mt-2 sm:text-sm">
                {players.length < 2
                  ? "Need at least 2 players to start the game"
                  : "Waiting for players... (You can start the game)"}
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

              {/* Show Check button when there's no current bet to call or player has matched the bet */}
              {(currentBet === 0 ||
                (currentPlayer && currentPlayer.bet === currentBet)) && (
                <button
                  onClick={onCheck}
                  className="action-button bg-teal-600 hover:bg-teal-700"
                >
                  Check
                </button>
              )}

              {/* Show Call button when there's a current bet to call */}
              {currentPlayer && currentBet > currentPlayer.bet && (
                <button
                  onClick={onCall}
                  className="action-button bg-cyan-600 hover:bg-cyan-700"
                >
                  Call ({formatMoney(currentBet - currentPlayer.bet)})
                </button>
              )}

              <button
                onClick={onRaise}
                className="action-button bg-poker-red hover:bg-red-700"
              >
                {currentBet === 0 ? `Bet` : `Raise`}
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

          {gameState === "playing" &&
            currentPlayer &&
            !currentPlayer.folded &&
            !currentPlayer.allIn &&
            !isMyTurn && (
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

            {/* Show winner information */}
            {winners && winners.length > 0 && (
              <div className="mb-3 p-3 bg-poker-gold/10 border border-poker-gold/30 rounded-lg">
                <h4 className="text-poker-gold font-bold text-sm mb-2">
                  {winners.length === 1 ? "Winner:" : "Winners:"}
                </h4>
                {winners.map((winner) => (
                  <div key={winner.playerId} className="text-sm">
                    <span className="text-poker-gold font-semibold">
                      {winner.playerName}
                    </span>
                    {endReason === "showdown" && (
                      <span className="text-gray-300 ml-2">
                        ({winner.handName})
                      </span>
                    )}
                    <span className="text-green-400 font-bold ml-2">
                      +{formatMoney(winner.winAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {endReason === "early_end" && (
              <p className="text-sm text-gray-300">
                All other players left or folded.
              </p>
            )}
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
          <p className="text-poker-gold font-bold text-sm">
            Restarting Game...
          </p>
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
