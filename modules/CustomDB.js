import { readFileSync, writeFileSync, writeFile, existsSync } from "fs";

class CustomDB {

    constructor() {}

    #mainPath = './logs/';
    #matches = {};

    getData = (battleID) => {
        if (!battleID) return null;

        if (this.#matches[battleID]) { 
            return this.#matches[battleID]; 
        } else {
            const path = this.#mainPath + battleID + '.json';
        
            if (existsSync(path)) { 
                this.#matches[battleID] = JSON.parse(readFileSync(path));

                return this.#matches[battleID];
            } else {
                return null;
            }
        }
    }

    initData = (battleID, data, cb) => {
        if (!battleID && !data) return;

        this.#matches[battleID] = JSON.parse(JSON.stringify(data));
    }

    saveData = (battleID, cb) => {
        if (!battleID && !this.#matches[battleID]) return;
        
        const path = this.#mainPath + battleID + '.json';

        writeFile(path, JSON.stringify(this.#matches[battleID]), 'utf8', (err) => typeof cb === 'function' && cb(err));
    }
}

const customDB = new CustomDB();

export default customDB; 