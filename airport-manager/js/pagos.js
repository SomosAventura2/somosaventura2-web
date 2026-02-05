let session;
let currentTab = 'pagos';

function updatePaymentMethodVisibility() {
    const currency = document.getElementById('paymentCurrency').value;
    const dollarsGroup = document.getElementById('paymentMethodDollarsGroup');
    const pagoMovilGroup = document.getElementById('pagoMovilRefGroup');
    
    if (currency === 'BS') {
        dollarsGroup.classList.add('hidden');
        pagoMovilGroup.classList.remove('hidden');
        document.getElementById('paymentMethodDollars').removeAttribute('required');
    } else if (currency === 'USD') {
        dollarsGroup.classList.remove('hidden');
        pagoMovilGroup.classList.add('hidden');
        document.getElementById('paymentMethodDollars').setAttribute('required', 'required');
    } else {
        dollarsGroup.classList.add('hidden');
        pagoMovilGroup.classList.add('hidden');
        document.getElementById('paymentMethodDollars').removeAttribute('required');
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
    session = await checkAuth();
    if (!session) return;
    
    loadOrders();
    loadPayments();
    loadExpenses();

    document.getElementById('paymentCurrency').addEventListener('change', updatePaymentMethodVisibility);
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
    }
}

async function loadOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, customer_name')
            .not('status', 'eq', 'cancelado')
            .order('order_number', { ascending: false });
        
        if (error) throw error;
        
        const paymentSelect = document.getElementById('paymentOrder');
        const expenseSelect = document.getElementById('expenseOrder');
        
        const options = data.map(order => 
            `<option value="${order.id}">#${order.order_number} - ${order.customer_name}</option>`
        ).join('');
        
        paymentSelect.innerHTML = '<option value="">Seleccionar pedido...</option>' + options;
        expenseSelect.innerHTML = '<option value="">Seleccionar pedido...</option>' + options;
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function loadPayments() {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select(`
                *,
                orders (order_number, customer_name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
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

async function loadExpenses() {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select(`
                *,
                orders (order_number, customer_name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
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
    const expenseType = document.getElementById('expenseType').value;
    const orderGroup = document.getElementById('expenseOrderGroup');
    const orderSelect = document.getElementById('expenseOrder');
    
    if (expenseType === 'general') {
        orderGroup.classList.add('hidden');
        orderSelect.required = false;
    } else {
        orderGroup.classList.remove('hidden');
        orderSelect.required = true;
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
        e.target.reset();
        updatePaymentMethodVisibility();
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
        e.target.reset();
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
        
        loadPayments();
        
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error al eliminar el pago');
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
        
        loadExpenses();
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error al eliminar el gasto');
    }
}

// Inicializar
init();
