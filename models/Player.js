import { GameField } from "../models/GameField.js";
import { PuzzleStorage } from "../models/PuzzleStorage.js";
import MessageTypes from "../enum/MessageTypes.js";
import RoomEvents from "../enum/RoomEvents.js";
import PlayerState from "../enum/PlayerState.js";

export class Player {

    constructor(ws, id, roomEmitter, name) {
        this.ws = ws;
        this.id = id;
        this.roomEmitter = roomEmitter;
        this.indexSectionInPool = 0;
        this.isPlayerDisconnect = false;
        this.name = name;

        this.#handleSubscriptions(true);
        this.changeState(PlayerState.Ready);
    }

    indexSectionInPool = null;
    id = null;
    ws = null;
    roomEmitter = null;
    score = 0;
    name = null;

    state = null;

    puzzleStorage = new PuzzleStorage();
    gameField = new GameField();
    isPlayerDisconnect = null;

    #handleSubscriptions = (isOn) => {
        this.ws.onerror = isOn
            ? (event) => { this.#onError(event) }
            : null

        this.ws.onmessage = isOn
            ? (event) => { this.#onMessage(event) }
            : null

        this.ws.onclose = isOn
            ? (event) => { this.#onClose(event) }
            : null    
    }

    recalculateAllPossiblePuzzlePositions = () => {
        const puzzlesInStorage = this.puzzleStorage.getAllPuzzlesInStorage();

        puzzlesInStorage.forEach((puzzle) => {
            puzzle.possiblePositions = this.gameField.calculateAllPossiblePuzzlePositions(puzzle.gridData);
        });
    }

    changeState = (state) => {
        if (state !== this.state) {
            this.state = state;

            this.roomEmitter.emit(RoomEvents.CHANGE_PLAYER_STATE, this, state);
        }
    }

    updateWS = (ws) => {
        this.ws = ws;

        this.#handleSubscriptions(true);
    }

    #setPuzzle = async (puzzle) => {
        const puzzleIndex = this.puzzleStorage.getPuzzleIndexInStorage(puzzle);

        if (puzzleIndex > -1) {
            const possiblePosition = this.puzzleStorage.findPossiblePositionInPuzzle(puzzleIndex, puzzle.positionInGameField);

            if (possiblePosition) {
                console.log(`puzzle ${puzzle} deleted in storage`);

                const updatedField = await this.gameField.updateField(puzzle);

                if (updatedField.points) {
                    this.score += updatedField.points;
                    
                    this.roomEmitter.emit(RoomEvents.UPDATE_SCORE, this, this.score);
                }

                this.roomEmitter.emit(RoomEvents.UPDATE_GRID, this, updatedField.grid);

                this.puzzleStorage.deletePuzzleInStorage(puzzleIndex);

                if (!this.puzzleStorage.getCountPuzzleInStorage()) {
                    this.indexSectionInPool++;

                    this.roomEmitter.emit(RoomEvents.GET_PUZZLE_SECTION, this);
                } else {
                    this.recalculateAllPossiblePuzzlePositions();

                    const puzzlesInStorage = this.puzzleStorage.getAllPuzzlesInStorage();

                    this.roomEmitter.emit(RoomEvents.UPDATE_POSSIBLE_PUZZLES_POSITIONS, this, puzzlesInStorage);

                    const isBreakPlaying = puzzlesInStorage.every(puzzle => !!!puzzle.possiblePositions.length) 

                    if (isBreakPlaying) { 
                        this.changeState(PlayerState.Finished);
                    }

                }

            } else {
                console.log(`possible position not found in puzzle ${puzzle}`);                        
            }
        } else {
            console.log(`puzzle ${puzzle.gridData} not found in storage`);
        }
    }
    
    #onError = (event) => {
        console.log(`error ws playerID: ${this.id}`);
    }
    
    #onMessage = (event) => {
        if (this.state === PlayerState.Finished) return

        const obj = JSON.parse(event.data);
        const type = obj.type;
        const params = obj.params;

        switch (type) {
            case MessageTypes.SET_PUZZLE:
                this.#setPuzzle(params.puzzle);
                break;

            default:
                console.warn(`Type: ${type} unknown`);
                break;
        }
    }
    
    #onClose = (event) => {
        console.log(`close ws playerID: ${this.id}`);
        this.isPlayerDisconnect = true;

        this.#handleSubscriptions(false);
    }
}