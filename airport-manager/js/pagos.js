let session;
let currentTab = 'pagos';

function updatePaymentMethodVisibility() {
    const sel = document.getElementById('paymentCurrency');
    const dollarsGroup = document.getElementById('paymentMethodDollarsGroup');
    const pagoMovilGroup = document.getElementById('pagoMovilRefGroup');
    if (!sel || !dollarsGroup || !pagoMovilGroup) return;
    const currency = sel.value;
    const methodSelect = document.getElementById('paymentMethodDollars');
    if (currency === 'USD') {
        dollarsGroup.style.display = '';
        pagoMovilGroup.style.display = 'none';
        if (methodSelect) methodSelect.setAttribute('required', 'required');
    } else {
        dollarsGroup.style.display = 'none';
        if (methodSelect) methodSelect.removeAttribute('required');
        if (currency === 'BS') {
            pagoMovilGroup.style.display = '';
        } else {
            pagoMovilGroup.style.display = 'none';
        }
    }
}

function getPaymentMethodFromForm() {
    const currency = document.getElementById('paymentCurrency').value;
    if (currency === 'BS') return 'pago_movil';
    if (currency === 'USD') return document.getElementById('paymentMethodDollars').value;
    if (currency === 'USDT') return 'usdt';
    return 'pago_movil';
}

async function init() {
    updatePaymentMethodVisibility();
    const currencySel = document.getElementById('paymentCurrency');
    if (currencySel) currencySel.addEventListener('change', updatePaymentMethodVisibility);

    var expenseTypeSel = document.getElementById('expenseType');
    if (expenseTypeSel) expenseTypeSel.addEventListener('change', toggleOrderField);

    session = await checkAuth();
    if (!session) return;

    toggleOrderField();

    window.pullToRefreshCallback = function () {
        return Promise.all([loadOrders(), loadPayments(), loadExpenses()]);
    };
    window.addEventListener('offlineQueueFlush', function () {
        Promise.all([loadOrders(), loadPayments(), loadExpenses()]).then(function () {
            if (window.Toast) window.Toast.show('Conexión restaurada. Datos actualizados.', 'success', 2000);
        });
    });
    if (window.subscribeRealtimeTable) {
        var refreshPagos = function () {
            window.queryCacheInvalidate('pagos_');
            loadOrders();
            loadPayments();
            loadExpenses();
        };
        window.subscribeRealtimeTable('orders', refreshPagos);
        window.subscribeRealtimeTable('payments', refreshPagos);
        window.subscribeRealtimeTable('expenses', refreshPagos);
    }

    loadOrders();
    loadPayments();
    loadExpenses();
    updatePaymentMethodVisibility();
}

function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.pagos-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tab === 'pagos') {
        document.getElementById('tabPagos').classList.remove('hidden');
        document.getElementById('tabGastos').classList.add('hidden');
        document.getElementById('btnPagos').classList.add('active');
    } else {
        document.getElementById('tabPagos').classList.add('hidden');
        document.getElementById('tabGastos').classList.remove('hidden');
        document.getElementById('btnGastos').classList.add('active');
        toggleOrderField();
    }
}

var ACTIVE_ORDER_STATUSES = ['agendado', 'en_produccion', 'listo'];

async function loadOrders() {
    try {
        const paymentSelect = document.getElementById('paymentOrder');
        const expenseSelect = document.getElementById('expenseOrder');
        if (!paymentSelect || !expenseSelect) return;

        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, customer_name')
            .in('status', ACTIVE_ORDER_STATUSES)
            .order('order_number', { ascending: false });

        if (error) throw error;

        const options = (data || []).map(function (order) {
            var name = (order.customer_name || '').trim() || 'Sin nombre';
            return '<option value="' + order.id + '">#' + order.order_number + ' - ' + name + '</option>';
        }).join('');

        paymentSelect.innerHTML = '<option value="">Seleccionar pedido...</option>' + options;
        expenseSelect.innerHTML = '<option value="">Seleccionar pedido...</option>' + options;
    } catch (error) {
        console.error('Error loading orders:', error);
        if (paymentSelect) paymentSelect.innerHTML = '<option value="">Seleccionar pedido...</option>';
        if (expenseSelect) expenseSelect.innerHTML = '<option value="">Seleccionar pedido...</option>';
    }
}

