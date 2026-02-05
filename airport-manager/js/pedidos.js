let session;
let currentOrderId = null;
let productCategories = [
    'Franela',
    'Hoodie',
    'Cortaviento',
    'Estampado/Bordado',
    'Tote Bag',
    'Otro'
];

async function init() {
    session = await checkAuth();
    if (!session) return;
    
    loadOrders();
    loadCategories();

    document.getElementById('paymentCurrency').addEventListener('change', updatePaymentMethodVisibility);

    document.addEventListener('click', () => document.querySelectorAll('.status-dropdown.open').forEach(d => d.classList.remove('open')));
}

async function loadCategories() {
    try {
        const { data } = await supabase
            .from('product_categories')
            .select('*')
            .eq('active', true)
            .order('name');
        
        if (data && data.length > 0) {
            productCategories = data.map(cat => cat.name);
        }
    } catch (error) {
        console.log('Using default categories');
    }
}

async function loadOrders() {
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        const statusFilter = document.getElementById('filterStatus').value;
        const searchTerm = document.getElementById('searchCustomer').value;

        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        if (searchTerm) {
            query = query.ilike('customer_name', `%${searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        displayOrders(data);

    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = 
            '<p class="pedidos-empty pedidos-error">Error al cargar los pedidos</p>';
    }
}

function getPaymentMethodText(method) {
    const map = { pago_movil: 'Pago Móvil', efectivo_usd: 'Efectivo', zelle: 'Zelle', usdt: 'USDT' };
    return map[method] || method || '-';
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="pedidos-empty">No hay pedidos. Pulsa "+ Nuevo" para crear uno.</p>';
        return;
    }

    const statusOptions = window.STATUS_OPTIONS || [
        { value: 'agendado', label: 'Agendado' }, { value: 'en_produccion', label: 'En Producción' },
        { value: 'listo', label: 'Listo' }, { value: 'entregado', label: 'Entregado' }, { value: 'cancelado', label: 'Cancelado' }
    ];
    const html = `<ul class="pedidos-item-list">${orders.map(order => {
        const items = JSON.parse(order.items || '[]');
        const itemsShort = items.length ? `${items[0].producto}${items.length > 1 ? ` +${items.length - 1}` : ''}` : '-';
        const statusMenu = statusOptions.map(s => `
            <li><button type="button" class="status-dropdown-option" data-status="${s.value}">${s.label}</button></li>
        `).join('');
        return `
        <li class="pedidos-item">
            <div class="pedidos-item-main">
                <span class="pedidos-item-number">#${order.order_number}</span>
                <div class="status-dropdown">
                    <button type="button" class="status-dropdown-btn status-${order.status}" data-order-id="${order.id}" aria-expanded="false">${getStatusText(order.status)} ▾</button>
                    <ul class="status-dropdown-menu">${statusMenu}</ul>
                </div>
            </div>
            <div class="pedidos-item-detail">${order.customer_name} · Entrega ${formatDate(order.delivery_date)}</div>
            <div class="pedidos-item-meta">${itemsShort} · ${formatCurrency(order.amount_euros, 'EUR')} · ${order.first_payment_percentage}%</div>
            <div class="pedidos-item-footer">
                <span class="pedidos-item-date">${formatDateTime(order.created_at)}</span>
                <div class="pedidos-item-actions">
                    <button type="button" class="pedidos-item-btn" onclick="viewOrderDetails('${order.id}')">Ver</button>
                    <button type="button" class="pedidos-item-btn" onclick="editOrder('${order.id}')">Editar</button>
                    <button type="button" class="pedidos-item-btn pedidos-item-btn-danger" onclick="deleteOrder('${order.id}')">Eliminar</button>
                </div>
            </div>
        </li>`;
    }).join('')}</ul>`;

    container.innerHTML = html;
    bindStatusDropdowns(container);
}

function bindStatusDropdowns(container) {
    if (!container) container = document.getElementById('ordersList');
    if (!container) return;
    container.querySelectorAll('.status-dropdown').forEach(drop => {
        const btn = drop.querySelector('.status-dropdown-btn');
        const menu = drop.querySelector('.status-dropdown-menu');
        const orderId = btn.dataset.orderId;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.status-dropdown.open').forEach(o => { if (o !== drop) o.classList.remove('open'); });
            drop.classList.toggle('open');
        });
        drop.querySelectorAll('.status-dropdown-option').forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newStatus = opt.dataset.status;
                try {
                    await updateOrderStatus(orderId, newStatus);
                    loadOrders();
                } catch (err) {
                    console.error(err);
                    alert('Error al actualizar estado');
                }
                drop.classList.remove('open');
            });
        });
    });
}

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
        // USDT
        dollarsGroup.classList.add('hidden');
        pagoMovilGroup.classList.add('hidden');
        document.getElementById('paymentMethodDollars').removeAttribute('required');
    }
}

function getPaymentMethodFromForm() {
    const currency = document.getElementById('paymentCurrency').value;
    if (currency === 'BS') return 'pago_movil';
    if (currency === 'USD') return document.getElementById('paymentMethodDollars').value; // efectivo_usd o zelle
    if (currency === 'USDT') return 'usdt';
    return 'pago_movil';
}

function openNewOrderModal() {
    currentOrderId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Pedido';
    document.getElementById('orderForm').reset();
    document.getElementById('orderId').value = '';
    document.getElementById('itemsContainer').innerHTML = '';
    addItem(); // Agregar un item por defecto
    updatePaymentMethodVisibility();
    document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function addItem() {
    const container = document.getElementById('itemsContainer');
    const itemId = Date.now();
    
    const itemHtml = `
        <div class="card" id="item-${itemId}" style="margin-bottom: 1rem; padding: 1rem;">
            <button type="button" class="modal-close" style="position: relative; top: 0; right: 0;" onclick="removeItem(${itemId})">&times;</button>
            
            <div class="grid grid-2" style="margin-bottom: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Producto*</label>
                    <select class="form-input item-producto" required>
                        ${productCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Cantidad*</label>
                    <input type="number" class="form-input item-cantidad" min="1" value="1" required>
                </div>
            </div>

            <div class="grid grid-3">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Talla*</label>
                    <select class="form-input item-talla" required>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="Única">Única</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Género*</label>
                    <select class="form-input item-genero" required>
                        <option value="Caballero">Caballero</option>
                        <option value="Dama">Dama</option>
                        <option value="Unisex">Unisex</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Color*</label>
                    <input type="text" class="form-input item-color" placeholder="Ej: Azul" required>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    if (window.initCustomSelects) window.initCustomSelects(container);
}

function removeItem(itemId) {
    const item = document.getElementById(`item-${itemId}`);
    if (item) {
        item.remove();
    }
}

function collectItems() {
    const items = [];
    const itemCards = document.querySelectorAll('#itemsContainer .card');
    
    itemCards.forEach(card => {
        const producto = card.querySelector('.item-producto').value;
        const cantidad = parseInt(card.querySelector('.item-cantidad').value);
        const talla = card.querySelector('.item-talla').value;
        const genero = card.querySelector('.item-genero').value;
        const color = card.querySelector('.item-color').value;
        
        items.push({ producto, cantidad, talla, genero, color });
    });
    
    return items;
}

document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const messageDiv = document.getElementById('formMessage');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Guardando...';
    messageDiv.innerHTML = '';
    
    try {
        const items = collectItems();
        
        if (items.length === 0) {
            throw new Error('Debes agregar al menos un producto');
        }
        
        const orderData = {
            customer_name: document.getElementById('customerName').value,
            items: JSON.stringify(items),
            amount_euros: parseFloat(document.getElementById('amountEuros').value),
            first_payment_percentage: parseInt(document.getElementById('paymentPercentage').value),
            payment_amount: parseFloat(document.getElementById('paymentAmount').value),
            payment_currency: document.getElementById('paymentCurrency').value,
            payment_method: getPaymentMethodFromForm(),
            pago_movil_reference: (document.getElementById('pagoMovilReference').value || '').trim() || null,
            status: document.getElementById('status').value,
            delivery_date: document.getElementById('deliveryDate').value,
            calendar_date: document.getElementById('deliveryDate').value
        };
        
        const orderId = document.getElementById('orderId').value;
        
        if (orderId) {
            // Actualizar
            const { error } = await supabase
                .from('orders')
                .update(orderData)
                .eq('id', orderId);
            
            if (error) throw error;
            
            messageDiv.innerHTML = '<div class="alert alert-success">Pedido actualizado exitosamente</div>';
        } else {
            // Crear nuevo pedido
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select('id, order_number')
                .single();
            
            if (orderError) throw orderError;
            
            // Registrar el pago inicial en payments para que sume en ingresos (Bs/USD) de Stats
            if (newOrder && parseFloat(orderData.payment_amount) > 0) {
                await supabase
                    .from('payments')
                    .insert({
                        order_id: newOrder.id,
                        concept: `Pago inicial pedido #${newOrder.order_number}`,
                        payment_type: 'inicial_50',
                        amount: orderData.payment_amount,
                        currency: orderData.payment_currency,
                        reference: orderData.pago_movil_reference || null
                    });
            }
            
            messageDiv.innerHTML = '<div class="alert alert-success">Pedido creado exitosamente</div>';
        }
        
        setTimeout(() => {
            closeOrderModal();
            loadOrders();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving order:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Pedido';
    }
});

async function editOrder(orderId) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        currentOrderId = orderId;
        document.getElementById('modalTitle').textContent = 'Editar Pedido';
        document.getElementById('orderId').value = orderId;
        document.getElementById('customerName').value = data.customer_name;
        document.getElementById('amountEuros').value = data.amount_euros;
        document.getElementById('paymentPercentage').value = data.first_payment_percentage;
        document.getElementById('paymentAmount').value = data.payment_amount;
        document.getElementById('paymentCurrency').value = data.payment_currency;
        if (data.payment_currency === 'USD' && (data.payment_method === 'efectivo_usd' || data.payment_method === 'zelle')) {
            document.getElementById('paymentMethodDollars').value = data.payment_method;
        }
        document.getElementById('pagoMovilReference').value = data.pago_movil_reference || '';
        updatePaymentMethodVisibility();
        document.getElementById('status').value = data.status;
        document.getElementById('deliveryDate').value = data.delivery_date;
        
        // Cargar items
        const items = JSON.parse(data.items || '[]');
        document.getElementById('itemsContainer').innerHTML = '';
        
        if (items.length === 0) {
            addItem();
        } else {
            items.forEach(item => {
                addItem();
                const lastCard = document.querySelector('#itemsContainer .card:last-child');
                const setSelect = (sel, val) => {
                    if (!sel) return;
                    sel.value = val;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                };
                setSelect(lastCard.querySelector('.item-producto'), item.producto);
                lastCard.querySelector('.item-cantidad').value = item.cantidad;
                setSelect(lastCard.querySelector('.item-talla'), item.talla);
                setSelect(lastCard.querySelector('.item-genero'), item.genero);
                lastCard.querySelector('.item-color').value = item.color;
            });
        }
        
        document.getElementById('orderModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading order:', error);
        alert('Error al cargar el pedido');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('¿Estás segura de que quieres eliminar este pedido?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);
        
        if (error) throw error;
        
        loadOrders();
        
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error al eliminar el pedido');
    }
}

async function viewOrderDetails(orderId) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        const items = JSON.parse(data.items || '[]');
        const itemsHtml = items.map(item => `
            <div style="padding: 0.5rem; border-bottom: 1px solid var(--gray-200);">
                <strong>${item.producto}</strong> x${item.cantidad}<br>
                Talla: ${item.talla} | ${item.genero} | Color: ${item.color}
            </div>
        `).join('');
        
        const html = `
            <h2 class="mb-3">Pedido #${data.order_number}</h2>
            
            <div class="mb-3">
                <span class="status-badge status-${data.status}">${getStatusText(data.status)}</span>
            </div>
            
            <div class="grid grid-2 mb-3">
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Cliente</div>
                    <div style="font-weight: 600;">${data.customer_name}</div>
                </div>
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Fecha de Creación</div>
                    <div style="font-weight: 600;">${formatDateTime(data.created_at)}</div>
                </div>
            </div>
            
            <div class="mb-3">
                <h3 style="font-size: 1rem; margin-bottom: 0.5rem;">Productos</h3>
                ${itemsHtml}
            </div>
            
            <div class="grid grid-2 mb-3">
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Monto Total</div>
                    <div style="font-weight: 600; font-size: 1.25rem;">${formatCurrency(data.amount_euros, 'EUR')}</div>
                </div>
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Fecha de Entrega</div>
                    <div style="font-weight: 600;">${formatDate(data.delivery_date)}</div>
                </div>
            </div>
            
            <div class="grid grid-2 mb-3">
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Pago Inicial</div>
                    <div style="font-weight: 600;">${data.first_payment_percentage}%</div>
                </div>
                <div>
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Monto Pagado</div>
                    <div style="font-weight: 600;">${formatCurrency(data.payment_amount, data.payment_currency)}</div>
                </div>
            </div>
            
            <div class="mb-3">
                <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Método de Pago</div>
                <div style="font-weight: 600;">${getPaymentMethodText(data.payment_method)}</div>
            </div>
            ${data.payment_method === 'pago_movil' && data.pago_movil_reference ? `
            <div class="mb-3">
                <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase;">Referencia Pago Móvil</div>
                <div style="font-weight: 600;">${data.pago_movil_reference}</div>
            </div>
            ` : ''}
            
            <button class="btn btn-primary" onclick="closeDetailsModal()">Cerrar</button>
        `;
        
        document.getElementById('orderDetails').innerHTML = html;
        document.getElementById('detailsModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading order details:', error);
        alert('Error al cargar los detalles del pedido');
    }
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

// Inicializar
init();
