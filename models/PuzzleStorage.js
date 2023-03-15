export class PuzzleStorage {

    constructor() { }

    #puzzles = [];

    getPuzzleIndexInStorage = (puzzle) => {
        let puzzleIndex = this.#puzzles.findIndex(puzzleInStorage => this.#isEqualGrid(puzzleInStorage.gridData, puzzle.gridData)); 

        return puzzleIndex;
    }

    getCountPuzzleInStorage = () => {
        return this.#puzzles.length;
    }

    getAllPuzzlesInStorage = () => {
        return this.#puzzles
    }

    #isEqualGrid = (puzzleGridOne, puzzleGridTwo) => {
        const isEqual = puzzleGridOne.length === puzzleGridTwo.length && puzzleGridOne[0].length === puzzleGridTwo[0].length
                        && puzzleGridOne.every((stroke, i) => stroke.every((cell, j) => cell === puzzleGridTwo[i][j]));
        
        return isEqual
    }

    findPossiblePositionInPuzzle = (puzzleIndex, positionInGameField) => {
        return this.#puzzles[puzzleIndex].possiblePositions.find(possiblePosition =>
            possiblePosition.every((stroke, i) => stroke.every((cell, j) => {
                return (
                    (cell.i === positionInGameField[i][j].i)
                    &&
                    (cell.j === positionInGameField[i][j].j)
                    &&
                    (cell.isEmpty === positionInGameField[i][j].isEmpty)
                )
            })))
    }

    deletePuzzleInStorage = (puzzleIndex) => {
        this.#puzzles.splice(puzzleIndex, 1);
    }

    fillStorage = (puzzles) => {
        this.#puzzles = puzzles;
    }
}