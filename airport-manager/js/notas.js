var NOTAS_KEY = 'airport_quick_notes';

async function init() {
    var session = await checkAuth();
    if (!session) return;
    loadNotes();
    document.getElementById('notaInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNote();
        }
    });
    window.pullToRefreshCallback = function () { loadNotes(); return Promise.resolve(); };
}

function getNotes() {
    try {
        var raw = localStorage.getItem(NOTAS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveNotes(notes) {
    try {
        localStorage.setItem(NOTAS_KEY, JSON.stringify(notes));
    } catch (e) {}
}

function loadNotes() {
    var notes = getNotes();
    var list = document.getElementById('notasList');
    if (!list) return;
    if (notes.length === 0) {
        list.innerHTML = '<li class="notas-empty">No hay notas. Escribe arriba y pulsa Agregar.</li>';
        return;
    }
    list.innerHTML = notes.map(function (n) {
        var dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '';
        return '<li class="notas-item" data-id="' + n.id + '">' +
            '<span class="notas-item-text">' + escapeHtml(n.text) + '</span>' +
            (dateStr ? '<span class="notas-item-date" title="Fecha de creación">' + dateStr + '</span>' : '') +
            '<button type="button" class="notas-item-edit" onclick="editNote(\'' + n.id + '\')" aria-label="Editar">✏️</button>' +
            '<button type="button" class="notas-item-delete" onclick="deleteNote(\'' + n.id + '\')" aria-label="Borrar">×</button>' +
            '</li>';
    }).join('');
}

function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function addNote() {
    var input = document.getElementById('notaInput');
    var text = (input && input.value || '').trim();
    if (!text) return;
    var notes = getNotes();
    var id = 'n_' + Date.now();
    notes.unshift({ id: id, text: text, createdAt: new Date().toISOString() });
    saveNotes(notes);
    input.value = '';
    loadNotes();
    if (window.Toast) window.Toast.show('Nota añadida', 'success', 1500);
}

function deleteNote(id) {
    var notes = getNotes().filter(function (n) { return n.id !== id; });
    saveNotes(notes);
    loadNotes();
    if (window.Toast) window.Toast.show('Nota eliminada', 'success', 1500);
}

function editNote(noteId) {
    var notes = getNotes();
    var note = notes.filter(function (n) { return n.id === noteId; })[0];
    if (!note) return;
    var newContent = prompt('Editar nota:', note.text);
    if (newContent === null) return;
    newContent = newContent.trim();
    if (newContent === '') return;
    var idx = notes.findIndex(function (n) { return n.id === noteId; });
    if (idx === -1) return;
    notes[idx] = { id: note.id, text: newContent, createdAt: note.createdAt };
    saveNotes(notes);
    loadNotes();
    if (window.Toast) window.Toast.show('Nota actualizada', 'success', 1500);
}

init();
