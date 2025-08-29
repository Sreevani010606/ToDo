const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize database
const db = new Database();

// Custom logger middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// API Routes

// Get all todos
app.get('/api/todos', (req, res) => {
    db.getAllTodos((err, todos) => {
        if (err) {
            console.error('Error fetching todos:', err);
            res.status(500).json({ error: 'Failed to fetch todos' });
        } else {
            db.addLog('GET_ALL_TODOS', null, `Fetched ${todos.length} todos`);
            res.json(todos);
        }
    });
});

// Get single todo
app.get('/api/todos/:id', (req, res) => {
    const id = req.params.id;
    db.getTodoById(id, (err, todo) => {
        if (err) {
            console.error('Error fetching todo:', err);
            res.status(500).json({ error: 'Failed to fetch todo' });
        } else if (!todo) {
            res.status(404).json({ error: 'Todo not found' });
        } else {
            db.addLog('GET_TODO', id, `Fetched todo: ${todo.title}`);
            res.json(todo);
        }
    });
});

// Create new todo
app.post('/api/todos', (req, res) => {
    const { title, description } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    db.createTodo({ title, description }, (err, todo) => {
        if (err) {
            console.error('Error creating todo:', err);
            res.status(500).json({ error: 'Failed to create todo' });
        } else {
            db.addLog('CREATE_TODO', todo.id, `Created todo: ${title}`);
            res.status(201).json(todo);
        }
    });
});

// Update todo
app.put('/api/todos/:id', (req, res) => {
    const id = req.params.id;
    const { title, description, completed } = req.body;

    db.getTodoById(id, (err, existingTodo) => {
        if (err) {
            console.error('Error finding todo:', err);
            return res.status(500).json({ error: 'Failed to update todo' });
        }
        if (!existingTodo) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        const updatedTodo = {
            title: title || existingTodo.title,
            description: description !== undefined ? description : existingTodo.description,
            completed: completed !== undefined ? completed : existingTodo.completed
        };

        db.updateTodo(id, updatedTodo, (err, result) => {
            if (err) {
                console.error('Error updating todo:', err);
                res.status(500).json({ error: 'Failed to update todo' });
            } else {
                db.addLog('UPDATE_TODO', id, `Updated todo: ${updatedTodo.title}`);
                res.json({ message: 'Todo updated successfully', todo: { id, ...updatedTodo } });
            }
        });
    });
});

// Delete todo
app.delete('/api/todos/:id', (req, res) => {
    const id = req.params.id;

    db.getTodoById(id, (err, todo) => {
        if (err) {
            console.error('Error finding todo:', err);
            return res.status(500).json({ error: 'Failed to delete todo' });
        }
        if (!todo) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        db.deleteTodo(id, (err, result) => {
            if (err) {
                console.error('Error deleting todo:', err);
                res.status(500).json({ error: 'Failed to delete todo' });
            } else {
                db.addLog('DELETE_TODO', id, `Deleted todo: ${todo.title}`);
                res.json({ message: 'Todo deleted successfully' });
            }
        });
    });
});

// Get logs
app.get('/api/logs', (req, res) => {
    db.getLogs((err, logs) => {
        if (err) {
            console.error('Error fetching logs:', err);
            res.status(500).json({ error: 'Failed to fetch logs' });
        } else {
            res.json(logs);
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});

module.exports = app;
