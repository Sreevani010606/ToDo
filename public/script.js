class TodoApp {
    constructor() {
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTodos();
        this.loadLogs();
    }

    bindEvents() {
        // Form submission
        document.getElementById('todoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTodo();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTodo();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Refresh logs
        document.getElementById('refreshLogs').addEventListener('click', () => {
            this.loadLogs();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('editModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadTodos() {
        try {
            const response = await fetch('/api/todos');
            if (!response.ok) throw new Error('Failed to fetch todos');
            
            const todos = await response.json();
            this.renderTodos(todos);
        } catch (error) {
            this.showError('Failed to load todos: ' + error.message);
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/logs');
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            const logs = await response.json();
            this.renderLogs(logs);
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    }

    async createTodo() {
        const form = document.getElementById('todoForm');
        const formData = new FormData(form);
        
        const todo = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim()
        };

        if (!todo.title) {
            this.showError('Title is required');
            return;
        }

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(todo)
            });

            if (!response.ok) throw new Error('Failed to create todo');

            const newTodo = await response.json();
            this.showSuccess('Todo created successfully!');
            form.reset();
            this.loadTodos();
            this.loadLogs();
        } catch (error) {
            this.showError('Failed to create todo: ' + error.message);
        }
    }

    async updateTodo() {
        const form = document.getElementById('editForm');
        const formData = new FormData(form);
        const id = document.getElementById('editId').value;

        const todo = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            completed: formData.get('completed') === 'on'
        };

        if (!todo.title) {
            this.showError('Title is required');
            return;
        }

        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(todo)
            });

            if (!response.ok) throw new Error('Failed to update todo');

            this.showSuccess('Todo updated successfully!');
            this.closeModal();
            this.loadTodos();
            this.loadLogs();
        } catch (error) {
            this.showError('Failed to update todo: ' + error.message);
        }
    }

    async deleteTodo(id) {
        if (!confirm('Are you sure you want to delete this todo?')) {
            return;
        }

        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete todo');

            this.showSuccess('Todo deleted successfully!');
            this.loadTodos();
            this.loadLogs();
        } catch (error) {
            this.showError('Failed to delete todo: ' + error.message);
        }
    }

    async toggleComplete(id, completed) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: !completed })
            });

            if (!response.ok) throw new Error('Failed to update todo');

            this.loadTodos();
            this.loadLogs();
        } catch (error) {
            this.showError('Failed to update todo: ' + error.message);
        }
    }

    openEditModal(todo) {
        document.getElementById('editId').value = todo.id;
        document.getElementById('editTitle').value = todo.title;
        document.getElementById('editDescription').value = todo.description || '';
        document.getElementById('editCompleted').checked = todo.completed;
        
        document.getElementById('editModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        this.loadTodos();
    }

    renderTodos(todos) {
        const container = document.getElementById('todosList');
        
        // Filter todos based on current filter
        const filteredTodos = todos.filter(todo => {
            switch (this.currentFilter) {
                case 'active':
                    return !todo.completed;
                case 'completed':
                    return todo.completed;
                default:
                    return true;
            }
        });

        if (filteredTodos.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    ${this.currentFilter === 'all' ? 'No todos yet. Add one above!' : 
                      this.currentFilter === 'active' ? 'No active todos.' : 'No completed todos.'}
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <div class="todo-content">
                    <h3 class="todo-title">${this.escapeHtml(todo.title)}</h3>
                    ${todo.description ? `<p class="todo-description">${this.escapeHtml(todo.description)}</p>` : ''}
                    <div class="todo-meta">
                        Created: ${new Date(todo.created_at).toLocaleString()}
                        ${todo.updated_at !== todo.created_at ? 
                            ` | Updated: ${new Date(todo.updated_at).toLocaleString()}` : ''}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="btn-complete" onclick="app.toggleComplete(${todo.id}, ${todo.completed})">
                        ${todo.completed ? '❌ Undo' : '✅ Complete'}
                    </button>
                    <button class="btn-edit" onclick="app.openEditModal(${JSON.stringify(todo).replace(/"/g, '"')})">
                        ✏️ Edit
                    </button>
                    <button class="btn-delete" onclick="app.deleteTodo(${todo.id})">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderLogs(logs) {
        const container = document.getElementById('logsList');
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="loading">No activity logs yet.</div>';
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-action">${this.formatAction(log.action)}</div>
                ${log.details ? `<div class="log-details">${this.escapeHtml(log.details)}</div>` : ''}
                <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    }

    formatAction(action) {
        const actions = {
            'CREATE_TODO': '📝 Created todo',
            'UPDATE_TODO': '✏️ Updated todo',
            'DELETE_TODO': '🗑️ Deleted todo',
            'GET_TODO': '👀 Viewed todo',
            'GET_ALL_TODOS': '📋 Viewed all todos'
        };
        return actions[action] || action;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove any existing messages
        const existingMessages = document.querySelectorAll('.error, .success');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;

        // Insert after the header
        const header = document.querySelector('header');
        header.parentNode.insertBefore(messageDiv, header.nextSibling);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});
