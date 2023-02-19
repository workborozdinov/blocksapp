export class Player {

    constructor(ws, id) {
        this.ws = ws;
        this.id = id;


        console.log(this.id);
    }

    id = null;
    ws = null;
    indexForPool = 0;
}