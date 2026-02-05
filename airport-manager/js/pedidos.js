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
            '<div class="alert alert-error">Error al cargar los pedidos</div>';
    }
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="card text-center" style="padding: 3rem;">
                <h3 style="color: var(--gray-500);">No hay pedidos registrados</h3>
                <p style="color: var(--gray-500);">Crea tu primer pedido haciendo clic en "Nuevo Pedido"</p>
            </div>
        `;
        return;
    }

    const html = orders.map(order => {
        const items = JSON.parse(order.items || '[]');
        const itemsText = items.map(item => 
            `${item.producto} x${item.cantidad} (${item.talla} ${item.genero})`
        ).join(', ');

        return `
            <div class="card">
                <div class="flex flex-between flex-align-center mb-3">
                    <div>
                        <h3 class="mono">#${order.order_number}</h3>
                        <div style="color: var(--gray-500); font-size: 0.85rem; margin-top: 0.25rem;">
                            ${formatDateTime(order.created_at)}
                        </div>
                    </div>
                    <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
                </div>

                <div class="grid grid-2 mb-3">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase; letter-spacing: 1px;">Cliente</div>
                        <div style="font-weight: 600;">${order.customer_name}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase; letter-spacing: 1px;">Entrega</div>
                        <div style="font-weight: 600;">${formatDate(order.delivery_date)}</div>
                    </div>
                </div>

                <div class="mb-3">
                    <div style="font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">Productos</div>
                    <div style="color: var(--gray-700);">${itemsText || 'Sin productos'}</div>
                </div>

                <div class="grid grid-3 mb-3">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--gray-500);">Monto Total</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">${formatCurrency(order.amount_euros, 'EUR')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--gray-500);">Pago Inicial</div>
                        <div style="font-weight: 600;">${order.first_payment_percentage}%</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--gray-500);">Método</div>
                        <div style="font-weight: 600;">${order.payment_method}</div>
                    </div>
                </div>

                <div class="flex flex-gap-2">
                    <button class="btn btn-sm btn-outline" onclick="viewOrderDetails('${order.id}')">Ver Detalles</button>
                    <button class="btn btn-sm" onclick="editOrder('${order.id}')">Editar</button>
                    <button class="btn btn-sm btn-accent" onclick="deleteOrder('${order.id}')">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function openNewOrderModal() {
    currentOrderId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Pedido';
    document.getElementById('orderForm').reset();
    document.getElementById('orderId').value = '';
    document.getElementById('itemsContainer').innerHTML = '';
    addItem(); // Agregar un item por defecto
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
            payment_method: document.getElementById('paymentMethod').value,
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
            // Crear nuevo
            const { error } = await supabase
                .from('orders')
                .insert(orderData);
            
            if (error) throw error;
            
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
        document.getElementById('paymentMethod').value = data.payment_method;
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
                lastCard.querySelector('.item-producto').value = item.producto;
                lastCard.querySelector('.item-cantidad').value = item.cantidad;
                lastCard.querySelector('.item-talla').value = item.talla;
                lastCard.querySelector('.item-genero').value = item.genero;
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
                <div style="font-weight: 600;">${data.payment_method}</div>
            </div>
            
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
