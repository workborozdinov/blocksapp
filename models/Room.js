import { Player } from "./Player.js";
import { readFileSync } from "fs";
import { EventEmitter  } from "events";
import RoomEvents from "../enum/RoomEvents.js";
import SystemEvents from "../enum/SystemEvents.js";
import { Timer } from "../modules/Timer.js";
import { PuzzlePool } from "../modules/PuzzlePool.js";
import MatchState from '../enum/MatchState.js';
import PlayerState from "../enum/PlayerState.js";

export class Room {

    constructor(id, systemEmitter) {
        this.id = id;
        this.emitter = new EventEmitter();

        this.#systemEmitter = systemEmitter;
        // this.#matchState = MatchState.WAITING_TO_START;
        this.#handleSubscriptions();
        this.#changeState(MatchState.WAITING_TO_START);
    }

    emitter = null;
    id = null;

    #maxPlayer = 2;
    #durationMatch = 300000; //5min
    #players = new Map();
    #timer = null;
    #updateTime = 100;
    #puzzlePool = null;
    #state = null
    #systemEmitter = null;
    #opponentsWaitingTime = 30000; //30sec
    #opponentWaitTimer = null;

    addPlayer = (player) => {
        this.#players.set(player.id, player);

        if (!this.isRoomFull()) {
            this.#opponentWaitTimer = new Timer(this.#opponentsWaitingTime, this.#updateTime,
                null,
                () => { this.#systemEmitter.emit(SystemEvents.THROW_ERROR_WAITING_OPPONENT, this, player) },
                null
            );

            this.#opponentWaitTimer.start();
        } else {
            if (this.#opponentWaitTimer) this.#opponentWaitTimer.stop();

            this.#initMatch();
        }
    }

    updateDataPlayer = (player, ws) => {
        if (player.isPlayerDisconnect) {
            player.isPlayerDisconnect = false;
            
            player.updateWS(ws);

            this.#sendMessageToPlayer(player, 'updatePlayerGrid', { grid: player.gameField.getGrid() });
            this.#sendMessageToPlayer(player, 'updatePlayerScore', { score: player.score });
            this.#sendMessageToPlayer(player, 'fillPuzzleStorage', { puzzlesData: player.puzzleStorage.getAllPuzzlesInStorage() });
            this.#sendMessageToPlayer(player, 'setPlayerName', { name: player.name });
            
            for (let player2 of this.#players.values()) {
                if (player2.id !== player.id) {
                    this.#sendMessageToPlayer(player, 'updateEnemyScore', { score: player2.score });
                    this.#sendMessageToPlayer(player, 'updateEnemyGrid', { grid: player2.gameField.getGrid() });
                    this.#sendMessageToPlayer(player, 'setEnemyName', { name: player2.name });

                    if (player2.state === PlayerState.Finished) {
                        this.#sendMessageToPlayer(player, 'enemyFinished', { status: true });
                    }
                }
            }
    
            if (player.state === PlayerState.Finished) {
                this.#sendMessageToPlayer(player, 'changeMatchState', { state: false });
            } else {
                this.#sendMessageToPlayer(player, 'changeMatchState', { state: true });
            }
        }
    }

    getPlayer = (playerID) => {
        return this.#players.get(playerID);
    }

    isRoomFull = () => {
        return this.#players.size === this.#maxPlayer;            
    }

    #handleSubscriptions = () => {
        this.emitter.on(RoomEvents.GET_PUZZLE_SECTION, this.#onGetPuzzleSection);
        this.emitter.on(RoomEvents.UPDATE_POSSIBLE_PUZZLES_POSITIONS, this.#onUpdatePossiblePuzzlePositions);
        this.emitter.on(RoomEvents.UPDATE_SCORE, this.#onUpdateScore);
        this.emitter.on(RoomEvents.UPDATE_GRID, this.#onUpdateGrid);
        this.emitter.on(RoomEvents.CHANGE_PLAYER_STATE, this.#onChangePlayerState);
    }

    #initMatch = () => {
        console.log('initMatch');

        this.#puzzlePool = new PuzzlePool();

        const iterator = this.#players.value();

        const player1 = iterator.next().value;
        const player2 = iterator.next().value; 

        this.#sendMessageToPlayer(player1, 'setPlayerName', { name: player1.name });
        this.#sendMessageToPlayer(player2, 'setPlayerName', { name: player2.name });

        this.#sendMessageToPlayer(player1, 'setEnemyName', { name: player2.name });
        this.#sendMessageToPlayer(player2, 'setEnemyName', { name: player1.name });

        this.#timer = new Timer(this.#durationMatch, this.#updateTime,
            ()=>{ this.#startMatch() },
            ()=>{ this.#finishMatch() },
            (currentTime)=>{ this.#updateMatchTime(currentTime) }
        )

        this.#timer.start();
    }

    #startMatch = async () => {
        console.log('startMatch');

        this.#sendMessageToAllPlayers('changeMatchState', { state: true });

        const sectionGrids = await this.#puzzlePool.getPuzzlesGridsSection(0);

        for (let player of this.#players.values()) {
            const puzzles = sectionGrids.map(el => {
                const puzzle = {
                    gridData: el.slice(),
                    possiblePositions: player.gameField.calculateAllPossiblePuzzlePositions(el)
                }
    
                return puzzle;
            });

            player.puzzleStorage.fillStorage(puzzles);
        
            this.#sendMessageToPlayer(player, 'fillPuzzleStorage', { puzzlesData: puzzles });
        }
    }

    #changeState = (state) => {
        if (state !== this.#state) {
            switch (state) {
                case MatchState.WAITING_TO_START:
                    break;

                case MatchState.STARTED:
                    this.#sendMessageToAllPlayers('changePlayerState', { state: PlayerState.Playing });

                    for (let player of this.#players.values()) {
                        player.changeState(PlayerState.Playing)
                    }
                    
                    break;

                case MatchState.FINISHED:
                    break;

                default: break;
            }
        }
    }

    #finishMatch = () => {
        this.#sendMessageToAllPlayers('changeMatchState', { state: false });

        const iterator = this.#players.values();

        this.#systemEmitter.emit(SystemEvents.ROOM_CLOSED, this, iterator.next().value, iterator.next().value);
    }

    #updateMatchTime = (currentTime) => {
        this.#sendMessageToAllPlayers('updateMatchTime', { time: currentTime });
    }

    #sendMessageToAllPlayers = (messageType, messageParams) => {
        const obj = {
            type: messageType,
            params: messageParams
        }

        for (let player of this.#players.values()) {
            player.ws.send(JSON.stringify(obj));
        }
    }

    #sendMessageToPlayer = (player, messageType, messageParams) => {
        const obj = {
            type: messageType,
            params: messageParams
        }

        player.ws.send(JSON.stringify(obj));
    }

