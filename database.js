const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'todos.db'), (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database.');
                this.initDatabase();
            }
        });
    }

    initDatabase() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                completed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createLogsTableSQL = `
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                todo_id INTEGER,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (todo_id) REFERENCES todos (id)
            )
        `;

        this.db.run(createTableSQL, (err) => {
            if (err) {
                console.error('Error creating todos table:', err.message);
            } else {
                console.log('Todos table created or already exists.');
            }
        });

        this.db.run(createLogsTableSQL, (err) => {
            if (err) {
                console.error('Error creating logs table:', err.message);
            } else {
                console.log('Logs table created or already exists.');
            }
        });
    }

    // Todo operations
    getAllTodos(callback) {
        const sql = 'SELECT * FROM todos ORDER BY created_at DESC';
        this.db.all(sql, [], callback);
    }

    getTodoById(id, callback) {
        const sql = 'SELECT * FROM todos WHERE id = ?';
        this.db.get(sql, [id], callback);
    }

    createTodo(todo, callback) {
        const sql = 'INSERT INTO todos (title, description) VALUES (?, ?)';
        this.db.run(sql, [todo.title, todo.description], function(err) {
            callback(err, { id: this.lastID, ...todo });
        });
    }

    updateTodo(id, todo, callback) {
        const sql = 'UPDATE todos SET title = ?, description = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        this.db.run(sql, [todo.title, todo.description, todo.completed, id], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    deleteTodo(id, callback) {
        const sql = 'DELETE FROM todos WHERE id = ?';
        this.db.run(sql, [id], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Log operations
    addLog(action, todoId = null, details = null, callback = () => {}) {
        const sql = 'INSERT INTO logs (action, todo_id, details) VALUES (?, ?, ?)';
        this.db.run(sql, [action, todoId, details], callback);
    }

    getLogs(callback) {
        const sql = 'SELECT * FROM logs ORDER BY timestamp DESC';
        this.db.all(sql, [], callback);
    }

    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
}

module.exports = Database;
