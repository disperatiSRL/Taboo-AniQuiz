// server.js - Versione con squadre A/B e punteggi di squadra
const WebSocket = require('ws');
const http = require('http');

// ---------- Configurazione ----------
const PORT = process.env.PORT || 8080;

// ---------- Mazzo di carte ----------
const CARDS = [
    { word: "Gatto", forbidden: ["Felino", "Animale", "Domestico", "Zampa"] },
    { word: "Pizza", forbidden: ["Impasto", "Mozzarella", "Pomodoro", "Forno"] },
    { word: "Spiaggia", forbidden: ["Mare", "Sabbia", "Ombrellone", "Estate"] },
    { word: "Bicicletta", forbidden: ["Ruote", "Pedali", "Manubrio", "Casco"] },
    { word: "Cioccolato", forbidden: ["Dolce", "Cacao", "Tavoletta", "Fondente"] },
    { word: "Computer", forbidden: ["Schermo", "Tastiera", "Mouse", "Processore"] },
    { word: "Hotel", forbidden: ["Camera", "Ricevimento", "Vacanza", "Letto"] },
    { word: "Delfino", forbidden: ["Mare", "Pinna", "Saltare", "Animale"] },
    { word: "Caffè", forbidden: ["Colazione", "Caffeina", "Tazzina", "Arabica"] },
    { word: "Chitarra", forbidden: ["Corde", "Musica", "Plettro", "Legno"] },
    { word: "Elefante", forbidden: ["Proboscide", "Zanna", "Grande", "Africa"] },
    { word: "Vino", forbidden: ["Uva", "Bicchiere", "Alcol", "Cantina"] },
    { word: "Treno", forbidden: ["Binari", "Stazione", "Vagone", "Viaggio"] },
    { word: "Libreria", forbidden: ["Libri", "Scaffali", "Leggere", "Cartaceo"] },
    { word: "Pinguino", forbidden: ["Antartide", "Freddo", "Ali", "Nero"] },
    { word: "Torta", forbidden: ["Compleanno", "Panna", "Zucchero", "Forno"] },
    { word: "Dentista", forbidden: ["Denti", "Paura", "Trapano", "Igiene"] },
    { word: "Telefono", forbidden: ["Chiamata", "Schermo", "App", "Cellulare"] },
    { word: "Aquila", forbidden: ["Uccello", "Ali", "Rapace", "Volare"] },
    { word: "Fragola", forbidden: ["Frutta", "Rossa", "Dolce", "Marmellata"] },
    { word: "Motocicletta", forbidden: ["Due ruote", "Motore", "Casco", "Velocità"] },
    { word: "Cameriere", forbidden: ["Ristorante", "Tavolo", "Ordinare", "Mancia"] },
    { word: "Pioggia", forbidden: ["Acqua", "Ombrello", "Nuvola", "Bagnato"] },
    { word: "Pesce", forbidden: ["Acqua", "Branchie", "Pinne", "Mare"] },
    { word: "Sole", forbidden: ["Luce", "Caldo", "Giallo", "Giorno"] },
    { word: "Ospedale", forbidden: ["Medico", "Malato", "Infermiere", "Operazione"] },
    { word: "Girasole", forbidden: ["Fiore", "Giallo", "Semi", "Campo"] },
    { word: "Cane", forbidden: ["Fedele", "Abbaiare", "Cucciolo", "Guinzaglio"] },
    { word: "Aereo", forbidden: ["Volare", "Ala", "Pilota", "Aeroporto"] },
    { word: "Luna", forbidden: ["Notte", "Cielo", "Satellite", "Argentea"] },
    { word: "Pasta", forbidden: ["Bollire", "Sugo", "Spaghetti", "Forno"] },
    { word: "Sciarpa", forbidden: ["Inverno", "Collo", "Lana", "Freddo"] },
    { word: "Coccodrillo", forbidden: ["Rettile", "Acqua", "Mascelle", "Verde"] },
    { word: "Tartaruga", forbidden: ["Guscio", "Lenta", "Rettile", "Mare"] },
    { word: "Zanzara", forbidden: ["Puntura", "Ali", "Estate", "Prurito"] },
    { word: "Panino", forbidden: ["Pane", "Farcito", "Salsa", "Pranzo"] },
    { word: "Cavallo", forbidden: ["Sella", "Galoppo", "Manto", "Scuderia"] },
    { word: "Bambino", forbidden: ["Giocare", "Scuola", "Genitori", "Passeggino"] },
    { word: "Ghiaccio", forbidden: ["Freddo", "Acqua", "Ghiacciaio", "Bevanda"] },
    { word: "Barca", forbidden: ["Vela", "Mare", "Remi", "Porto"] },
    { word: "Ferrari", forbidden: ["Auto", "Velocità", "Rossi", "Cavallino"] },
    { word: "Pompiere", forbidden: ["Incendio", "Maniche", "Auto", "Caserma"] },
    { word: "Radio", forbidden: ["Onde", "Musica", "Trasmettitore", "Voce"] },
    { word: "Gomma", forbidden: ["Cancellare", "Matita", "Morbido", "Scuola"] },
    { word: "Farfalla", forbidden: ["Ali", "Colorata", "Fiori", "Crisalide"] },
    { word: "Montagna", forbidden: ["Alta", "Neve", "Scalare", "Cima"] },
    { word: "Spaghetti", forbidden: ["Pasta", "Sugo", "Forchetta", "Piatto"] },
    { word: "Cipolla", forbidden: ["Lacrime", "Verdura", "Soffritto", "Anelli"] },
    { word: "Mago", forbidden: ["Trucco", "Magia", "Cappello", "Bacchetta"] },
    { word: "Cuscino", forbidden: ["Letto", "Piuma", "Sogno", "Testa"] },
    { word: "Dado", forbidden: ["Gioco", "Casualità", "Numero", "Lanciare"] }
];

