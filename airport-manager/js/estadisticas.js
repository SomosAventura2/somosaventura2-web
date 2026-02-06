let session;
let currentPeriod = 'semanal';
let productosPeriod = 'semanal';
let statusChart;
let currentStatsTab = 'contabilidad';

const VIP_MIN_ORDERS = 3;
const VIP_MIN_SPENT = 150;
const INACTIVO_DAYS = 90;

async function init() {
    session = await checkAuth();
    if (!session) return;
    
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchStatsTab(tab);
        });
    });
    
    document.getElementById('clientesSort')?.addEventListener('change', () => loadClientesContent());
    document.getElementById('clientesFilter')?.addEventListener('change', () => loadClientesContent());
    document.getElementById('btnExportClientes')?.addEventListener('click', exportClientesCSV);
    
    window.pullToRefreshCallback = function () {
        if (currentStatsTab === 'contabilidad') return Promise.resolve(loadStatistics());
        if (currentStatsTab === 'clientes') return Promise.resolve(loadClientesTab());
        if (currentStatsTab === 'productos') return Promise.resolve(loadProductosTab());
        return Promise.resolve();
    };
    switchStatsTab('contabilidad');
}

function switchStatsTab(tab) {
    currentStatsTab = tab;
    document.querySelectorAll('.stats-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.stats-tab-panel').forEach(p => {
        p.classList.add('hidden');
    });
    const panelId = tab === 'contabilidad' ? 'tabContabilidad' : tab === 'clientes' ? 'tabClientes' : 'tabProductos';
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.remove('hidden');
    
    if (tab === 'contabilidad') loadStatistics();
    else if (tab === 'clientes') loadClientesTab();
    else if (tab === 'productos') loadProductosTab();
}

function changePeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('#tabContabilidad .stats-period-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.id === 'btnSemanal' && period === 'semanal') || (btn.id === 'btnMensual' && period === 'mensual') || (btn.id === 'btnTrimestral' && period === 'trimestral'));
    });
    const titles = { 'semanal': 'Esta Semana', 'mensual': 'Este Mes', 'trimestral': 'Este Trimestre' };
    const el = document.getElementById('periodTitle');
    if (el) el.textContent = titles[period];
    loadStatistics();
}

function changeProductosPeriod(period) {
    productosPeriod = period;
    document.querySelectorAll('#tabProductos .stats-period-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.id === 'btnProdSemanal' && period === 'semanal') || (btn.id === 'btnProdMensual' && period === 'mensual') || (btn.id === 'btnProdTrimestral' && period === 'trimestral'));
    });
    loadProductosTab();
}

function getPeriodDates(period) {
    const p = period || currentPeriod;
    const now = new Date();
    let startDate;
    switch (p) {
        case 'semanal': startDate = new Date(now); startDate.setDate(now.getDate() - 7); break;
        case 'mensual': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'trimestral': startDate = new Date(now); startDate.setMonth(now.getMonth() - 3); break;
        default: startDate = new Date(now); startDate.setDate(now.getDate() - 7);
    }
    const startOfStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: startOfStart.toISOString(), end: endOfToday.toISOString() };
}

async function loadStatistics() {
    const dates = getPeriodDates();
    await Promise.all([loadFinancialStats(dates), loadOrderStats(dates)]);
}

