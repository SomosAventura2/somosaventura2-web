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
let customerSearchTimer = null;
const VIP_MIN_ORDERS = 3;
const VIP_MIN_SPENT = 150;

async function init() {
    session = await checkAuth();
    if (!session) return;
    
    loadOrders();
    loadCategories();
    initCustomerSearch();

    const searchFilter = document.getElementById('searchCustomer');
    let searchDebounce;
    if (searchFilter) {
        searchFilter.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => loadOrders(), 300);
        });
    }
    document.getElementById('filterStatus').addEventListener('change', () => loadOrders());

    document.getElementById('paymentCurrency').addEventListener('change', updatePaymentMethodVisibility);

    let draftSaveTimer;
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('input', () => {
            clearTimeout(draftSaveTimer);
            draftSaveTimer = setTimeout(() => {
                if (!document.getElementById('orderId').value) saveOrderDraft();
            }, 2000);
        });
        orderForm.addEventListener('change', () => {
            clearTimeout(draftSaveTimer);
            draftSaveTimer = setTimeout(() => {
                if (!document.getElementById('orderId').value) saveOrderDraft();
            }, 2000);
        });
    }

    window.pullToRefreshCallback = function () { return loadOrders(); };
    window.addEventListener('offlineQueueFlush', function () {
        loadOrders();
        if (window.Toast) window.Toast.show('Conexión restaurada. Lista actualizada.', 'success', 2000);
    });
    if (window.subscribeRealtimeTable) {
        window.subscribeRealtimeTable('orders', function () {
            window.queryCacheInvalidate('orders_');
            loadOrders();
        });
    }

    document.addEventListener('click', () => document.querySelectorAll('.status-dropdown.open').forEach(d => d.classList.remove('open')));

    const params = new URLSearchParams(window.location.search);
    const customerIdParam = params.get('customer_id');
    if (customerIdParam) {
        try {
            const { data } = await supabase.from('customers').select('*').eq('id', customerIdParam).single();
            if (data) {
                openNewOrderModal();
                selectCustomer(data);
            }
        } catch (e) { /* ignore */ }
    }
}

