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

// Nav por scroll: solo se ve la pestaña actual; al hacer scroll se cambia de página
function initNavScroll() {
    var scrollEl = document.getElementById('navScroll');
    if (!scrollEl) return;
    var items = scrollEl.querySelectorAll('.nav-item');
    if (!items.length) return;
    var active = scrollEl.querySelector('.nav-item.active');
    var currentHref = window.location.pathname.split('/').pop() || window.location.href;

    function getItemWidth() {
        return scrollEl.offsetWidth;
    }
    function scrollToIndex(index) {
        var w = getItemWidth();
        scrollEl.scrollLeft = index * w;
    }
    function getCurrentIndex() {
        var w = getItemWidth();
        if (w <= 0) return 0;
        return Math.round(scrollEl.scrollLeft / w);
    }

    if (active) {
        var i = Array.prototype.indexOf.call(items, active);
        scrollToIndex(i);
    }

    items.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
        });
    });

    var scrollEndTimer;
    scrollEl.addEventListener('scroll', function () {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(function () {
            var idx = getCurrentIndex();
            idx = Math.max(0, Math.min(idx, items.length - 1));
            var link = items[idx];
            var href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript:')) {
                var targetPage = href.split('/').pop();
                var nowPage = currentHref;
                if (targetPage !== nowPage) {
                    window.location.href = href;
                }
            }
        }, 150);
    }, { passive: true });
}

// Desplegables personalizados (no nativos iOS)
function initCustomSelects(container) {
    var root = container || document;
    var selects = root.querySelectorAll('select.form-select, select.form-input, select.pagos-input, select.pedidos-filter-select');
    selects.forEach(function (sel) {
        if (sel.closest('.custom-select-wrap')) return;
        sel.setAttribute('tabindex', '-1');
        sel.classList.add('custom-select-native');
        var wrap = document.createElement('div');
        wrap.className = 'custom-select-wrap';
        sel.parentNode.insertBefore(wrap, sel);
        wrap.appendChild(sel);
        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';
        var opt = sel.options[sel.selectedIndex];
        trigger.textContent = opt ? opt.textContent : '';
        wrap.appendChild(trigger);
        var panel = document.createElement('div');
        panel.className = 'custom-select-panel';
        for (var i = 0; i < sel.options.length; i++) {
            var o = sel.options[i];
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'custom-select-option' + (o.selected ? ' selected' : '');
            btn.textContent = o.textContent;
            btn.dataset.value = o.value;
            panel.appendChild(btn);
        }
        wrap.appendChild(panel);
        function updateTrigger() {
            var selected = sel.options[sel.selectedIndex];
            trigger.textContent = selected ? selected.textContent : '';
            panel.querySelectorAll('.custom-select-option').forEach(function (b, idx) {
                b.classList.toggle('selected', sel.options[idx].value === sel.value);
            });
        }
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = wrap.classList.toggle('open');
            if (open) {
                document.querySelectorAll('.custom-select-wrap.open').forEach(function (w) {
                    if (w !== wrap) w.classList.remove('open');
                });
            }
        });
        panel.querySelectorAll('.custom-select-option').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                sel.value = btn.dataset.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                updateTrigger();
                wrap.classList.remove('open');
            });
        });
        sel.addEventListener('change', updateTrigger);
    });
    if (!window._customSelectCloseBound) {
        window._customSelectCloseBound = true;
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.custom-select-wrap')) {
                document.querySelectorAll('.custom-select-wrap.open').forEach(function (w) {
                    w.classList.remove('open');
                });
            }
        });
    }
}
window.initCustomSelects = initCustomSelects;

if (typeof document !== 'undefined') {
    function onReady() {
        initNavScroll();
        initCustomSelects();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
}
