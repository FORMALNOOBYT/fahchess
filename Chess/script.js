var board = null;
var game = new Chess();
var gameMode = 'pvc';
var peer = new Peer(); 
var conn = null;
var myColor = 'w';

// --- PEER NETWORKING ---
peer.on('open', (id) => {
    $('#my-id').text(id);
    $('#net-status').text("Online");
    $('#status').text("SYSTEM READY");
});

peer.on('connection', (connection) => {
    conn = connection;
    myColor = 'w';
    setMode('lan');
    $('#player-role').text("White (Host)");
    $('#status').text("FRIEND JOINED! YOUR MOVE.");
    setupSocket();
});

function connectToPeer() {
    const friendId = $('#join-id').val();
    if(!friendId) return alert("Enter a code!");
    conn = peer.connect(friendId);
    myColor = 'b';
    setMode('lan');
    board.flip();
    $('#player-role').text("Black (Guest)");
    $('#status').text("CONNECTED! WAITING...");
    setupSocket();
}

function setupSocket() {
    conn.on('data', (data) => {
        game.move(data.move);
        board.position(game.fen());
        applyMoveVisuals(data.move.from, data.move.to);
        updateStatus();
    });
}

// --- CORE GAME LOGIC ---
function onDragStart (source, piece) {
    if (game.game_over()) return false;
    if (gameMode === 'lan' && piece.search(new RegExp('^' + myColor)) === -1) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) return false;
}

function onDrop (source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback'; // Only TP back if move is actually illegal

    applyMoveVisuals(source, target);
    updateStatus();
    
    if (gameMode === 'pvc') window.setTimeout(makeRandomMove, 500);
    else if (gameMode === 'pvp') window.setTimeout(() => board.flip(), 700);
    else if (gameMode === 'lan' && conn) conn.send({ move: move });
}

function makeRandomMove () {
    var moves = game.moves({ verbose: true });
    if (moves.length === 0) return;
    var move = moves[Math.floor(Math.random() * moves.length)];
    game.move(move);
    board.position(game.fen());
    applyMoveVisuals(move.from, move.to);
    updateStatus();
}

function applyMoveVisuals(from, to) {
    $('.square-55d63').removeClass('highlight-last');
    $('.square-' + from).addClass('highlight-last');
    $('.square-' + to).addClass('highlight-last');
    var turn = game.turn() === 'b' ? 'White' : 'Black';
    $('#move-history').prepend(`<div class="move-entry"><b>${turn}:</b> ${from} → ${to}</div>`);
}

function setMode(mode) {
    gameMode = mode;
    $('.mode-selector button').removeClass('active');
    $(`#${mode}-btn`).addClass('active');
    $('#current-mode').text(mode.toUpperCase());
    if(mode !== 'lan') $('#lan-menu').hide();
    resetGame();
}

function openLanMenu() { $('#lan-menu').fadeToggle(); }
function resetGame() { 
    game.reset(); 
    board.start(); 
    if (myColor === 'b' && gameMode === 'lan') board.flip();
    $('#move-history').empty(); 
    updateStatus(); 
}
function updateStatus() {
    var s = game.turn() === 'w' ? "White's Turn" : "Black's Turn";
    if(game.in_check()) s += " (CHECK!)";
    if(game.game_over()) s = "GAME OVER";
    $('#status').text(s);
}

board = Chessboard('board', {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen()),
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
});
