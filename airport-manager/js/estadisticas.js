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
    
    // Actualizar botones
    document.querySelectorAll('#btnSemanal, #btnMensual, #btnTrimestral').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn');
    });
    
    const btnId = period === 'semanal' ? 'btnSemanal' : period === 'mensual' ? 'btnMensual' : 'btnTrimestral';
    document.getElementById(btnId).classList.add('btn-primary');
    document.getElementById(btnId).classList.remove('btn');
    
    // Actualizar título
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
    
    return {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
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
        // Ingresos (Pagos)
        const { data: payments } = await supabase
            .from('payments')
            .select('amount, currency')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end);
        
        // Gastos
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, currency')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end);
        
        // Ingresos en Euros (referencia)
        const { data: orders } = await supabase
            .from('orders')
            .select('amount_euros')
            .gte('created_at', dates.start)
            .lte('created_at', dates.end)
            .not('status', 'eq', 'cancelado');
        
        // Calcular totales
        const ingresosBS = payments?.filter(p => p.currency === 'BS').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        const ingresosUSD = payments?.filter(p => ['USD', 'USDT'].includes(p.currency)).reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        const ingresosEUR = orders?.reduce((sum, o) => sum + parseFloat(o.amount_euros || 0), 0) || 0;
        
        const gastosBS = expenses?.filter(e => e.currency === 'BS').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
        const gastosUSD = expenses?.filter(e => e.currency === 'USD').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
        
        // Mostrar
        document.getElementById('ingresoBS').textContent = `Bs. ${ingresosBS.toFixed(2)}`;
        document.getElementById('ingresoUSD').textContent = `$${ingresosUSD.toFixed(2)}`;
        document.getElementById('ingresoEUR').textContent = `€${ingresosEUR.toFixed(2)}`;
        
        document.getElementById('gastoBS').textContent = `Bs. ${gastosBS.toFixed(2)}`;
        document.getElementById('gastoUSD').textContent = `$${gastosUSD.toFixed(2)}`;
        
        const balanceBS = ingresosBS - gastosBS;
        const balanceUSD = ingresosUSD - gastosUSD;
        
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
                '<div style="text-align: center; padding: 2rem; color: var(--gray-500);">No hay pedidos en este período</div>';
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
                plugins: {
                    legend: {
                        position: 'bottom'
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
            <div style="padding: 1rem 0;">
                <div style="margin-bottom: 1rem;">
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Total de Pedidos</div>
                    <div style="font-size: 2rem; font-weight: 700;">${totalPedidos}</div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Entregados</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${entregados}</div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Pendientes</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${pendientes}</div>
                </div>
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Tasa de Entrega</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${tasaEntrega}%</div>
                </div>
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
            document.getElementById('topProducts').innerHTML = 
                '<div style="text-align: center; padding: 2rem; color: var(--gray-500);">No hay productos en este período</div>';
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
            document.getElementById('topProducts').innerHTML = 
                '<div style="text-align: center; padding: 2rem; color: var(--gray-500);">No hay productos registrados</div>';
            return;
        }
        
        const html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad Vendida</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedProducts.map(([product, count]) => {
                        const total = sortedProducts.reduce((sum, [, c]) => sum + c, 0);
                        const percentage = ((count / total) * 100).toFixed(1);
                        return `
                            <tr>
                                <td><strong>${product}</strong></td>
                                <td>${count} unidades</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="flex: 1; height: 20px; background: var(--gray-200);">
                                            <div style="height: 100%; background: var(--black); width: ${percentage}%;"></div>
                                        </div>
                                        <span>${percentage}%</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('topProducts').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

// Inicializar
init();
