let session;
let currentPeriod = 'semanal';
let statusChart;

async function init() {
    session = await checkAuth();
    if (!session) return;
    
    loadStatistics();
}

function changePeriod(period) {
    currentPeriod = period;
    
    document.querySelectorAll('.stats-period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const btnId = period === 'semanal' ? 'btnSemanal' : period === 'mensual' ? 'btnMensual' : 'btnTrimestral';
    document.getElementById(btnId).classList.add('active');
    
    const titles = {
        'semanal': 'Esta Semana',
        'mensual': 'Este Mes',
        'trimestral': 'Este Trimestre'
    };
    document.getElementById('periodTitle').textContent = titles[period];
    
    loadStatistics();
}

function getPeriodDates() {
    const now = new Date();
    let startDate;
    
    switch (currentPeriod) {
        case 'semanal':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'mensual':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'trimestral':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
    }
    
    // Inicio del día de inicio (00:00:00 en hora local, luego a ISO para Supabase)
    const startOfStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    // Fin del día actual (23:59:59.999) para incluir todo el día en los filtros
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    return {
        start: startOfStart.toISOString(),
        end: endOfToday.toISOString()
    };
}

async function loadStatistics() {
    const dates = getPeriodDates();
    
    await Promise.all([
        loadFinancialStats(dates),
        loadOrderStats(dates),
        loadTopProducts(dates)
    ]);
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
        
        // Gráfico de dona
        if (statusChart) {
            statusChart.destroy();
        }
        
        const ctx = document.getElementById('statusChart').getContext('2d');
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Agendado', 'En Producción', 'Listo', 'Entregado', 'Cancelado'],
                datasets: [{
                    data: [
                        statusCounts.agendado,
                        statusCounts.en_produccion,
                        statusCounts.listo,
                        statusCounts.entregado,
                        statusCounts.cancelado
                    ],
                    backgroundColor: [
                        '#FEF3C7',
                        '#DBEAFE',
                        '#D1FAE5',
                        '#F3F4F6',
                        '#FEE2E2'
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

async function loadTopProducts(dates) {
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('items')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end)
            .not('status', 'eq', 'cancelado');
        
        if (!orders || orders.length === 0) {
            document.getElementById('topProducts').innerHTML = '<p class="stats-empty">No hay productos en este período</p>';
            return;
        }
        
        // Contar productos
        const productCounts = {};
        
        orders.forEach(order => {
            const items = JSON.parse(order.items || '[]');
            items.forEach(item => {
                const productName = item.producto;
                if (!productCounts[productName]) {
                    productCounts[productName] = 0;
                }
                productCounts[productName] += parseInt(item.cantidad || 1);
            });
        });
        
        // Ordenar por cantidad
        const sortedProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sortedProducts.length === 0) {
            document.getElementById('topProducts').innerHTML = '<p class="stats-empty">No hay productos registrados</p>';
            return;
        }
        
        const totalUnits = sortedProducts.reduce((sum, [, c]) => sum + c, 0);
        const html = `
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
        
        document.getElementById('topProducts').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

// Inicializar
init();