function initCustomerSearch() {
    const input = document.getElementById('customerSearch');
    const suggestions = document.getElementById('customerSuggestions');
    if (!input || !suggestions) return;
    input.addEventListener('input', () => {
        clearTimeout(customerSearchTimer);
        const term = (input.value || '').trim();
        if (term.length < 2) {
            suggestions.classList.add('hidden');
            suggestions.innerHTML = '';
            return;
        }
        customerSearchTimer = setTimeout(() => fetchCustomerSuggestions(term), 250);
    });
    input.addEventListener('focus', () => {
        const term = (input.value || '').trim();
        if (term.length >= 2 && suggestions.innerHTML) suggestions.classList.remove('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!suggestions.contains(e.target) && e.target !== input) suggestions.classList.add('hidden');
    });
}

async function fetchCustomerSuggestions(term) {
    const suggestions = document.getElementById('customerSuggestions');
    if (!suggestions) return;
    try {
        const { data: list, error } = await supabase
            .from('customers')
            .select('id, first_name, last_name, phone, email, total_orders, total_spent_eur')
            .eq('is_active', true)
            .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
            .limit(8);
        if (error) throw error;
        const customers = list || [];
        const fullName = `${(term || '').trim()}`;
        let html = customers.map(c => {
            const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
            const isVip = (c.total_orders >= VIP_MIN_ORDERS || parseFloat(c.total_spent_eur || 0) >= VIP_MIN_SPENT);
            return `<div class="customer-suggestion-item" data-id="${c.id}" data-json="${escapeJson(JSON.stringify(c))}">
                <strong>${name}</strong>
                <small>${c.total_orders || 0} pedidos · €${parseFloat(c.total_spent_eur || 0).toFixed(0)}${isVip ? ' · ⭐ VIP' : ''}</small>
            </div>`;
        }).join('');
        html += `<div class="customer-suggestion-create" data-name="${escapeHtml(fullName)}">+ Crear "${fullName}" como nuevo cliente</div>`;
        suggestions.innerHTML = html;
        suggestions.classList.remove('hidden');
        suggestions.querySelectorAll('.customer-suggestion-item').forEach(el => {
            el.addEventListener('click', () => {
                const c = JSON.parse(unescapeJson(el.dataset.json));
                selectCustomer(c);
                suggestions.classList.add('hidden');
            });
        });
        const createEl = suggestions.querySelector('.customer-suggestion-create');
        if (createEl) createEl.addEventListener('click', () => openNewCustomerModal(createEl.dataset.name || input.value));
    } catch (e) {
        suggestions.innerHTML = '<div class="customer-suggestion-item">Error al buscar</div>';
        suggestions.classList.remove('hidden');
    }
}

function escapeJson(s) {
    return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function unescapeJson(s) {
    return (s || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function selectCustomer(c) {
    const idEl = document.getElementById('customerId');
    const searchEl = document.getElementById('customerSearch');
    const card = document.getElementById('selectedCustomerCard');
    const nameEl = document.getElementById('selectedCustomerName');
    const metaEl = document.getElementById('selectedCustomerMeta');
    const statsEl = document.getElementById('selectedCustomerStats');
    const badgeEl = document.getElementById('selectedCustomerBadge');
    if (!idEl || !searchEl || !card) return;
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    idEl.value = c.id || '';
    searchEl.value = name;
    searchEl.setAttribute('readonly', 'readonly');
    nameEl.textContent = name;
    metaEl.textContent = [c.phone, c.email].filter(Boolean).join(' · ') || '—';
    statsEl.textContent = `${c.total_orders || 0} pedidos · Último: ${c.last_order_date ? formatDate(c.last_order_date) : '—'}`;
    const isVip = (c.total_orders >= VIP_MIN_ORDERS || parseFloat(c.total_spent_eur || 0) >= VIP_MIN_SPENT);
    if (badgeEl) {
        badgeEl.textContent = isVip ? '⭐ VIP' : '';
        badgeEl.classList.toggle('hidden', !isVip);
    }
    card.classList.remove('hidden');
}

function clearSelectedCustomer() {
    const idEl = document.getElementById('customerId');
    const searchEl = document.getElementById('customerSearch');
    const card = document.getElementById('selectedCustomerCard');
    if (idEl) idEl.value = '';
    if (searchEl) { searchEl.value = ''; searchEl.removeAttribute('readonly'); }
    if (card) card.classList.add('hidden');
}

function openNewCustomerModal(prefillName) {
    document.getElementById('customerSuggestions').classList.add('hidden');
    const first = document.getElementById('newCustomerFirstName');
    const last = document.getElementById('newCustomerLastName');
    const parts = (prefillName || '').trim().split(/\s+/);
    if (parts.length >= 2) {
        first.value = parts[0];
        last.value = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
        first.value = parts[0];
        last.value = '';
    } else {
        first.value = '';
        last.value = '';
    }
    document.getElementById('newCustomerPhone').value = '';
    document.getElementById('newCustomerEmail').value = '';
    document.getElementById('newCustomerMessage').innerHTML = '';
    document.getElementById('newCustomerModal').classList.add('active');
}

function closeNewCustomerModal() {
    document.getElementById('newCustomerModal').classList.remove('active');
}

document.getElementById('newCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = (document.getElementById('newCustomerPhone').value || '').trim();
    const email = (document.getElementById('newCustomerEmail').value || '').trim();
    if (!phone && !email) {
        document.getElementById('newCustomerMessage').innerHTML = '<div class="alert alert-error">Indica al menos teléfono o email.</div>';
        return;
    }
    const msgEl = document.getElementById('newCustomerMessage');
    msgEl.innerHTML = '';
    try {
        const { data: created, error } = await supabase
            .from('customers')
            .insert({
                first_name: document.getElementById('newCustomerFirstName').value.trim(),
                last_name: document.getElementById('newCustomerLastName').value.trim(),
                phone: phone || null,
                email: email || null,
                total_orders: 0,
                total_spent_eur: 0,
                avg_order_value: 0
            })
            .select('id, first_name, last_name, phone, email, total_orders, total_spent_eur, last_order_date')
            .single();
        if (error) throw error;
        selectCustomer(created);
        closeNewCustomerModal();
    } catch (err) {
        msgEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
});

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

function showOrdersSkeleton() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    container.innerHTML = '<ul class="pedidos-item-list">' + Array(4).fill(0).map(() => `
        <li class="pedidos-item skeleton-item">
            <div class="skeleton-line" style="width:60px;height:1.2rem;margin-bottom:0.5rem"></div>
            <div class="skeleton-line" style="width:85%;height:1rem;margin-bottom:0.35rem"></div>
            <div class="skeleton-line" style="width:70%;height:0.9rem;margin-bottom:0.5rem"></div>
            <div class="skeleton-line" style="width:40%;height:0.85rem"></div>
        </li>
    `).join('') + '</ul>';
}

async function loadOrders() {
    const statusFilter = document.getElementById('filterStatus').value;
    const searchTerm = (document.getElementById('searchCustomer') && document.getElementById('searchCustomer').value) || '';
    const cacheKey = 'orders_' + statusFilter + '_' + searchTerm;
    const cached = window.queryCacheGet && window.queryCacheGet(cacheKey);
    if (cached) {
        displayOrders(cached);
        return;
    }
    showOrdersSkeleton();
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (statusFilter) query = query.eq('status', statusFilter);
        if (searchTerm) query = query.ilike('customer_name', `%${searchTerm}%`);

        const { data, error } = await query;

        if (error) throw error;
        if (window.queryCacheSet) window.queryCacheSet(cacheKey, data);

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
                    if (window.queryCacheInvalidate) window.queryCacheInvalidate('orders_');
                    loadOrders();
                } catch (err) {
                    console.error(err);
                    if (window.Toast) Toast.show('Error al actualizar estado', 'error'); else alert('Error al actualizar estado');
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

const ORDER_DRAFT_KEY = 'airport_order_draft';

function saveOrderDraft() {
    try {
        const customerName = (document.getElementById('customerSearch') && document.getElementById('customerSearch').value || '').trim();
        const items = document.getElementById('itemsContainer') ? collectItems() : [];
        if (!customerName && items.length === 0) return;
        const draft = {
            customerId: (document.getElementById('customerId') && document.getElementById('customerId').value) || '',
            customerName: customerName,
            items: items,
            amountEuros: document.getElementById('amountEuros') && document.getElementById('amountEuros').value,
            paymentPercentage: document.getElementById('paymentPercentage') && document.getElementById('paymentPercentage').value,
            paymentAmount: document.getElementById('paymentAmount') && document.getElementById('paymentAmount').value,
            paymentCurrency: document.getElementById('paymentCurrency') && document.getElementById('paymentCurrency').value,
            paymentMethodDollars: document.getElementById('paymentMethodDollars') && document.getElementById('paymentMethodDollars').value,
            pagoMovilReference: document.getElementById('pagoMovilReference') && document.getElementById('pagoMovilReference').value,
            status: document.getElementById('status') && document.getElementById('status').value,
            deliveryDate: document.getElementById('deliveryDate') && document.getElementById('deliveryDate').value
        };
        localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { /* ignore */ }
}

function restoreOrderDraft() {
    const raw = localStorage.getItem(ORDER_DRAFT_KEY);
    if (!raw) return false;
    try {
        const draft = JSON.parse(raw);
        if (!draft) return false;
        document.getElementById('customerId').value = draft.customerId || '';
        document.getElementById('customerSearch').value = draft.customerName || '';
        document.getElementById('customerSearch').removeAttribute('readonly');
        document.getElementById('selectedCustomerCard').classList.add('hidden');
        if (draft.amountEuros) document.getElementById('amountEuros').value = draft.amountEuros;
        if (draft.paymentPercentage) document.getElementById('paymentPercentage').value = draft.paymentPercentage;
        if (draft.paymentAmount) document.getElementById('paymentAmount').value = draft.paymentAmount;
        if (draft.paymentCurrency) document.getElementById('paymentCurrency').value = draft.paymentCurrency;
        updatePaymentMethodVisibility();
        if (draft.paymentMethodDollars) document.getElementById('paymentMethodDollars').value = draft.paymentMethodDollars;
        if (draft.pagoMovilReference) document.getElementById('pagoMovilReference').value = draft.pagoMovilReference;
        if (draft.status) document.getElementById('status').value = draft.status;
        if (draft.deliveryDate) document.getElementById('deliveryDate').value = draft.deliveryDate;
        document.getElementById('itemsContainer').innerHTML = '';
        (draft.items && draft.items.length ? draft.items : [{ producto: productCategories[0], cantidad: 1, talla: 'M', genero: 'Unisex', color: '' }]).forEach(function (item) {
            addItem();
            const lastCard = document.querySelector('#itemsContainer .card:last-child');
            if (!lastCard) return;
            const setSelect = function (sel, val) {
                if (!sel) return;
                sel.value = val;
                if (typeof sel.dispatchEvent === 'function') sel.dispatchEvent(new Event('change', { bubbles: true }));
            };
            var prodSel = lastCard.querySelector('.item-producto');
            if (prodSel) setSelect(prodSel, item.producto || productCategories[0]);
            var cant = lastCard.querySelector('.item-cantidad');
            if (cant) cant.value = item.cantidad || 1;
            setSelect(lastCard.querySelector('.item-talla'), item.talla || 'M');
            setSelect(lastCard.querySelector('.item-genero'), item.genero || 'Unisex');
            var colorInp = lastCard.querySelector('.item-color');
            if (colorInp) colorInp.value = item.color || '';
        });
        if (window.initCustomSelects) window.initCustomSelects(document.getElementById('itemsContainer'));
        if (draft.customerId) {
            supabase.from('customers').select('*').eq('id', draft.customerId).single().then(function (_a) {
                var data = _a.data;
                if (data) selectCustomer(data);
            });
        }
        localStorage.removeItem(ORDER_DRAFT_KEY);
        if (window.Toast) Toast.show('Borrador restaurado', 'info', 2000);
        return true;
    } catch (e) {
        return false;
    }
}

function openNewOrderModal() {
    currentOrderId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Pedido';
    document.getElementById('orderForm').reset();
    document.getElementById('orderId').value = '';
    document.getElementById('customerId').value = '';
    document.getElementById('customerSearch').value = '';
    document.getElementById('customerSearch').removeAttribute('readonly');
    document.getElementById('selectedCustomerCard').classList.add('hidden');
    document.getElementById('itemsContainer').innerHTML = '';
    addItem();
    updatePaymentMethodVisibility();
    document.getElementById('orderModal').classList.add('active');
    if (localStorage.getItem(ORDER_DRAFT_KEY) && confirm('¿Restaurar el último borrador?')) {
        restoreOrderDraft();
    }
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
        
        const customerName = (document.getElementById('customerSearch').value || '').trim();
        if (!customerName) {
            messageDiv.innerHTML = '<div class="alert alert-error">Indica el cliente (busca o crea uno nuevo).</div>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Pedido';
            return;
        }
        const customerIdVal = (document.getElementById('customerId').value || '').trim() || null;
        const orderData = {
            customer_id: customerIdVal,
            customer_name: customerName,
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
            if (window.Toast) Toast.show('Pedido actualizado', 'success');
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
            if (window.Toast) Toast.show('Pedido creado', 'success');
        }
        try { localStorage.removeItem(ORDER_DRAFT_KEY); } catch (e) {}
        if (window.queryCacheInvalidate) window.queryCacheInvalidate('orders_');
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
        document.getElementById('customerId').value = data.customer_id || '';
        document.getElementById('customerSearch').value = data.customer_name || '';
        document.getElementById('customerSearch').removeAttribute('readonly');
        const card = document.getElementById('selectedCustomerCard');
        if (data.customer_id) {
            try {
                const { data: cust } = await supabase.from('customers').select('*').eq('id', data.customer_id).single();
                if (cust) selectCustomer(cust);
                else card.classList.add('hidden');
            } catch (_) { card.classList.add('hidden'); }
        } else {
            card.classList.add('hidden');
        }
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
        if (window.Toast) Toast.show('Error al cargar el pedido', 'error'); else alert('Error al cargar el pedido');
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
        if (window.queryCacheInvalidate) window.queryCacheInvalidate('orders_');
        loadOrders();
        
    } catch (error) {
        console.error('Error deleting order:', error);
        if (window.Toast) Toast.show('Error al eliminar el pedido', 'error'); else alert('Error al eliminar el pedido');
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
        if (window.Toast) Toast.show('Error al cargar los detalles del pedido', 'error'); else alert('Error al cargar los detalles del pedido');
    }
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

// Inicializar
init();
