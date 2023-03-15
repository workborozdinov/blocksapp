import { Player } from "./Player.js";
import { readFileSync } from "fs";

export class Room {

    constructor(id) {
        this.puzzleGridData = JSON.parse(readFileSync('./data/puzzle_grid_data.json')).grids;

        // this.fillPool(3, this.puzzlePool);
        this.id = id;
    }

    maxPlayer = 2;
    durationMatch = 300000; //5min
    players = [];
    currentMatchTime = 0;
    startMatchTime = 0;
    id = 0;
    isMatchOn = false;
    timer = null;
    updateTime = 100;
    puzzleGridData = null;
    puzzlePool = [];

    createPlayer(ws) {
        const player = new Player(ws, this.players.length);
        this.players.push(player);
        this.handlePlayerSubscription(player);

        if (this.players.length === this.maxPlayer) {
            this.startGame();
        }
    }

    startGame() {
        this.startMatchTime = Date.now();
        this.isMatchOn = true;

        const objMatch = {
            type: 'match',
            params: {
                start: true
            }
        }

        this.players.forEach(player => {
            player.ws.send(JSON.stringify(objMatch));
        });

        this.startTimer()
    }

    endGame() {
        this.isMatchOn = false;

        const objMatch = {
            type: 'match',
            params: {
                end: true
            }
        }

        this.players.forEach(player => {
            player.ws.send(JSON.stringify(objMatch));
        });
    }

    updateMatchTime() {
        this.currentMatchTime = this.durationMatch - (Date.now() - this.startMatchTime);
    }

    async fillPool(numberPuzzles = 3, pool, callback) {
        const arrPuzzleGridIndex = [];
        const iterableArr = Array(numberPuzzles).fill(0);

        for ( const i of iterableArr ) {
            await this.fillUniqueRandomIndex(this.puzzleGridData, arrPuzzleGridIndex, pool);
        }

        callback();
    }

    fillUniqueRandomIndex(arr, arrIndex, pool) {
        const randomIndex = this.getRandomIndex(arr);

        if (arrIndex.includes(randomIndex)) {
            this.fillUniqueRandomIndex(arr, arrIndex, pool);
        } else {
            return new Promise( (resolve, reject) => {
                arrIndex.push(randomIndex);
                pool.push(arr[randomIndex]);
                resolve(randomIndex)
            });
        }
    }

    getRandomIndex(arr) {
        return Math.floor(Math.random() * arr.length);
    }

    startTimer() {
        this.timer = setInterval(()=>{
            this.updateMatchTime();

            if (this.currentMatchTime < 0) {
                clearInterval(this.timer);
                this.endGame();
            } else {
                const objTime = {
                    type: 'time',
                    params: {
                        time: this.currentMatchTime
                    }
                }

                this.players.forEach(player => {
                    player.ws.send(JSON.stringify(objTime));
                });
            }

        }, this.updateTime);
    }

    sendPuzzles(indexForPool, amount, player) {
        const startPosition = indexForPool * amount;
        const endPosition =  startPosition + amount + 1;

        const objPuzzles = {
            type: 'puzzle',
            params: {
                array: this.puzzlePool.slice(startPosition,  endPosition)
            }
        }

        player.ws.send(JSON.stringify(objPuzzles));

        player.indexForPool++
    }

    sendGrid(array, enemy) {
        const objGrid = {
            type: 'grid',
            params: {
                array: array
            }
        }

        enemy.ws.send(JSON.stringify(objGrid));
    }

    sendScore(points, enemy) {
        const objScore = {
            type: 'score',
            params: {
                points: points
            }
        }

        enemy.ws.send(JSON.stringify(objScore));
    }

    handlePlayerSubscription(player) {
        player.ws.onerror = (event) => { this.onError(event, player) }

        player.ws.onmessage = (event) => { this.onMessage(event, player) }

        player.ws.onclose = (event) => { this.onClose(event, player) }
    }

    onMessage(event, player) {
        const obj = JSON.parse(event.data);
        const type = obj.type;
        const params = obj.params;

        switch (type) {
            case 'puzzle':
                if ((player.indexForPool * params.amount + params.amount) > this.puzzlePool.length) {
                    this.fillPool(params.amount, this.puzzlePool, ()=>{
                        this.sendPuzzles(player.indexForPool, params.amount, player);
                    });
                } else {
                    this.sendPuzzles(player.indexForPool, params.amount, player);
                }
                break;

            case 'grid':
                if (Array.isArray(params.array)) {
                    const enemy = this.players.find(elPlayer => elPlayer.id !== player.id);

                    if (enemy) this.sendGrid(params.array, enemy);
                }
                break;

            case 'score':
                const enemy = this.players.find(elPlayer => elPlayer.id !== player.id);

                if (enemy) this.sendScore(params.points, enemy);
                break;
                
            default:
                console.warn(`Type: ${type} unknown`);
                break;
        }

    }

    onClose(event, player) {

    }

    onError(event, player) {

    }
}