// ---------- Stato del server ----------
const rooms = {};
const playerMap = {};
let nextId = 1;

function generateId() {
    return (nextId++).toString(36);
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            players: {},
            gameState: {
                cards: shuffleArray([...CARDS]),
                currentIndex: 0,
                scores: {},       // punteggi individuali
                teamScores: { A: 0, B: 0 },
                currentDescriber: null,
                timeLeft: 60,
                isPlaying: false,
                finished: false,
                timerInterval: null
            }
        };
    }
    return rooms[roomId];
}

function broadcastToRoom(roomId, message, excludeWs = null) {
    const room = rooms[roomId];
    if (!room) return;
    const players = room.players;
    for (const pid in players) {
        const p = players[pid];
        if (p.ws && p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify(message));
        }
    }
}

function removePlayer(playerId) {
    const p = playerMap[playerId];
    if (!p) return;
    const roomId = p.room;
    const room = rooms[roomId];
    if (room) {
        const game = room.gameState;
        if (game.currentDescriber === playerId) {
            game.currentDescriber = null;
            stopTimer(roomId);
            game.isPlaying = false;
        }
        delete room.players[playerId];
        delete game.scores[playerId];
        // Se non ci sono più giocatori, elimina stanza
        if (Object.keys(room.players).length === 0) {
            if (game.timerInterval) {
                clearInterval(game.timerInterval);
                game.timerInterval = null;
            }
            delete rooms[roomId];
        } else {
            broadcastToRoom(roomId, {
                type: 'playerLeft',
                playerId: playerId
            }, p.ws);
            broadcastGameState(roomId);
        }
    }
    delete playerMap[playerId];
}

function stopTimer(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const game = room.gameState;
    if (game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
    }
}

function startTimer(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const game = room.gameState;
    stopTimer(roomId);
    if (!game.isPlaying) return;
    game.timeLeft = 60;
    broadcastGameState(roomId);
    game.timerInterval = setInterval(() => {
        game.timeLeft--;
        broadcastGameState(roomId);
        if (game.timeLeft <= 0) {
            stopTimer(roomId);
            if (game.currentDescriber && !game.finished) {
                // Scaduto: skip automatico (nessun punto)
                const describer = game.currentDescriber;
                if (!game.scores[describer]) {
                    game.scores[describer] = { correct: 0, skip: 0, foul: 0 };
                }
                game.scores[describer].skip++;
                nextCard(roomId);
            } else {
                game.isPlaying = false;
                broadcastGameState(roomId);
            }
        }
    }, 1000);
}

