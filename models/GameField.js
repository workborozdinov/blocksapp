export class GameField {

    constructor() { }

    #grid = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]
    
    updateField = async (puzzle) => {
        this.#addPuzzle(puzzle.positionInGameField);
        const foundCombinations = this.#getAllCombinations();

        foundCombinations.combinationsCount && this.#destroyCell(foundCombinations.arrCombinationsCellsIndexUnique); 

        return {
            grid: this.#grid,
            points: foundCombinations.combinationsCount * foundCombinations.arrCombinationsCellsIndexUnique.length
        }
    }

    getGrid = () => {
        return this.#grid;
    }

    #addPuzzle = (positionInGameField) => {
        positionInGameField.forEach(stroke => stroke.forEach(cell => cell.isEmpty && (this.#grid[cell.i][cell.j] = 1)));
    }

    #getStrokeCombinations = () => {
        let countCombinations = 0;
        const arrIndexAllCell = [];

        for ( let i = 0; i < this.#grid.length; i++ ) {
            let isSuccess = this.#grid[i].every(cell => cell);

            if (isSuccess) {
                let arrIndexStrokeCell = this.#grid[i].map((cell, j) => {
                    return {i: i, j: j}
                });

                arrIndexAllCell.push(arrIndexStrokeCell);
                countCombinations++;
            }

            if (i === (this.#grid.length - 1)) {
                return {
                    countCombinations: countCombinations,
                    arrIndexCells: arrIndexAllCell.flat()
                }
            }
        }
    }
    
    #getColumnCombinations = () => {
        let countCombinations = 0;
        const arrIndexAllCell = [];

        for ( let i = 0; i < this.#grid.length; i++ ) {
            let isSuccess = true;
            let arrTmp = [];
            for ( let j = 0; j < this.#grid[i].length; j++ ) {
                
                if (!this.#grid[j][i]) {
                    isSuccess = false;
                    break;
                } else {
                    arrTmp.push({i: j, j: i});
                }

            }

            if (isSuccess) {
                arrIndexAllCell.push(arrTmp);
                countCombinations++;
            }

            if (i === this.#grid.length - 1) {
                return {
                    countCombinations: countCombinations,
                    arrIndexCells: arrIndexAllCell.flat()
                }
            }
        }
    }

    #getBlockCombinations = () => {
        let countCombinations = 0;
        const arrIndexAllCell = [];

        for (let k = 0; k < 9; k++) {
            let isSuccess = true;
            let arrTmp = [];

            for (let i = Math.trunc(k / 3) * 3; i < (Math.trunc(k / 3) + 1) * 3; i++) {
                for (let j = (k % 3) * 3; j < ((k % 3) + 1) * 3 ; j++) {
            
                    if (!this.#grid[i][j]) {
                        isSuccess = false;
                        break;
                    } else {
                        arrTmp.push({i: i, j: j});
                    }
                }

                if (!isSuccess) break;
            }

            if (isSuccess) {
                arrIndexAllCell.push(arrTmp);
                countCombinations++
            }
        
            if (k === 8) {
                return {
                    countCombinations: countCombinations,
                    arrIndexCells: arrIndexAllCell.flat()
                }
            }
        }
    }
    
    #getAllCombinations = () => {
        const strokeCombinations = this.#getStrokeCombinations();
        const columnCombinations = this.#getColumnCombinations();
        const blockCombinations = this.#getBlockCombinations();

        const allCountCombinations = strokeCombinations.countCombinations + columnCombinations.countCombinations + blockCombinations.countCombinations;
        const arrCombinationsIndexCells = [...strokeCombinations.arrIndexCells, ...columnCombinations.arrIndexCells, ...blockCombinations.arrIndexCells];
    
        let arrCombinationsCellsIndexUnique = arrCombinationsIndexCells.filter((el1, index) => {
            return arrCombinationsIndexCells.findIndex(el2 => el1.i === el2.i && el1.j === el2.j) === index;
        });

        return {
            combinationsCount: allCountCombinations,
            arrCombinationsCellsIndexUnique: arrCombinationsCellsIndexUnique
        }
    }

    #destroyCell = (arrCellIndex) => {
        arrCellIndex.forEach((index) => this.#grid[index.i][index.j] = 0);
    }

    checkCombinations = async () => {
        // const allCombinations = this.#getAllCombinations();
    }

    calculateAllPossiblePuzzlePositions = (puzzleGrid) => {
        const arrayPossiblePositions = [];

        for (let i = 0; i < this.#grid.length - puzzleGrid.length + 1; i++) {
            for (let j = 0; j < this.#grid[i].length - puzzleGrid[0].length + 1; j++) {
                
                let isSuccess = true;
                const possiblePosition = JSON.parse(JSON.stringify(puzzleGrid));

                for (let k = 0; k < puzzleGrid.length; k++) {
                    for (let p = 0; p < puzzleGrid[k].length; p++) {
                        
                        if (this.#grid[i+k][j+p] && puzzleGrid[k][p]) {
                            isSuccess = false;
                            break;
                        } else {
                            possiblePosition[k][p] = {i: i+k, j: j+p, isEmpty: puzzleGrid[k][p]}
                        }

                    }

                    if (!isSuccess) break;
                }

                if (isSuccess) {
                    arrayPossiblePositions.push(possiblePosition);
                }

            }    
        }

        return arrayPossiblePositions;
    }
}