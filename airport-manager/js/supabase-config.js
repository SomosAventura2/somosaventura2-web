// Configuración de Supabase
// IMPORTANTE: Reemplazar con tus credenciales reales de Supabase

const SUPABASE_URL = 'https://ecqfydexgfwynhekmhoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWZ5ZGV4Z2Z3eW5oZWttaG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTMyMTQsImV4cCI6MjA4NTg2OTIxNH0.0BeIEQbD0NpuANAWUxUPJpX918Y5Bwh8N10EXRZtdX4';

// El UMD ya declara window.supabase (la librería). Creamos el cliente y reemplazamos el global para no redeclarar.
var _lib = typeof window !== 'undefined' ? window.supabase : null;
window.supabase = _lib && _lib.createClient
    ? _lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Verificar autenticación en cada página
async function checkAuth() {
    if (!window.supabase) return null;
    const { data: { session } } = await window.supabase.auth.getSession();
    
    if (!session && !window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        window.location.href = 'index.html';
    }
    
    if (session && (window.location.pathname.includes('index.html') || window.location.pathname === '/')) {
        window.location.href = 'dashboard.html';
    }
    
    return session;
}

// Cerrar sesión
async function logout() {
    if (window.supabase) await window.supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Formatear moneda
function formatCurrency(amount, currency = 'EUR') {
    const symbols = {
        'EUR': '€',
        'USD': '$',
        'BS': 'Bs.',
        'USDT': 'USDT'
    };
    
    return `${symbols[currency] || currency} ${parseFloat(amount || 0).toFixed(2)}`;
}

// Formatear fecha
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Formatear fecha y hora
function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('es-VE', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Obtener color según estado
function getStatusColor(status) {
    const colors = {
        'agendado': 'bg-yellow-500',
        'en_produccion': 'bg-blue-500',
        'listo': 'bg-green-500',
        'entregado': 'bg-gray-500',
        'cancelado': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
}

// Obtener texto legible del estado
function getStatusText(status) {
    const texts = {
        'agendado': 'Agendado',
        'en_produccion': 'En Producción',
        'listo': 'Listo',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return texts[status] || status;
}

// Opciones de estado para el dropdown (mismo orden en toda la app)
window.STATUS_OPTIONS = [
    { value: 'agendado', label: 'Agendado' },
    { value: 'en_produccion', label: 'En Producción' },
    { value: 'listo', label: 'Listo' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' }
];
const STATUS_OPTIONS = window.STATUS_OPTIONS;

// Actualizar estado de un pedido y notificar para refrescar listas
async function updateOrderStatus(orderId, newStatus) {
    if (!window.supabase) return;
    const { error } = await window.supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, newStatus } }));
}
