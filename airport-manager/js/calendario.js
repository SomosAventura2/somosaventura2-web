let session;
let currentDate = new Date();
let orders = [];
let sortableInstances = [];

const STATUSES_IN_CALENDAR = ['agendado', 'en_produccion'];

async function init() {
    session = await checkAuth();
    if (!session) return;
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    const container = document.getElementById('calendarDays');
    container.innerHTML = '';

    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    // Lunes = primera columna. Rango: desde el Lunes de la semana del día 1 hasta el Domingo de la semana del último día del mes.
    const firstOfMonth = new Date(year, month, 1);
    const offset = (firstOfMonth.getDay() + 6) % 7; // 0 = Lunes
    const firstMonday = 1 - offset;
    const lastDayNum = new Date(year, month + 1, 0).getDate();
    const lastDate = new Date(year, month, lastDayNum);
    const lastWeekday = (lastDate.getDay() + 6) % 7; // 0=Lun, 6=Dom
    const daysToSunday = 6 - lastWeekday;
    const startDate = new Date(year, month, firstMonday);
    const endDate = new Date(year, month, lastDayNum + daysToSunday);

    const cellDate = new Date(startDate);
    while (cellDate <= endDate) {
        const dateStr = cellDate.toISOString().split('T')[0];
        const dayNum = cellDate.getDate();
        const isOtherMonth = cellDate.getMonth() !== month;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day' + (isOtherMonth ? ' calendar-day-other' : '');
        dayEl.dataset.date = dateStr;
        dayEl.innerHTML = `<div class="calendar-day-num">${dayNum}</div><div class="calendar-day-pills"></div>`;
        container.appendChild(dayEl);
        cellDate.setDate(cellDate.getDate() + 1);
    }

    container.querySelectorAll('.calendar-day').forEach(dayEl => {
        const pillsContainer = dayEl.querySelector('.calendar-day-pills');
        const s = new Sortable(pillsContainer, {
            group: 'orders',
            animation: 150,
            ghostClass: 'calendar-pill-ghost',
            chosenClass: 'calendar-pill-chosen',
            onEnd: handleOrderDrop
        });
        sortableInstances.push(s);
    });

    loadOrdersForMonth();
}

async function loadOrdersForMonth() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const offset = (firstOfMonth.getDay() + 6) % 7;
        const firstMonday = 1 - offset;
        const lastDayNum = new Date(year, month + 1, 0).getDate();
        const lastDate = new Date(year, month, lastDayNum);
        const lastWeekday = (lastDate.getDay() + 6) % 7;
        const daysToSunday = 6 - lastWeekday;
        const rangeStart = new Date(year, month, firstMonday);
        const rangeEnd = new Date(year, month, lastDayNum + daysToSunday);
        const firstDay = rangeStart.toISOString().split('T')[0];
        const lastDay = rangeEnd.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .in('status', STATUSES_IN_CALENDAR)
            .gte('calendar_date', firstDay)
            .lte('calendar_date', lastDay)
            .order('order_number');

        if (error) throw error;
        orders = data || [];
        displayOrdersOnCalendar();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrdersOnCalendar() {
    document.querySelectorAll('.calendar-pill').forEach(el => el.remove());

    const toShow = orders.filter(o => STATUSES_IN_CALENDAR.includes(o.status));
    toShow.forEach(order => {
        const dateStr = order.calendar_date;
        const pillsContainer = document.querySelector(`[data-date="${dateStr}"] .calendar-day-pills`);
        if (!pillsContainer) return;

        const pill = document.createElement('div');
        pill.className = 'calendar-pill';
        pill.dataset.orderId = order.id;
        pill.draggable = true;
        pill.innerHTML = `
            <label class="calendar-pill-inner">
                <input type="checkbox" class="calendar-pill-checkbox" onclick="event.stopPropagation(); toggleOrderComplete('${order.id}', this.checked)">
                <span class="calendar-pill-text">#${order.order_number} ${order.customer_name}</span>
            </label>
        `;
        pill.onclick = (e) => {
            if (e.target.type !== 'checkbox' && !e.target.closest('input')) {
                window.location.href = `pedidos.html`;
            }
        };
        pillsContainer.appendChild(pill);
    });
}

async function handleOrderDrop(evt) {
    const orderId = evt.item.dataset.orderId;
    const toCell = evt.to.closest('.calendar-day');
    const newDate = toCell ? toCell.dataset.date : null;
    if (!orderId || !newDate) return;

    try {
        const { error } = await supabase
            .from('orders')
            .update({ calendar_date: newDate, delivery_date: newDate })
            .eq('id', orderId);

        if (error) throw error;
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.calendar_date = newDate;
            order.delivery_date = newDate;
        }
    } catch (error) {
        console.error('Error updating order date:', error);
        renderCalendar();
    }
}

async function toggleOrderComplete(orderId, isCompleted) {
    try {
        const newStatus = isCompleted ? 'listo' : 'en_produccion';
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) throw error;
        const order = orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        displayOrdersOnCalendar();
    } catch (error) {
        console.error('Error updating order status:', error);
        renderCalendar();
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

init();