    // #closeRoom = () => {

    // }

    #onGetPuzzleSection = async (player) => {
        const sectionGrids = await this.#puzzlePool.getPuzzlesGridsSection(player.indexSectionInPool);
        
        const puzzles = sectionGrids.map(el => {
            const puzzle = {
                gridData: el.slice(),
                possiblePositions: player.gameField.calculateAllPossiblePuzzlePositions(el)
            }

            return puzzle;
        });

        const isBreakPlaying = puzzles.every(puzzle => !!!puzzle.possiblePositions.length);

        isBreakPlaying && player.changeState(PlayerState.Finished);

        player.puzzleStorage.fillStorage(puzzles);

        this.#sendMessageToPlayer(player, 'fillPuzzleStorage', { puzzlesData: puzzles })
    }

    #onUpdatePossiblePuzzlePositions = (player, puzzles) => {
        this.#sendMessageToPlayer(player, 'updatePuzzlesDataInStorage', { puzzlesData: puzzles });
    }

    #onUpdateScore = (player, score) => {
        this.#sendMessageToPlayer(player, 'updatePlayerScore', { score: score });

        for (let player2 of this.#players.values()) {
            player2.id !== player.id && this.#sendMessageToPlayer(player2, 'updateEnemyScore', { score: score });
        }
    }

    #onUpdateGrid = (player, grid) => {
        this.#sendMessageToPlayer(player, 'updatePlayerGrid', { grid: grid });
    
        for (let player2 of this.#players.values()) {
            player2.id !== player.id && this.#sendMessageToPlayer(player2, 'updateEnemyGrid', { grid: grid });
        }
    }

    #onChangePlayerState = (player, state) => {
        switch (state) {
            case PlayerState.Ready:
                // console.log('change state', state, this.isRoomFull());
                // this.isRoomFull() && this.#initMatch();
                break;

            case PlayerState.Playing: 
                break;

            case PlayerState.Finished:
                this.#sendMessageToPlayer(player, 'changeMatchState', { state: false });

                for (let player2 of this.#players.values()) {
                    if (player2.id !== player.id) {
                        this.#sendMessageToPlayer(player2, 'enemyFinished', { status: true });
                        
                        if (player2.state === PlayerState.Finished) {
                            if (this.#timer) this.#timer.stop();

                            this.#systemEmitter.emit(SystemEvents.ROOM_CLOSED, this, player, player2);
                        }
                    }
                }

                break;

            default: break;
        }
    }
}