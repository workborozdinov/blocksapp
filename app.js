import express from 'express';
import cors from 'cors';
import path from 'path'
import http from 'http';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getClient, joinOrCreateRoom, checkUser } from './controllers/gameController.js';

import { WebSocketServer } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT;

app.use(cors({
    origin: process.env.CORS
}));

app.use(express.static(path.resolve(__dirname, 'client')))
    .set('view engine', 'ejs')
    .get('/', getClient);

//FIX
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.route('/api/v1/check_user')
    .post(checkUser);

const server = http.createServer(app);

const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
    wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', function (ws, request) {
    console.log('connection')
    ws.onmessage = (event) => { joinOrCreateRoom(ws, event) }
});

server.listen(port, function () {
    console.log('Listening on http://localhost:'+port);
});