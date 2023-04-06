import moment from 'moment';
import axios from 'axios';
import md5 from 'md5';
import winston from 'winston';
import { Player } from '../models/Player.js';
import { Room } from '../models/Room.js';
import MessageTypes from '../enum/MessageTypes.js';
import { EventEmitter  } from "events";
import SystemEvents from '../enum/SystemEvents.js';
import CustomDB from '../modules/CustomDB.js';

const GAME_ID = '908802';
const SECRET_KEY = 'w4tvp5GKPrb1X8Uf3hsSLCDzPDPMx9';

const rooms = new Map();
const systemEmitter = new EventEmitter();

export const getClient = (req, res) => {
    const { user_id, room_id, battle_id, hash } = req.query;
    const timestamp = moment.utc().format('X');

    if(battle_id && user_id && room_id) {
        const hashMd5 = md5(GAME_ID+':'+user_id+':'+room_id+':'+battle_id+':'+timestamp+':'+SECRET_KEY);

        let data= {
            'game_id': GAME_ID,
            'user_id': user_id,
            'room_id': room_id,
            'battle_id': battle_id,
            'hash': hashMd5,
            'timestamp': timestamp
        }

        axios.post('https://mindplays.com/api/v1/info_game', data)
            .then((res)=>{
                const responseData = res.data.data;
                const user = responseData.user;
                
                let matchData = CustomDB.getData(battle_id);

                if (matchData) {
                    if (!matchData.players[responseData.user_id]) {
                        matchData.players[responseData.user_id] = {
                            user: user,
                            data: null,
                            result_amount: null
                        }

                        CustomDB.saveData(responseData.battle_id);
                    }
                } else {
                    matchData = {
                        battle: responseData,
                        start_timestamp: moment.utc().format('X'),
                        finish_timestamp: null,
                        players: {},
                    }

                    matchData.players[responseData.user_id] = {
                        user: user,
                        data: null,
                        result_amount: null
                    }

                    CustomDB.initData(responseData.battle_id, matchData);

                    CustomDB.saveData(responseData.battle_id);

                }

                res.render('client/index', {
                    roomID: room_id,
                    playerID: user_id,
                    battleID: battle_id
                });
            })
            .catch((err) => {
                res.render('otherPages/error');
            })
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
        const matchData = CustomDB.get(battleID);
        console.log(MessageTypes.JOIN_OR_CREATE_ROOM)

        if (targetRoom) {
            console.log(`the room ${battleID} is already created!!!`);
            const targetPlayer = targetRoom.getPlayer(playerID);
            
            if (targetPlayer) {
                console.log(`the player ${playerID} is already in the game!!!`);
                targetRoom.updateDataPlayer(targetPlayer, ws);
            } else {
                const player = new Player(ws, playerID, targetRoom.emitter, matchData.players[playerID].name);

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

            const player = new Player(ws, playerID, room.emitter, matchData.players[playerID].name);
            room.addPlayer(player);
            console.log(`player ${playerID} added successfully`);

            rooms.set(battleID, room);
        }
    }
}

export const checkUser = (req, res) => {
    const { game_id, user_id, room_id, battle_id, timestamp } = req.body;
    const hashMd5 = md5(game_id+':'+user_id+':'+room_id+':'+battle_id+':'+timestamp+':'+SECRET_KEY);

    if (hashMd5 == query.hash) {
        const matchData = CustomDB.getData(query.battle_id);

        if (matchData) {
            const user = matchData.players[user_id];

            if (user) {
                const responseData = {
                    "user_id": user_id,
                    "game_id": game_id,
                    "room_id": room_id,
                    "battle_id": battle_id,
                    "timestamp": moment.utc().format('X'),
                    "result_amount": user.result_amount,
                    "start_timestamp": matchData.start_timestamp,
                    "finish_timestamp": matchData.finish_timestamp,
                    "data": user.data,
                    "hash": md5(game_id+':'+user_id+':'+room_id+':'+battle_id+':'+timestamp+':'+SECRET_KEY)
                };
    
                res.status(200).send(responseData);
    
                console.log('responseData', responseData);
            } else {
                res.status(400).send({
                    'status': 400,
                    'error': {
                        'message': 'player in game not found'
                    }
                })
            }
        } else {
            res.status(400).send({
                'status': 400,
                'error': {
                    'message': 'game not found'
                }
            })
        }
    } else {
        console.log('hash does not match');

        res.status(400).send({
            'status': 400,
            'error': {
                'message': 'hash does not match'
            }
        })
    }
}

const handleSubscription = (emitter) => {
    emitter.on(SystemEvents.ROOM_CLOSED, onRoomClosed);
    emitter.on(SystemEvents.THROW_ERROR_WAITING_OPPONENT, onErrorWaitingOpponent);
}

const onErrorWaitingOpponent = (room, player) => {
    const matchData = CustomDB.getData(room.id);

    if (matchData) {
        const timestamp = moment.utc().format('X'); 

        const data = {
            game_id: GAME_ID,
            user_id: player.id,
            room_id: matchData.battle.room_id,
            battle_id: matchData.battle.battle_id,
            hash: md5(GAME_ID+':'+player.id+':'+matchData.battle.room_id+':'+matchData.battle.battle_id+':'+timestamp+SECRET_KEY),
            timestamp: timestamp,
            comment: 'Error waiting opponent'
        }

        axios.post('https://mindplays.com/api/v1/close_game', data)
            .then((response) => {
                const isDeletedRoom = rooms.delete(room.id);

                console.log(`room ${room.id} deleted status ${isDeletedRoom}`);
            })
            .catch((err) => {

            })
    }

}

const onRoomClosed = (room, player1, player2) => {
    const timestamp = moment.utc().format('X');

    const matchData = CustomDB.getData(room.id);

    const isDraw = player1.score === player2.score;

    let player1Data = null;
    let player2Data = null;

    if (isDraw) {
        player1Data = {
            game_id: GAME_ID,
            room_id: matchData.battle.room_id,
            battle_id: matchData.battle.battle_id,
            timestamp: timestamp,
            start_timestamp: matchData.start_timestamp,
            finish_timestamp: timestamp,
            hash: md5(GAME_ID+':'+player1.id+':'+matchData.battle.room_id+':'+matchData.battle.battle_id+':'+timestamp+':'+SECRET_KEY),
            user_id: player1.id,
            data: [{
                operation_type: 3,
                amount: 0,
                opponent_id: player2.id,
                comment: 'draw'
            }],
            result_amount: matchData.battle.amount
        }
    
        player2Data = {
            game_id: GAME_ID,
            room_id: matchData.battle.room_id,
            battle_id: matchData.battle.battle_id,
            timestamp: timestamp,
            start_timestamp: matchData.start_timestamp,
            finish_timestamp: timestamp,
            hash: md5(GAME_ID+':'+player2.id+':'+matchData.battle.room_id+':'+matchData.battle.battle_id+':'+timestamp+':'+SECRET_KEY),
            user_id: player2.id,
            data: [{
                operation_type: 3,
                amount: 0,
                opponent_id: player1.id,
                comment: 'draw'
            }],
            result_amount: matchData.battle.amount
        }
    } else {
        const winner = player1.score > player2.score
                        ? player1
                        : player2


        const loser = player1.score > player2.score
                        ? player2
                        : player1

        player1Data = {
            game_id: GAME_ID,
            room_id: matchData.battle.room_id,
            battle_id: matchData.battle.battle_id,
            timestamp: timestamp,
            start_timestamp: matchData.start_timestamp,
            finish_timestamp: timestamp,
            hash: md5(GAME_ID+':'+winner.id+':'+matchData.battle.room_id+':'+matchData.battle.battle_id+':'+timestamp+':'+SECRET_KEY),
            user_id: winner.id,
            data: [{
                operation_type: 1,
                amount: matchData.battle.amount,
                opponent_id: loser.id,
                comment: 'win'
            }],
            result_amount: matchData.battle.amount * 2
        }
    
        player2Data = {
            game_id: GAME_ID,
            room_id: matchData.battle.room_id,
            battle_id: matchData.battle.battle_id,
            timestamp: timestamp,
            start_timestamp: matchData.start_timestamp,
            finish_timestamp: timestamp,
            hash: md5(GAME_ID+':'+loser.id+':'+matchData.battle.room_id+':'+matchData.battle.battle_id+':'+timestamp+':'+SECRET_KEY),
            user_id: loser.id,
            data: [{
                operation_type: 2,
                amount: matchData.battle.amount,
                opponent_id: winner.id,
                comment: 'lose'
            }],
            result_amount: 0
        }
    }

    axios.post('https://mindplays.com/api/v1/result_game', player1Data)
        .then((response)=> {
            matchData.players[player1Data.user_id] = {
                result_amount: player1Data.result_amount,
                data: [{
                    operation_type: player1Data.data.operation_type,
                    amount: player1Data.data.amount,
                    opponent_id: player1Data.data.opponent_id,
                    comment: player1Data.data.comment
                }]
            }

            matchData.finish_timestamp = timestamp;

            CustomDB.saveData(matchData.battle.battle_id);
        })
        .catch(function (err) {
            console.log('err result_game', err)
        });

    axios.post('https://mindplays.com/api/v1/result_game', player2Data)
        .then((response)=> {
            matchData.players[player2Data.user_id] = {
                result_amount: player2Data.result_amount,
                data: [{
                    operation_type: player2Data.data.operation_type,
                    amount: player2Data.data.amount,
                    opponent_id: player2Data.data.opponent_id,
                    comment: player2Data.data.comment
                }]
            }

            matchData.finish_timestamp = timestamp;

            CustomDB.saveData(matchData.battle.battle_id);
        })
        .catch(function (err) {
            console.log('err result_game', err)
        });

    const isDeletedRoom = rooms.delete(room.id);

    // console.log('winner score:' + winner.score);
    console.log(`room ${room.id} deleted status ${isDeletedRoom}`);
}

handleSubscription(systemEmitter);