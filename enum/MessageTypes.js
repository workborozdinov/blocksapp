const MessageTypes = {
    UPDATE_PLAYER_GRID: 'updatePlayerGrid',
    UPDATE_ENEMY_GRID: 'updateEnemyGrid',
    UPDATE_PLAYER_SCORE: 'updatePlayerScore',
    UPDATE_ENEMY_SCORE: 'updateEnemyScore',
    FILL_PUZZLE_STORAGE: 'fillPuzzleStorage',
    UPDATE_MATCH_TIME: 'updateMatchTime',
    CHANGE_MATCH_STATE: 'changeMatchState',

    SET_PUZZLE: 'setPuzzle',
    JOIN_OR_CREATE_ROOM: 'joinOrCreate'
}

Object.freeze(MessageTypes);

export default MessageTypes;