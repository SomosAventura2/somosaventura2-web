let session;
let currentDate = new Date();
let orders = [];

async function init() {
    session = await checkAuth();
    if (!session) return;
    
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar título
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // Días del mes anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayDiv = createDayElement(day, true, year, month - 1);
        calendarDays.appendChild(dayDiv);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = createDayElement(day, false, year, month);
        calendarDays.appendChild(dayDiv);
    }
    
    // Días del mes siguiente
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 rows x 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = createDayElement(day, true, year, month + 1);
        calendarDays.appendChild(dayDiv);
    }
    
    // Cargar pedidos
    loadOrdersForMonth();
}

function createDayElement(day, otherMonth, year, month) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day' + (otherMonth ? ' other-month' : '');
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dayDiv.dataset.date = dateStr;
    
    dayDiv.innerHTML = `<div class="calendar-day-number">${day}</div>`;
    
    // Hacer el día un contenedor sortable
    new Sortable(dayDiv, {
        group: 'calendar',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: handleOrderDrop
    });
    
    return dayDiv;
}

async function loadOrdersForMonth() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .gte('calendar_date', firstDay)
            .lte('calendar_date', lastDay)
            .not('status', 'eq', 'cancelado');
        
        if (error) throw error;
        
        orders = data || [];
        displayOrdersOnCalendar();
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrdersOnCalendar() {
    // Limpiar pedidos existentes
    document.querySelectorAll('.calendar-order').forEach(el => el.remove());
    
    orders.forEach(order => {
        const dayElement = document.querySelector(`[data-date="${order.calendar_date}"]`);
        if (dayElement) {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'calendar-order';
            orderDiv.dataset.orderId = order.id;
            orderDiv.draggable = true;
            
            const isCompleted = order.status === 'entregado';
            if (isCompleted) {
                orderDiv.classList.add('completed');
            }
            
            orderDiv.innerHTML = `
                <input type="checkbox" 
                       ${isCompleted ? 'checked' : ''} 
                       onclick="toggleOrderComplete('${order.id}', this.checked)"
                       style="margin-right: 0.25rem;">
                #${order.order_number} - ${order.customer_name}
            `;
            
            orderDiv.onclick = (e) => {
                if (e.target.type !== 'checkbox') {
                    window.location.href = `pedidos.html?id=${order.id}`;
                }
            };
            
            dayElement.appendChild(orderDiv);
        }
    });
}

async function handleOrderDrop(evt) {
    const orderId = evt.item.dataset.orderId;
    const newDate = evt.to.dataset.date;
    
    if (!orderId || !newDate) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                calendar_date: newDate,
                delivery_date: newDate 
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        // Actualizar el orden local
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.calendar_date = newDate;
            order.delivery_date = newDate;
        }
        
    } catch (error) {
        console.error('Error updating order date:', error);
        alert('Error al mover el pedido');
        renderCalendar(); // Recargar en caso de error
    }
}

async function toggleOrderComplete(orderId, isCompleted) {
    try {
        const newStatus = isCompleted ? 'entregado' : 'listo';
        
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);
        
        if (error) throw error;
        
        // Actualizar el orden local
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
        }
        
        displayOrdersOnCalendar();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error al actualizar el estado');
    }
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// Inicializar
init();