function nextCard(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const game = room.gameState;
    game.currentIndex++;
    if (game.currentIndex >= game.cards.length) {
        game.finished = true;
        game.isPlaying = false;
        stopTimer(roomId);
        broadcastGameState(roomId);
        return;
    }
    if (game.isPlaying) {
        startTimer(roomId);
    }
    broadcastGameState(roomId);
}

function broadcastGameState(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const game = room.gameState;
    const players = room.players;

    for (const pid in players) {
        const p = players[pid];
        if (!p.ws || p.ws.readyState !== WebSocket.OPEN) continue;

        const isDesc = (pid === game.currentDescriber);
        const isActive = game.isPlaying && !game.finished && game.currentIndex < game.cards.length;

        const stateForPlayer = {
            currentDescriber: game.currentDescriber,
            timeLeft: game.timeLeft,
            isPlaying: game.isPlaying,
            finished: game.finished,
            players: players,
            scores: game.scores,
            teamScores: game.teamScores,
            isMeDescriber: isDesc,
            card: null
        };

        if (isActive && isDesc) {
            const card = game.cards[game.currentIndex];
            stateForPlayer.card = {
                word: card.word,
                forbidden: card.forbidden
            };
        } else {
            stateForPlayer.card = {
                word: "🤫",
                forbidden: ["???"]
            };
        }

        p.ws.send(JSON.stringify({
            type: 'state',
            state: stateForPlayer
        }));
    }
}

function handleAction(roomId, playerId, action, data) {
    const room = rooms[roomId];
    if (!room) return;
    const game = room.gameState;
    const player = playerMap[playerId];
    if (!player) return;

    switch (action) {
        case 'newTurn': {
            if (game.finished || !game.isPlaying || game.currentDescriber === null) {
                if (game.finished) {
                    game.cards = shuffleArray([...CARDS]);
                    game.currentIndex = 0;
                    game.finished = false;
                    // Reset team scores? No, li lasciamo per nuova partita? 
                    // Decidiamo di resettare solo se l'utente preme "reset"
                }
                game.currentDescriber = playerId;
                game.isPlaying = true;
                if (!game.scores[playerId]) {
                    game.scores[playerId] = { correct: 0, skip: 0, foul: 0 };
                }
                startTimer(roomId);
                broadcastGameState(roomId);
            }
            break;
        }
        case 'correct': {
            if (!game.isPlaying || game.finished || game.currentDescriber !== playerId) return;
            const describer = playerId;
            const team = player.team; // A o B
            // Assegna punto al team del descrittore
            if (team === 'A') game.teamScores.A++;
            else if (team === 'B') game.teamScores.B++;
            if (!game.scores[describer]) {
                game.scores[describer] = { correct: 0, skip: 0, foul: 0 };
            }
            game.scores[describer].correct++;
            stopTimer(roomId);
            nextCard(roomId);
            break;
        }
        case 'skip': {
            if (!game.isPlaying || game.finished || game.currentDescriber !== playerId) return;
            const describer = playerId;
            if (!game.scores[describer]) {
                game.scores[describer] = { correct: 0, skip: 0, foul: 0 };
            }
            game.scores[describer].skip++;
            stopTimer(roomId);
            nextCard(roomId);
            break;
        }
        case 'foul': {
            if (!game.isPlaying || game.finished || !game.currentDescriber) return;
            if (playerId === game.currentDescriber) return; // il descrittore non può fare fallo su sé stesso
            const describer = game.currentDescriber;
            const describerPlayer = playerMap[describer];
            if (!describerPlayer) return;
            const teamDesc = describerPlayer.team;
            const teamFoul = player.team; // team del controllore
            // La squadra avversaria guadagna 1 punto
            if (teamFoul === 'A') game.teamScores.A++;
            else if (teamFoul === 'B') game.teamScores.B++;
            // Aggiorna punteggio individuale del descrittore (foul)
            if (!game.scores[describer]) {
                game.scores[describer] = { correct: 0, skip: 0, foul: 0 };
            }
            game.scores[describer].foul++;
            stopTimer(roomId);
            nextCard(roomId);
            break;
        }
        case 'reset': {
            stopTimer(roomId);
            game.cards = shuffleArray([...CARDS]);
            game.currentIndex = 0;
            game.scores = {};
            game.teamScores = { A: 0, B: 0 };
            game.currentDescriber = null;
            game.isPlaying = false;
            game.finished = false;
            for (const pid in room.players) {
                game.scores[pid] = { correct: 0, skip: 0, foul: 0 };
            }
            broadcastGameState(roomId);
            break;
        }
        default:
            break;
    }
}

