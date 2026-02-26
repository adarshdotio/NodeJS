const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const DB_PATH = path.join(__dirname, 'data/tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read/write
const getDb = async () => JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));
const saveDb = async (data) => await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));

// --- API Routes ---

// READ
app.get('/tasks', async (req, res) => {
    const db = await getDb();
    res.json(db.tasks);
});

// CREATE
app.post('/tasks', async (req, res) => {
    const db = await getDb();
    const newTask = { id: Date.now().toString(), ...req.body, completed: false };
    db.tasks.push(newTask);
    await saveDb(db);
    res.status(201).json(newTask);
});

// UPDATE
app.put('/tasks/:id', async (req, res) => {
    const db = await getDb();
    const index = db.tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).send("Not found");
    
    db.tasks[index] = { ...db.tasks[index], ...req.body };
    await saveDb(db);
    res.json(db.tasks[index]);
});

// DELETE
app.delete('/tasks/:id', async (req, res) => {
    const db = await getDb();
    db.tasks = db.tasks.filter(t => t.id !== req.params.id);
    await saveDb(db);
    res.status(204).send();
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
