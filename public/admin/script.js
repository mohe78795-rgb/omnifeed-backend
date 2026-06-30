const API = "https://0zk30qr9iu.onrender.com";

// تبديل الأقسام
function showSec(id) {
    document.querySelectorAll('.admin-sec').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// جلب البيانات من السيرفر
async function fetchAdminData() {
    try {
        // 1. جلب الإحصائيات
        const statsRes = await fetch(`${API}/api/admin/stats`);
        const stats = await statsRes.json();
        document.getElementById('stat-sales').innerText = stats.totalSales.toLocaleString() + " YER";
        document.getElementById('stat-orders').innerText = stats.totalOrders;
        document.getElementById('stat-users').innerText = stats.totalUsers;
        document.getElementById('stat-stars').innerText = stats.totalStars;

        // 2. جلب الطلبات الحية
        const ordersRes = await fetch(`${API}/api/admin/orders`);
        const orders = await ordersRes.json();
        renderAdminOrders(orders);

    } catch (e) {
        toast("❌ فشل الاتصال بالسيرفر");
    }
}

function renderAdminOrders(orders) {
    const list = document.getElementById('admin-orders-list');
    list.innerHTML = orders.map(o => `
        <div class="admin-order-card">
            <div>
                <h4 class="font-black text-emerald-500">طلب #${o.id}</h4>
                <p class="text-xs text-slate-400">الزبون: ${o.userPhone} | المبلغ: ${o.total} YER</p>
                <div class="mt-2 text-[10px] text-white/50">
                    ${o.items.map(i => `${i.name} (x${i.qty})`).join(' , ')}
                </div>
            </div>
            <div class="flex gap-3">
                <select onchange="updateOrderStatus('${o.id}', this.value)" class="bg-black/40 text-xs p-2 rounded-lg outline-none">
                    <option value="0" ${o.statusStep == 0 ? 'selected' : ''}>تم الاستلام</option>
                    <option value="1" ${o.statusStep == 1 ? 'selected' : ''}>جاري التجهيز</option>
                    <option value="2" ${o.statusStep == 2 ? 'selected' : ''}>مع السائق</option>
                    <option value="3" ${o.statusStep == 3 ? 'selected' : ''}>تم التوصيل</option>
                </select>
                <button onclick="deleteOrder('${o.id}')" class="text-red-500 p-2"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// تحديث حالة الطلب وإرسالها للسيرفر ليراها المستخدم فوراً
async function updateOrderStatus(orderId, step) {
    try {
        const res = await fetch(`${API}/api/orders/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, step: step })
        });
        if (res.ok) toast("✅ تم تحديث حالة الطلب");
    } catch (e) { toast("❌ فشل التحديث"); }
}

// تحديث إعدادات المتجر (الأخبار والحالة)
async function updateSettings() {
    const status = document.getElementById('set-status').value;
    const news = document.getElementById('set-news').value;

    try {
        const res = await fetch(`${API}/api/admin/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, news })
        });
        if (res.ok) toast("✅ تم حفظ الإعدادات بنجاح");
    } catch (e) { toast("❌ فشل الاتصال"); }
}

function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// التحديث التلقائي للبيانات كل 30 ثانية لمراقبة الطلبات الجديدة
setInterval(fetchAdminData, 30000);
window.onload = fetchAdminData;
