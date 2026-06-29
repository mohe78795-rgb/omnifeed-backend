const API = "https://0zk30qr9iu.onrender.com";

// --- دالة جلب الطلبات ---
async function fetchOrders() {
    try {
        const res = await fetch(`${API}/api/orders`);
        const orders = await res.json();
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = orders.map(o => `
            <div class="order-card shadow-2xl bg-[#0a101e] p-5 rounded-2xl border border-white/5">
                <div class="flex justify-between mb-4">
                    <span class="font-black text-emerald-500">طلب #${o.id}</span>
                    <span class="text-xs text-slate-500">${o.date}</span>
                </div>
                <div class="text-sm font-bold mb-4 text-slate-300">
                    ${o.items.map(i => `<div class="flex justify-between"><span>${i.name}</span><span>x${i.qty}</span></div>`).join('')}
                </div>
                <div class="border-t border-white/5 pt-4 flex justify-between items-center">
                    <span class="text-lg font-black">${o.total.toLocaleString()} YER</span>
                    <button class="bg-emerald-500 text-black font-black px-4 py-2 rounded-xl text-xs">تم التجهيز</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.log("خطأ في جلب الطلبات"); }
}

// --- دالة جلب وعرض الزبائن ---
async function fetchAndRenderUsers() {
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const container = document.getElementById('users-list');
        if (!container) return;
        
        container.innerHTML = data.active_users.map(u => `
            <div class="bg-[#0a101e] border border-emerald-500/30 p-5 rounded-2xl">
                <p class="font-black text-white">الاسم: ${u.name}</p>
                <p class="text-xs text-slate-400">الهاتف: ${u.phone}</p>
                <p class="text-emerald-500 font-black mt-2">الرصيد: <span id="balance-${u.phone}">${u.balance || 0}</span> YER</p>
                <button onclick="editBalance('${u.phone}')" class="bg-emerald-500 text-black font-black w-full py-2 rounded-xl mt-3 text-xs">تعديل الرصيد</button>
            </div>
        `).join('');
    } catch (e) { console.error("خطأ في جلب الزبائن:", e); }
}

async function editBalance(phone) {
    const newBal = prompt("أدخل الرصيد الجديد:");
    if (newBal === null) return;
    
    const response = await fetch(`${API}/api/users/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, balance: parseFloat(newBal) })
    });
    
    if (response.ok) {
        document.getElementById(`balance-${phone}`).innerText = newBal;
        alert("تم التحديث بنجاح");
    } else {
        alert("فشل التحديث");
    }
}

// تشغيل النظام
fetchOrders();
fetchAndRenderUsers();
setInterval(fetchOrders, 5000);
