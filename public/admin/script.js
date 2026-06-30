const API = "https://0zk30qr9iu.onrender.com";

async function initAdmin() {
    fetchOrders();
    fetchUsers();
    setInterval(fetchOrders, 10000); // تحديث كل 10 ثواني
}

async function fetchOrders() {
    try {
        const res = await fetch(`${API}/api/orders`);
        const orders = await res.json();
        document.getElementById('total-orders-count').innerText = orders.length;
        const list = document.getElementById('admin-orders-list');
        
        list.innerHTML = orders.reverse().map(o => `
            <div class="glass p-6 rounded-[2rem] hover:border-emerald-500/50 transition-all group">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-[10px] text-emerald-500 font-black uppercase">طلب رقم #${o.id}</span>
                        <h4 class="text-lg font-black mt-1">${o.total.toLocaleString()} YER</h4>
                    </div>
                    <span class="bg-emerald-500/10 text-emerald-500 px-4 py-1 rounded-full text-[10px] font-black">${o.date}</span>
                </div>
                <div class="space-y-2 mb-6">
                    ${o.items.map(i => `<div class="flex justify-between text-xs text-slate-400 font-bold"><span>${i.name}</span><span>x${i.qty}</span></div>`).join('')}
                </div>
                <button class="w-full py-3 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-black transition-all">تغيير الحالة إلى (تم التجهيز)</button>
            </div>
        `).join('');
    } catch(e) {}
}

async function fetchUsers() {
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        document.getElementById('total-users-count').innerText = data.active_users.length;
        
        let totalCash = 0;
        const container = document.getElementById('users-list');
        
        container.innerHTML = data.active_users.map(u => {
            totalCash += (u.balance || 0);
            return `
                <div class="glass p-5 rounded-3xl border-r-4 border-emerald-500">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-black text-sm">${u.name}</h4>
                        <span class="text-[10px] text-slate-500">${u.phone}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-emerald-500 font-black">${(u.balance || 0).toLocaleString()} <small>YER</small></span>
                        <button onclick="editBalance('${u.phone}', '${u.name}')" class="p-2 hover:text-emerald-500 transition-colors"><i class="fas fa-edit"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('total-balance-all').innerText = totalCash.toLocaleString();
    } catch (e) {}
}

async function editBalance(phone, name) {
    const newBal = prompt(`تعديل رصيد الزبون: ${name}\nأدخل المبلغ الجديد:`);
    if (newBal === null || isNaN(newBal)) return;
    
    try {
        const res = await fetch(`${API}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, balance: parseFloat(newBal) })
        });
        
        if (res.ok) {
            alert("✅ تم تحديث الرصيد بنجاح");
            fetchUsers();
        }
    } catch (e) { alert("❌ خطأ في الاتصال"); }
}

initAdmin();