// ---------- Server HTTP ----------
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end();
    }
});

// ---------- WebSocket ----------
const wss = new WebSocket.Server({ server });

wss.on('headers', (headers) => {
    headers.push('Access-Control-Allow-Origin: *');
});

wss.on('connection', (ws, req) => {
    console.log(`[${new Date().toISOString()}] Nuova connessione`);

    let currentPlayerId = null;
    let currentRoomId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`[${new Date().toISOString()}] Messaggio:`, data.type);

            switch (data.type) {
                case 'connect': {
                    const playerName = data.playerName || 'Anonimo';
                    const roomId = data.room || 'default';
                    const team = data.team || 'A'; // default A

                    if (currentPlayerId && playerMap[currentPlayerId]) {
                        removePlayer(currentPlayerId);
                    }

                    const room = getRoom(roomId);
                    const game = room.gameState;

                    const playerId = generateId();
                    const player = {
                        id: playerId,
                        name: playerName,
                        team: team,
                        ws: ws,
                        room: roomId
                    };
                    room.players[playerId] = player;
                    playerMap[playerId] = player;
                    currentPlayerId = playerId;
                    currentRoomId = roomId;

                    if (!game.scores[playerId]) {
                        game.scores[playerId] = { correct: 0, skip: 0, foul: 0 };
                    }

                    ws.send(JSON.stringify({
                        type: 'connected',
                        playerId: playerId,
                        playerName: playerName,
                        room: roomId,
                        team: team
                    }));

                    broadcastToRoom(roomId, {
                        type: 'playerJoined',
                        player: { id: playerId, name: playerName, team: team }
                    }, ws);

                    broadcastGameState(roomId);

                    console.log(`[${new Date().toISOString()}] ${playerName} (${playerId}) team ${team} in stanza ${roomId}`);
                    break;
                }

                case 'leave': {
                    if (currentPlayerId) {
                        const name = playerMap[currentPlayerId]?.name || '?';
                        removePlayer(currentPlayerId);
                        console.log(`[${new Date().toISOString()}] ${name} ha lasciato`);
                        currentPlayerId = null;
                        currentRoomId = null;
                    }
                    ws.close();
                    break;
                }

                case 'action': {
                    if (!currentPlayerId || !currentRoomId) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Non in una stanza' }));
                        return;
                    }
                    handleAction(currentRoomId, currentPlayerId, data.action, data.data || {});
                    break;
                }

                default:
                    ws.send(JSON.stringify({ type: 'error', message: 'Tipo sconosciuto' }));
            }
        } catch (err) {
            console.error('Errore parsing:', err);
            ws.send(JSON.stringify({ type: 'error', message: 'JSON invalido' }));
        }
    });

    ws.on('close', () => {
        if (currentPlayerId) {
            const name = playerMap[currentPlayerId]?.name || '?';
            console.log(`[${new Date().toISOString()}] ${name} ha chiuso la connessione`);
            removePlayer(currentPlayerId);
        }
    });

    ws.on('error', (err) => {
        console.error('Errore WebSocket:', err);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server Taboo multiplayer in ascolto sulla porta ${PORT}`);
});