async function loadFinancialStats(dates) {
    try {
        if (!window.supabase) {
            console.error('Stats: Supabase no disponible');
            return;
        }

        // Ingresos (tabla payments: pagos del modal de pedidos + pagos registrados en Pagos)
        const { data: payments, error: errPayments } = await supabase
            .from('payments')
            .select('amount, currency, created_at')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end);

        if (errPayments) {
            console.error('Stats error payments:', errPayments);
        }

        // Gastos
        const { data: expenses, error: errExpenses } = await supabase
            .from('expenses')
            .select('amount, currency')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end);

        if (errExpenses) {
            console.error('Stats error expenses:', errExpenses);
        }

        // Ingresos en Euros (referencia: monto de pedidos creados en el período, sin cancelados)
        const { data: orders, error: errOrders } = await supabase
            .from('orders')
            .select('amount_euros, created_at')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end)
            .not('status', 'eq', 'cancelado');

        if (errOrders) {
            console.error('Stats error orders:', errOrders);
        }

        const paymentsList = payments || [];
        const ordersList = orders || [];
        const expensesList = expenses || [];

        const ingresosBS = paymentsList.filter(p => p.currency === 'BS').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const ingresosUSD = paymentsList.filter(p => ['USD', 'USDT'].includes(p.currency)).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const ingresosEUR = ordersList.reduce((sum, o) => sum + parseFloat(o.amount_euros || 0), 0);

        const gastosBS = expensesList.filter(e => e.currency === 'BS').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const gastosUSD = expensesList.filter(e => e.currency === 'USD').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

        const balanceBS = ingresosBS - gastosBS;
        const balanceUSD = ingresosUSD - gastosUSD;

        document.getElementById('ingresoBS').textContent = `Bs. ${ingresosBS.toFixed(2)}`;
        document.getElementById('ingresoUSD').textContent = `$${ingresosUSD.toFixed(2)}`;
        document.getElementById('ingresoEUR').textContent = `€${ingresosEUR.toFixed(2)}`;

        document.getElementById('gastoBS').textContent = `Bs. ${gastosBS.toFixed(2)}`;
        document.getElementById('gastoUSD').textContent = `$${gastosUSD.toFixed(2)}`;

        document.getElementById('balanceBS').textContent = `Bs. ${balanceBS.toFixed(2)}`;
        document.getElementById('balanceBS').style.color = balanceBS >= 0 ? 'var(--success)' : 'var(--error)';

        document.getElementById('balanceUSD').textContent = `$${balanceUSD.toFixed(2)}`;
        document.getElementById('balanceUSD').style.color = balanceUSD >= 0 ? 'var(--success)' : 'var(--error)';

    } catch (error) {
        console.error('Error loading financial stats:', error);
    }
}

