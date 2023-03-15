import { readFileSync } from "fs";
import { resolve } from "path";

export class PuzzlePool {

    constructor() {
        this.#puzzleGrids = JSON.parse(readFileSync('./data/puzzle_grid_data.json')).grids;
    }

    #poolIndexes = [];
    #puzzleGrids = null;
    #sectionSize = 3;

    getPuzzlesGridsSection = async (indexSection) => {
        if (!!this.#poolIndexes[indexSection]) {
            const arrayPuzzleGrid = this.#poolIndexes[indexSection].map(index => this.#puzzleGrids[index]);            

            return arrayPuzzleGrid;
        } else {
            const section = await this.#getNewSectionOfIndexes();

            const arrayPuzzleGrid = section.map(index => this.#puzzleGrids[index]);
            this.#poolIndexes[indexSection] = [...section];

            return arrayPuzzleGrid
        }
    }

    #getNewSectionOfIndexes = async () => {
        const arrUniqueRandomIndexes = [];
        const iterableArr = Array(this.#sectionSize).fill(0);
    
        for (const i of iterableArr) {
            await this.#getUniqueRandomIndex(arrUniqueRandomIndexes);
        }

        return arrUniqueRandomIndexes
    }

    #getUniqueRandomIndex = (ArrUniqueIndexes) => {
        const randomIndex = this.#getRandomIndex(this.#puzzleGrids.length);
    
        if ( ArrUniqueIndexes.includes(randomIndex) ) {
            this.#getUniqueRandomIndex(ArrUniqueIndexes);
        } else {
            return new Promise((resolve, reject) => {
                ArrUniqueIndexes.push(randomIndex);

                resolve(randomIndex);
            })

        }
    }

    #getRandomIndex = (maxIndex) => {
        return Math.floor(Math.random() * maxIndex);
    }

}