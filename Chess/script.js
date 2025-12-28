var board = null;
var game = new Chess();
var $status = $('#status');
var $history = $('#move-history');
var gameMode = 'pvc';
var peer = new Peer(); // Create P2P Peer
var conn = null;
var myColor = 'w';

// --- P2P NETWORK LOGIC ---

// 1. Get your Room Code
peer.on('open', (id) => {
    $('#my-id').text(id);
    $status.text("READY TO PLAY");
});

// 2. Listen for a Friend Joining
peer.on('connection', (connection) => {
    conn = connection;
    setupChat();
    myColor = 'w'; // Host is always White
    $('#player-color').text("White (Host)");
    $status.text("FRIEND JOINED! YOUR MOVE.");
    setMode('lan');
});

// 3. Joining a Friend's Room
function connectToPeer() {
    const friendId = $('#join-id').val();
    conn = peer.connect(friendId);
    setupChat();
    myColor = 'b'; // Joiner is always Black
    board.flip();
    $('#player-color').text("Black (Guest)");
    $status.text("CONNECTED! WAITING FOR WHITE...");
    setMode('lan');
}

function setupChat() {
    conn.on('data', (data) => {
        // When we receive a move from the other player
        game.move(data.move);
        board.position(game.fen());
        applyMoveVisuals(data.move.from, data.move.to);
        updateStatus();
        updateHistory(data.move);
    });
}

// --- GAME LOGIC ---

function onDragStart (source, piece, position, orientation) {
    if (game.game_over()) return false;
    
    // In LAN mode, only allow moving your own color
    if (gameMode === 'lan' && piece.search(new RegExp('^' + myColor)) === -1) return false;

    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop (source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    applyMoveVisuals(source, target);
    updateStatus();
    updateHistory(move);

    if (gameMode === 'pvc') {
        window.setTimeout(makeRandomMove, 500);
    } else if (gameMode === 'pvp') {
        window.setTimeout(() => board.flip(), 700);
    } else if (gameMode === 'lan' && conn) {
        // Send move to friend
        conn.send({ move: move });
    }
}

// (Keep makeRandomMove, applyMoveVisuals, updateStatus, updateHistory, resetGame, and onSnapEnd from previous version)

function setMode(mode) {
    gameMode = mode;
    $('.mode-selector button').removeClass('active');
    if (mode === 'pvc') $('#pvc-btn').addClass('active');
    else if (mode === 'pvp') $('#pvp-btn').addClass('active');
    else $('#lan-btn').addClass('active');
}

function openLanMenu() { $('#lan-menu').fadeToggle(); }

var config = {
    draggable: true,
    position: 'start',
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen())
};
board = Chessboard('board', config);