function showPaymentsSkeleton() {
    const el = document.getElementById('paymentsList');
    if (!el) return;
    el.innerHTML = '<ul class="pagos-item-list">' + Array(3).fill(0).map(() => `
        <li class="pagos-item"><div class="skeleton-line" style="width:80px;height:1.2rem;margin-bottom:0.4rem"></div><div class="skeleton-line" style="width:100%;height:0.9rem;margin-bottom:0.3rem"></div><div class="skeleton-line" style="width:60%;height:0.8rem"></div></li>
    `).join('') + '</ul>';
}

async function loadPayments() {
    const cacheKey = 'pagos_payments';
    const cached = window.queryCacheGet && window.queryCacheGet(cacheKey);
    if (cached) {
        displayPayments(cached);
        return;
    }
    showPaymentsSkeleton();
    try {
        const { data, error } = await supabase
            .from('payments')
            .select(`
                *,
                orders (order_number, customer_name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (window.queryCacheSet) window.queryCacheSet(cacheKey, data);
        displayPayments(data);
        
    } catch (error) {
        console.error('Error loading payments:', error);
        document.getElementById('paymentsList').innerHTML = 
            '<div class="alert alert-error">Error al cargar pagos</div>';
    }
}

function displayPayments(payments) {
    const container = document.getElementById('paymentsList');
    
    if (!payments || payments.length === 0) {
        container.innerHTML = '<p class="pagos-empty">No hay pagos registrados</p>';
        return;
    }
    
    const html = `<ul class="pagos-item-list">${payments.map(payment => `
        <li class="pagos-item">
            <div class="pagos-item-main">
                <span class="pagos-item-amount">${formatCurrency(payment.amount, payment.currency)}</span>
                <span class="pagos-item-meta">${payment.orders ? `#${payment.orders.order_number}` : 'N/A'} · ${payment.payment_type === 'inicial_50' ? 'Inicial' : 'Restante'}</span>
            </div>
            <div class="pagos-item-detail">${payment.concept}</div>
            <div class="pagos-item-footer">
                <span class="pagos-item-date">${formatDateTime(payment.created_at)}</span>
                <button type="button" class="pagos-item-btn" onclick="deletePayment('${payment.id}')">Eliminar</button>
            </div>
        </li>
    `).join('')}</ul>`;
    
    container.innerHTML = html;
}

function showExpensesSkeleton() {
    const el = document.getElementById('expensesList');
    if (!el) return;
    el.innerHTML = '<ul class="pagos-item-list">' + Array(3).fill(0).map(() => `
        <li class="pagos-item"><div class="skeleton-line" style="width:80px;height:1.2rem;margin-bottom:0.4rem"></div><div class="skeleton-line" style="width:100%;height:0.9rem;margin-bottom:0.3rem"></div><div class="skeleton-line" style="width:60%;height:0.8rem"></div></li>
    `).join('') + '</ul>';
}

async function loadExpenses() {
    const cacheKey = 'pagos_expenses';
    const cached = window.queryCacheGet && window.queryCacheGet(cacheKey);
    if (cached) {
        displayExpenses(cached);
        return;
    }
    showExpensesSkeleton();
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select(`
                *,
                orders (order_number, customer_name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (window.queryCacheSet) window.queryCacheSet(cacheKey, data);
        displayExpenses(data);
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        document.getElementById('expensesList').innerHTML = 
            '<div class="alert alert-error">Error al cargar gastos</div>';
    }
}

function displayExpenses(expenses) {
    const container = document.getElementById('expensesList');
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<p class="pagos-empty">No hay gastos registrados</p>';
        return;
    }
    
    const html = `<ul class="pagos-item-list">${expenses.map(expense => `
        <li class="pagos-item">
            <div class="pagos-item-main">
                <span class="pagos-item-amount">${formatCurrency(expense.amount, expense.currency)}</span>
                <span class="pagos-item-meta">${expense.expense_type === 'orden_especifico' && expense.orders ? `#${expense.orders.order_number}` : 'General'}</span>
            </div>
            <div class="pagos-item-detail">${expense.concept}</div>
            <div class="pagos-item-footer">
                <span class="pagos-item-date">${formatDateTime(expense.created_at)}</span>
                <button type="button" class="pagos-item-btn" onclick="deleteExpense('${expense.id}')">Eliminar</button>
            </div>
        </li>
    `).join('')}</ul>`;
    
    container.innerHTML = html;
}

function toggleOrderField() {
    var expenseTypeEl = document.getElementById('expenseType');
    var orderGroup = document.getElementById('expenseOrderGroup');
    var orderSelect = document.getElementById('expenseOrder');
    if (!expenseTypeEl || !orderGroup) return;
    var expenseType = expenseTypeEl.value;
    if (expenseType === 'general') {
        orderGroup.classList.add('hidden');
        orderGroup.style.display = 'none';
        if (orderSelect) orderSelect.removeAttribute('required');
    } else {
        orderGroup.classList.remove('hidden');
        orderGroup.style.display = '';
        if (orderSelect) orderSelect.setAttribute('required', 'required');
    }
}

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const messageDiv = document.getElementById('paymentMessage');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Guardando...';
    messageDiv.innerHTML = '';
    
    try {
        const paymentData = {
            order_id: document.getElementById('paymentOrder').value,
            concept: document.getElementById('paymentConcept').value,
            payment_type: document.getElementById('paymentType').value,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            currency: document.getElementById('paymentCurrency').value,
            payment_method: getPaymentMethodFromForm(),
            reference: document.getElementById('paymentReference').value || null
        };
        
        const { error } = await supabase
            .from('payments')
            .insert(paymentData);
        
        if (error) throw error;
        
        messageDiv.innerHTML = '<div class="alert alert-success">Pago registrado exitosamente</div>';
        if (window.Toast) Toast.show('Pago registrado', 'success');
        e.target.reset();
        updatePaymentMethodVisibility();
        if (window.queryCacheInvalidate) window.queryCacheInvalidate('pagos_payments');
        loadPayments();
        
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error saving payment:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar Pago';
    }
});

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const messageDiv = document.getElementById('expenseMessage');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Guardando...';
    messageDiv.innerHTML = '';
    
    try {
        const expenseType = document.getElementById('expenseType').value;
        const orderId = document.getElementById('expenseOrder').value;
        
        const expenseData = {
            order_id: expenseType === 'orden_especifico' && orderId ? orderId : null,
            concept: document.getElementById('expenseConcept').value,
            expense_type: expenseType,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            currency: document.getElementById('expenseCurrency').value,
            reference: document.getElementById('expenseReference').value || null
        };
        
        const { error } = await supabase
            .from('expenses')
            .insert(expenseData);
        
        if (error) throw error;
        
        messageDiv.innerHTML = '<div class="alert alert-success">Gasto registrado exitosamente</div>';
        if (window.Toast) Toast.show('Gasto registrado', 'success');
        e.target.reset();
        if (window.queryCacheInvalidate) window.queryCacheInvalidate('pagos_expenses');
        loadExpenses();
        
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error saving expense:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar Gasto';
    }
});

async function deletePayment(paymentId) {
    if (!confirm('¿Estás segura de que quieres eliminar este pago?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId);
        
        if (error) throw error;
        if (window.queryCacheInvalidate) window.queryCacheInvalidate('pagos_payments');
        loadPayments();
        
    } catch (error) {
        console.error('Error deleting payment:', error);
        if (window.Toast) Toast.show('Error al eliminar el pago', 'error'); else alert('Error al eliminar el pago');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('¿Estás segura de que quieres eliminar este gasto?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);
        
        if (error) throw error;
        if (window.queryCacheInvalidate) window.queryCacheInvalidate('pagos_expenses');
        loadExpenses();
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        if (window.Toast) Toast.show('Error al eliminar el gasto', 'error'); else alert('Error al eliminar el gasto');
    }
}

// Inicializar
init();
