const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET = 'chat_2026_key';
const DB_PATH = path.join(__dirname, 'data/db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Helpers
const getDb = async () => JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));
const saveDb = async (data) => await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send('Unauthorized');
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch (e) { res.status(401).send('Invalid Token'); }
};

// --- HTTP Routes ---
app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    const db = await getDb();
    if (db.users.find(u => u.username === username)) return res.status(400).send('User exists');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), username, password: hashedPassword };
    db.users.push(newUser);
    await saveDb(db);
    res.status(201).json({ message: "User created" });
});

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const db = await getDb();
    const user = db.users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET);
        res.json({ token, username: user.username, id: user.id });
    } else { res.status(401).send('Invalid login'); }
});

app.get('/users', authenticate, async (req, res) => {
    const db = await getDb();
    res.json(db.users.filter(u => u.id !== req.user.id).map(u => ({ id: u.id, username: u.username })));
});

app.get('/messages/:receiverId', authenticate, async (req, res) => {
    const db = await getDb();
    const history = db.message.filter(m => 
        (m.senderId === req.user.id && m.receiverId === req.params.receiverId) ||
        (m.senderId === req.params.receiverId && m.receiverId === req.user.id)
    );
    res.json(history);
});

const server = app.listen(3000, () => console.log('Server: http://localhost:3000'));

// --- WebSocket Logic ---
const wss = new WebSocketServer({ server });
const clients = new Map();

const broadcastStatus = () => {
    const payload = JSON.stringify({ type: 'status_update', onlineIds: Array.from(clients.keys()) });
    wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(payload));
};

wss.on('connection', (ws) => {
    let currentUser = null;

    ws.on('message', async (data) => {
        const payload = JSON.parse(data);

        if (payload.type === 'auth') {
            try {
                currentUser = jwt.verify(payload.token, SECRET);
                clients.set(currentUser.id, ws);
                broadcastStatus();
            } catch (e) { ws.close(); }
        }

        if (payload.type === 'message' && currentUser) {
            const db = await getDb();
            const msg = { id: Date.now().toString(), senderId: currentUser.id, receiverId: payload.receiverId, text: payload.text, timestamp: new Date() };
            db.message.push(msg);
            await saveDb(db);
            [payload.receiverId, currentUser.id].forEach(id => clients.has(id) && clients.get(id).send(JSON.stringify({ type: 'new_msg', data: msg })));
        }

        if (payload.type === 'typing' && currentUser) {
            if (clients.has(payload.receiverId)) {
                clients.get(payload.receiverId).send(JSON.stringify({ type: 'user_typing', senderId: currentUser.id, isTyping: payload.isTyping }));
            }
        }
    });

    ws.on('close', () => {
        if (currentUser) { clients.delete(currentUser.id); broadcastStatus(); }
    });
});