async function loadOrderStats(dates) {
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('status')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end);
        
        if (!orders || orders.length === 0) {
            document.getElementById('periodMetrics').innerHTML = 
                '<p class="stats-empty">No hay pedidos en este período</p>';
            return;
        }
        
        // Contar por estado
        const statusCounts = {
            'agendado': 0,
            'en_produccion': 0,
            'listo': 0,
            'entregado': 0,
            'cancelado': 0
        };
        
        orders.forEach(order => {
            if (statusCounts.hasOwnProperty(order.status)) {
                statusCounts[order.status]++;
            }
        });
        
        // Gráfico de dona (sin cancelado en la app)
        if (statusChart) {
            statusChart.destroy();
        }
        
        const ctx = document.getElementById('statusChart').getContext('2d');
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Agendado', 'En Producción', 'Listo', 'Entregado'],
                datasets: [{
                    data: [
                        statusCounts.agendado,
                        statusCounts.en_produccion,
                        statusCounts.listo,
                        statusCounts.entregado
                    ],
                    backgroundColor: [
                        '#FEE2E2',
                        '#FEF3C7',
                        '#D1FAE5',
                        '#BFDBFE'
                    ],
                    borderColor: '#000000',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.1,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 10, font: { size: 10 } }
                    }
                }
            }
        });
        
        // Métricas del período
        const totalPedidos = orders.length;
        const entregados = statusCounts.entregado;
        const pendientes = totalPedidos - entregados - statusCounts.cancelado;
        const tasaEntrega = totalPedidos > 0 ? ((entregados / totalPedidos) * 100).toFixed(1) : 0;
        
        document.getElementById('periodMetrics').innerHTML = `
            <div class="stats-metrics-grid">
                <div class="stats-metric"><span class="stats-metric-label">Total</span><span class="stats-metric-value">${totalPedidos}</span></div>
                <div class="stats-metric"><span class="stats-metric-label">Entregados</span><span class="stats-metric-value stats-metric-success">${entregados}</span></div>
                <div class="stats-metric"><span class="stats-metric-label">Pendientes</span><span class="stats-metric-value stats-metric-warning">${pendientes}</span></div>
                <div class="stats-metric"><span class="stats-metric-label">Tasa entrega</span><span class="stats-metric-value">${tasaEntrega}%</span></div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading order stats:', error);
    }
}

async function loadProductosTab() {
    const dates = getPeriodDates(productosPeriod);
    await loadTopProducts(dates);
}

async function loadTopProducts(dates) {
    const el = document.getElementById('topProducts');
    if (!el) return;
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('items')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end)
            .not('status', 'eq', 'cancelado');
        
        if (!orders || orders.length === 0) {
            el.innerHTML = '<p class="stats-empty">No hay productos en este período</p>';
            return;
        }
        
        const productCounts = {};
        orders.forEach(order => {
            const items = JSON.parse(order.items || '[]');
            items.forEach(item => {
                const productName = item.producto;
                if (!productCounts[productName]) productCounts[productName] = 0;
                productCounts[productName] += parseInt(item.cantidad || 1);
            });
        });
        
        const sortedProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sortedProducts.length === 0) {
            el.innerHTML = '<p class="stats-empty">No hay productos registrados</p>';
            return;
        }
        
        const totalUnits = sortedProducts.reduce((sum, [, c]) => sum + c, 0);
        el.innerHTML = `
            <ul class="stats-product-list">
                ${sortedProducts.map(([product, count]) => {
                    const percentage = totalUnits > 0 ? ((count / totalUnits) * 100).toFixed(0) : 0;
                    return `
                        <li class="stats-product-item">
                            <span class="stats-product-name">${product}</span>
                            <span class="stats-product-count">${count} ud</span>
                            <div class="stats-product-bar"><div class="stats-product-bar-fill" style="width:${percentage}%"></div></div>
                            <span class="stats-product-pct">${percentage}%</span>
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    } catch (error) {
        console.error('Error loading top products:', error);
        el.innerHTML = '<p class="stats-empty">Error al cargar productos</p>';
    }
}

function classifyCustomer(c) {
    const tags = Array.isArray(c.tags) ? c.tags : [];
    const isVip = (c.total_orders >= VIP_MIN_ORDERS || (c.total_spent_eur && parseFloat(c.total_spent_eur) >= VIP_MIN_SPENT)) || tags.includes('VIP');
    const last = c.last_order_date ? new Date(c.last_order_date) : null;
    const now = new Date();
    const daysSince = last ? Math.floor((now - last) / (24 * 60 * 60 * 1000)) : 9999;
    const isInactivo = daysSince >= INACTIVO_DAYS || tags.includes('Inactivo');
    const first = c.first_order_date ? new Date(c.first_order_date) : null;
    const isNuevo = first && (now - first) / (24 * 60 * 60 * 1000) <= 30;
    return { isVip, isInactivo, isNuevo, daysSince };
}

function formatDaysAgo(days) {
    if (days >= 9999) return '—';
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} d`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    return `Hace ${Math.floor(days / 30)} m`;
}

async function loadClientesTab() {
    const metricsEl = document.getElementById('clientesMetrics');
    const tableEl = document.getElementById('clientesTableWrap');
    const segmentEl = document.getElementById('clientesSegmentos');
    if (!metricsEl || !tableEl) return;
    metricsEl.innerHTML = '<div class="stats-loading"><span class="loading"></span></div>';
    tableEl.innerHTML = '<div class="stats-loading"><span class="loading"></span></div>';
    if (segmentEl) segmentEl.innerHTML = '<div class="stats-loading"><span class="loading"></span></div>';
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .eq('is_active', true)
            .order('total_spent_eur', { ascending: false });
        
        if (error) throw error;
        const list = customers || [];
        
        const vipCount = list.filter(c => classifyCustomer(c).isVip).length;
        const inactivosCount = list.filter(c => classifyCustomer(c).isInactivo).length;
        const nuevosCount = list.filter(c => classifyCustomer(c).isNuevo).length;
        const ticketProm = list.length > 0
            ? list.reduce((s, c) => s + parseFloat(c.total_spent_eur || 0), 0) / list.filter(c => (c.total_orders || 0) > 0).length
            : 0;
        const nuevosEsteMes = list.filter(c => {
            const created = c.created_at ? new Date(c.created_at) : null;
            const now = new Date();
            return created && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;
        
        metricsEl.innerHTML = `
            <div class="stats-clientes-metric">
                <span class="stats-clientes-metric-value" id="clientesTotal">${list.length}</span>
                <span class="stats-clientes-metric-label">Clientes totales</span>
            </div>
            <div class="stats-clientes-metric">
                <span class="stats-clientes-metric-value">${vipCount}</span>
                <span class="stats-clientes-metric-label">Clientes VIP</span>
            </div>
            <div class="stats-clientes-metric">
                <span class="stats-clientes-metric-value">€${ticketProm.toFixed(2)}</span>
                <span class="stats-clientes-metric-label">Ticket prom.</span>
            </div>
            <div class="stats-clientes-metric" style="grid-column: 1 / -1;">
                <span class="stats-clientes-metric-value">${nuevosEsteMes}</span>
                <span class="stats-clientes-metric-label">Nuevos este mes</span>
            </div>
        `;
        
        if (segmentEl) {
            segmentEl.innerHTML = `
                <div class="stats-segment-card">
                    <span class="stats-segment-card-value">${vipCount}</span>
                    <span class="stats-segment-card-label">🌟 VIP</span>
                </div>
                <div class="stats-segment-card">
                    <span class="stats-segment-card-value">${inactivosCount}</span>
                    <span class="stats-segment-card-label">😴 Inactivos (+90 d)</span>
                </div>
                <div class="stats-segment-card">
                    <span class="stats-segment-card-value">${nuevosCount}</span>
                    <span class="stats-segment-card-label">✨ Nuevos</span>
                </div>
            `;
        }
        
        loadClientesContent(list);
    } catch (err) {
        console.error('Clientes error:', err);
        metricsEl.innerHTML = '<p class="stats-empty">Configura la tabla customers en Supabase (migration-customers.sql)</p>';
        tableEl.innerHTML = '<p class="stats-empty">No se pudo cargar la lista de clientes.</p>';
        if (segmentEl) segmentEl.innerHTML = '';
    }
}

let lastClientesList = [];

function loadClientesContent(list) {
    if (list !== undefined) lastClientesList = list;
    const tableEl = document.getElementById('clientesTableWrap');
    if (!tableEl) return;
    const sort = (document.getElementById('clientesSort') || {}).value || 'ventas';
    const filter = (document.getElementById('clientesFilter') || {}).value || 'todos';
    
    let rows = lastClientesList.map(c => {
        const cl = classifyCustomer(c);
        return { ...c, _isVip: cl.isVip, _isInactivo: cl.isInactivo, _isNuevo: cl.isNuevo, _daysSince: cl.daysSince };
    });
    
    if (filter === 'vip') rows = rows.filter(r => r._isVip);
    else if (filter === 'inactivos') rows = rows.filter(r => r._isInactivo);
    else if (filter === 'nuevos') rows = rows.filter(r => r._isNuevo);
    
    if (sort === 'ventas') rows.sort((a, b) => (parseFloat(b.total_spent_eur) || 0) - (parseFloat(a.total_spent_eur) || 0));
    else if (sort === 'pedidos') rows.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0));
    else if (sort === 'reciente') rows.sort((a, b) => new Date(b.last_order_date || 0) - new Date(a.last_order_date || 0));
    else if (sort === 'nombre') rows.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
    
    const name = c => `${c.first_name || ''} ${c.last_name || ''}`.trim();
    const contact = c => {
        const parts = [];
        if (c.phone) parts.push('📞 ' + (c.phone.length > 10 ? c.phone.slice(0, 8) + '...' : c.phone));
        if (c.email) parts.push('📧 ' + (c.email.length > 18 ? c.email.slice(0, 15) + '...' : c.email));
        return parts.join(' · ') || '—';
    };
    
    if (rows.length === 0) {
        tableEl.innerHTML = '<p class="stats-empty">' + (lastClientesList.length === 0 ? 'No hay clientes registrados.' : 'No hay clientes que coincidan con el filtro.') + '</p>';
        return;
    }
    
    tableEl.innerHTML = `
        <table class="stats-clientes-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Pedidos</th>
                    <th>Total</th>
                    <th>Último</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(c => `
                    <tr>
                        <td>
                            <span class="cliente-nombre">${name(c)}</span>
                            ${c._isVip ? ' <span class="badge-vip">⭐ VIP</span>' : ''}
                            ${c._isInactivo ? ' <span class="badge-inactivo">😴 Inactivo</span>' : ''}
                            ${c._isNuevo ? ' <span class="badge-nuevo">✨ Nuevo</span>' : ''}
                        </td>
                        <td class="cliente-contacto">${contact(c)}</td>
                        <td>${c.total_orders || 0}</td>
                        <td>€${parseFloat(c.total_spent_eur || 0).toFixed(2)}</td>
                        <td>${formatDaysAgo(c._daysSince)}</td>
                        <td><button type="button" class="btn btn-sm btn-outline" onclick="viewCustomerHistory('${c.id}')">Ver</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function closeCustomerHistoryModal() {
    const modal = document.getElementById('customerHistoryModal');
    if (modal) modal.classList.remove('active');
}

async function viewCustomerHistory(customerId) {
    const content = document.getElementById('customerHistoryContent');
    const modal = document.getElementById('customerHistoryModal');
    if (!content || !modal) return;
    modal.classList.add('active');
    content.innerHTML = '<div class="stats-loading"><span class="loading"></span></div>';
    try {
        const { data: customer, error: errC } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
        if (errC) throw errC;
        if (!customer) throw new Error('Cliente no encontrado');

        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        const { data: ordersByCustomerId } = await supabase
            .from('orders')
            .select('id, order_number, status, amount_euros, delivery_date, created_at, items')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(20);
        let orders = ordersByCustomerId || [];
        if (orders.length === 0 && fullName) {
            const { data: ordersByName } = await supabase
                .from('orders')
                .select('id, order_number, status, amount_euros, delivery_date, created_at, items')
                .ilike('customer_name', fullName)
                .order('created_at', { ascending: false })
                .limit(20);
            orders = ordersByName || [];
        }
        const orderList = orders;

        const contactParts = [];
        if (customer.phone) {
            const wa = 'https://wa.me/' + customer.phone.replace(/\D/g, '');
            contactParts.push(`📞 <a href="${wa}" target="_blank" rel="noopener">${customer.phone}</a> WhatsApp`);
        }
        if (customer.email) contactParts.push(`📧 <a href="mailto:${customer.email}">${customer.email}</a>`);
        const contactHtml = contactParts.length ? contactParts.join(' &nbsp;|&nbsp; ') : '—';

        const desde = customer.first_order_date || customer.created_at;
        const desdeStr = desde ? (typeof formatDate === 'function' ? formatDate(desde) : new Date(desde).toLocaleDateString('es')) : '—';
        const statusLabel = typeof getStatusText === 'function' ? getStatusText : s => s;

        const historialHtml = orderList.length === 0
            ? '<p class="stats-empty">Sin pedidos registrados</p>'
            : '<ul class="customer-history-orders">' + orderList.map(o => {
                const items = JSON.parse(o.items || '[]');
                const itemsPreview = items.slice(0, 2).map(i => `${i.cantidad}x ${i.producto}`).join(', ') + (items.length > 2 ? '...' : '');
                return `
                    <li class="customer-history-order-item">
                        <strong>#${o.order_number}</strong> · ${typeof formatDate === 'function' ? formatDate(o.delivery_date || o.created_at) : new Date(o.delivery_date || o.created_at).toLocaleDateString('es')} · €${parseFloat(o.amount_euros || 0).toFixed(2)} · ${statusLabel(o.status)}
                        <br><span class="customer-history-order-items">${itemsPreview}</span>
                    </li>
                `;
            }).join('') + '</ul>';

        const prefs = [];
        if (customer.preferred_size) prefs.push(`Talla favorita: ${customer.preferred_size}`);
        if (customer.preferred_payment_method) prefs.push(`Método de pago: ${customer.preferred_payment_method}`);
        if (customer.preferred_products && (customer.preferred_products || []).length) prefs.push('Productos: ' + (Array.isArray(customer.preferred_products) ? customer.preferred_products.join(', ') : ''));
        const prefsHtml = prefs.length ? '<ul class="customer-history-prefs">' + prefs.map(p => '<li>' + p + '</li>').join('') + '</ul>' : '<p class="stats-empty">Sin preferencias detectadas</p>';

        content.innerHTML = `
            <h2 class="customer-history-name">${fullName}</h2>
            <div class="customer-history-contact">${contactHtml}</div>
            <div class="customer-history-stats">
                <strong>Stats rápidas</strong><br>
                ${customer.total_orders || 0} pedidos | €${parseFloat(customer.total_spent_eur || 0).toFixed(2)} total | €${parseFloat(customer.avg_order_value || 0).toFixed(2)} prom.<br>
                Cliente desde: ${desdeStr}
            </div>
            <hr class="customer-history-hr">
            <h3 class="customer-history-h3">Historial de pedidos</h3>
            ${historialHtml}
            <hr class="customer-history-hr">
            <h3 class="customer-history-h3">Preferencias detectadas</h3>
            ${prefsHtml}
            ${customer.notes ? `<hr class="customer-history-hr"><h3 class="customer-history-h3">Notas</h3><p>${customer.notes}</p>` : ''}
            <div class="customer-history-actions">
                <a href="pedidos.html?customer_id=${customerId}" class="btn btn-primary">Crear Pedido</a>
                <button type="button" class="btn btn-outline" onclick="closeCustomerHistoryModal()">Cerrar</button>
            </div>
        `;
    } catch (e) {
        console.error(e);
        content.innerHTML = '<p class="stats-empty">Error al cargar el cliente.</p>';
    }
}

function exportClientesCSV() {
    if (lastClientesList.length === 0) {
        if (window.Toast) Toast.show('No hay clientes para exportar.', 'warning'); else alert('No hay clientes para exportar.');
        return;
    }
    const headers = ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Pedidos', 'Total €', 'Último pedido'];
    const rows = lastClientesList.map(c => [
        c.first_name || '',
        c.last_name || '',
        c.phone || '',
        c.email || '',
        c.total_orders || 0,
        parseFloat(c.total_spent_eur || 0).toFixed(2),
        c.last_order_date || ''
    ]);
    const csv = [headers.join(',')].concat(rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clientes_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}

// Inicializar
init();
