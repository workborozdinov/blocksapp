import moment from 'moment';
import axios from 'axios';
import md5 from 'md5';
import { Player } from '../models/Player.js';
import { Room } from '../models/Room.js';
import MessageTypes from '../enum/MessageTypes.js';
import { EventEmitter  } from "events";

const rooms = new Map();
const systemEmitter = new EventEmitter(); 

export const getClient = (req, res) => {
    const { user_id, room_id, battle_id, hash } = req.query;

        if(battle_id) {
            res.render('client/index', {
                roomID: room_id,
                playerID: user_id,
                battleID: battle_id
            });
        } else {
            res.render('otherPages/error');
        }
}

export const joinOrCreateRoom = (ws, event) => {
    const obj = JSON.parse(event.data);
    const type = obj.type;
    const params = obj.params;
    
    ws.onmessage = null;

    if (type === MessageTypes.JOIN_OR_CREATE_ROOM) {
        const { playerID, battleID } = params;
        
        const targetRoom = rooms.get(battleID);
        console.log(MessageTypes.JOIN_OR_CREATE_ROOM)

        if (targetRoom) {
            console.log(`the room ${battleID} is already created!!!`);
            const targetPlayer = targetRoom.getPlayer(playerID);
            
            if (targetPlayer) {
                console.log(`the player ${playerID} is already in the game!!!`);
                // targetRoom.updateDataPlayer();
            } else {
                const player = new Player(ws, playerID, targetRoom.emitter);

                if (targetRoom.isRoomFull()) {
                    console.log(`room ${battleID} is full`)
                } else {
                    targetRoom.addPlayer(player);
                    console.log(`player ${playerID} added successfully`);
                }

            }
        } else {
            const room = new Room(battleID, systemEmitter);
            console.log(`room ${battleID} created successfully!!!`);

            const player = new Player(ws, playerID, room.emitter);
            room.addPlayer(player);
            console.log(`player ${playerID} added successfully`);

            rooms.set(battleID, room);
        }
    }
}