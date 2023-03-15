import { Player } from "./Player.js";
import { readFileSync } from "fs";
import { EventEmitter  } from "events";
import RoomEvents from "../enum/roomEvents.js";
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

    addPlayer = (player) => {
        this.#players.set(player.id, player);

        // this.isRoomFull() && this.#initGame();

        setTimeout(()=>{
            this.#initGame();
        }, 2000);
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

    #initGame = () => {
        console.log('initGame');

        this.#puzzlePool = new PuzzlePool();

        this.#timer = new Timer(this.#durationMatch, this.#updateTime,
            ()=>{ this.#startGame() },
            ()=>{ this.#finishGame() },
            (currentTime)=>{ this.#updateMatchTime(currentTime) }
        )

        this.#timer.start();
    }

    #startGame = async () => {
        console.log('startGame');

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

    #finishGame = () => {
        this.#sendMessageToAllPlayers('changeMatchState', { state: false });
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

                break;

            case PlayerState.Playing: 
                break;

            case PlayerState.Finished:
                this.#sendMessageToPlayer(player, 'changeMatchState', { state: false });
            
                break;

            default: break;
        }
    }
}