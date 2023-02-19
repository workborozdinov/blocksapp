import express from 'express';
import cors from 'cors';
import path from 'path'
import http from 'http';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { Room } from './objects/Room.js';
import axios from 'axios';
import md5 from 'md5'; 

import { WebSocketServer } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT;
const rooms = [];
const room = new Room();

app.use(express.static(path.resolve(__dirname, 'client')));

app.use(cors({
    origin: process.env.CORS
}));

app.route('/api/v1/check_user')
    .post((req, res) => {

        const query = req.body;
        const hashMd5 = md5(query.game_id+':'+query.user_id+':'+query.room_id+':'+query.battle_id+':'+query.timestamp+':'+process.env.SECRET_KEY);

        if (hashMd5 === query.hash) {
            const targetRoom = rooms.find(rooms => room.id === query.room_id);

            if (targetRoom) {
                
            }
        }
    })

const server = http.createServer(app);

const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
    wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
    });
});
  
wss.on('connection', function (ws, request) {
    room.createPlayer(ws);
});

server.listen(port, function () {
    console.log('Listening on http://localhost:'+port);
});