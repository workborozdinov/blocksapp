export class Timer {

    constructor(duration = 10000, updateTime = 1000, startCb = null, completeCb = null, updateCb = null) {
        this.#startCallback = startCb;
        this.#completeCallback = completeCb;
        this.#updateCallback = updateCb;
        this.#updateTime = updateTime;
        this.#duration = duration;
    }

    #startCallback = null;
    #completeCallback = null;
    #updateCallback = null;
    #timer = null;
    #updateTime = null;
    #duration = null;
    #startTime = null;
    #currentTime = null;
    #wasLaunched = false;

    start = () => {
        if (this.#wasLaunched) {
            console.log('timer already started!!!')
            return;
        }

        this.#wasLaunched = true;

        this.#startTime = Date.now();

        typeof this.#startCallback === 'function' && this.#startCallback();

        this.#timer = setInterval(()=>{
            this.#currentTime = this.#getCurrentTime();

            if (this.#currentTime < 0) {
                this.#complete();
            } else {
                typeof this.#updateCallback === 'function' && this.#updateCallback(this.#currentTime);
            }

        }, this.#updateTime);
    }

    stop = () => {
        clearInterval(this.#timer);
    }

    #complete = () => {
        this.stop();

        typeof this.#completeCallback === 'function' && this.#completeCallback();
    }

    #getCurrentTime = () => {
        return this.#duration - (Date.now() - this.#startTime);
    }
}