const RoomEvents = {
    PLAYER_READY: 'player_ready',
    GET_PUZZLE_SECTION: 'get_puzzle_section',
    UPDATE_POSSIBLE_PUZZLES_POSITIONS: 'updatePossiblePuzzlesPositions',
    UPDATE_SCORE: 'updateScore',
    UPDATE_GRID: 'updateGrid',
    CHANGE_PLAYER_STATE: 'changePlayerState',
    SET_PLAYER_NAME: 'setPlayerName'
}

Object.freeze(RoomEvents);

export default RoomEvents;