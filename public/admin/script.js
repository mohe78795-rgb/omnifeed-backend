const API = "https://0zk30qr9iu.onrender.com";

// تشغيل النظام عند التحميل
async function initAdmin() {
    fetchOrders();
    fetchUsers();
    // تحديث تلقائي للطلبات كل 15 ثانية
    setInterval(fetchOrders, 15000); 
}

// جلب الطلبات من السيرفر
async function fetchOrders() {
    try {
        const res = await fetch(`${API}/api/orders`);
        const orders = await res.json();
        
        document.getElementById('total-orders-count').innerText = orders.length;
        const listContainer = document.getElementById('admin-orders-list');
        
        // عرض الطلبات (الأحدث أولاً)
        listContainer.innerHTML = orders.reverse().map(o => `
            <div class="glass p-6 rounded-[2rem] border-r-4 border-emerald-500 hover:scale-[1.01] transition-transform">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">طلب رقم #${o.id}</span>
                        <h4 class="text-xl font-black mt-1">${parseInt(o.total).toLocaleString()} YER</h4>
                    </div>
                    <span class="bg-white/5 px-4 py-1 rounded-full text-[10px] font-bold text-slate-400">${o.date}</span>
                </div>
                <div class="text-xs text-slate-400 mb-6 bg-black/20 p-3 rounded-xl">
                    <p class="font-bold mb-1 text-emerald-500/50 uppercase text-[9px]">المحتويات:</p>
                    ${o.items ? o.items.map(i => `${i.name} (x${i.qty})`).join(' ، ') : 'لا يوجد تفاصيل'}
                </div>
                <div class="flex gap-2">
                    <button class="flex-1 py-3 bg-emerald-500 text-black text-[11px] font-black rounded-xl hover:bg-emerald-400 transition-all">إتمام التجهيز</button>
                    <button onclick="window.open('https://wa.me/${o.user_phone || ''}')" class="px-4 py-3 bg-white/5 text-emerald-500 rounded-xl hover:bg-white/10"><i class="fab fa-whatsapp"></i></button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error("خطأ في جلب الطلبات");
    }
}

// جلب المستخدمين وتحديث الأرصدة
async function fetchUsers() {
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const users = data.active_users || [];
        
        document.getElementById('total-users-count').innerText = users.length;
        
        let totalCash = 0;
        const userContainer = document.getElementById('users-list');
        
        userContainer.innerHTML = users.map(u => {
            totalCash += (u.balance || 0);
            return `
                <div class="glass p-5 rounded-3xl group">
                    <div class="flex justify-between items-center mb-3">
                        <div>
                            <h4 class="font-black text-sm text-white">${u.name}</h4>
                            <p class="text-[10px] text-slate-500 font-bold">${u.phone}</p>
                        </div>
                        <button onclick="editBalance('${u.phone}', '${u.name}')" class="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-black transition-all">
                            <i class="fas fa-pen-to-square"></i>
                        </button>
                    </div>
                    <div class="pt-3 border-t border-white/5">
                        <span class="text-xs text-slate-400 font-bold">الرصيد:</span>
                        <span class="text-emerald-500 font-black mr-2">${(u.balance || 0).toLocaleString()} <small class="text-[9px]">YER</small></span>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('total-balance-all').innerText = totalCash.toLocaleString();
    } catch (e) {
        console.error("خطأ في جلب المستخدمين");
    }
}

// تعديل رصيد مستخدم
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
            alert(`✅ تم تحديث رصيد ${name} بنجاح`);
            fetchUsers(); // تحديث القائمة فوراً
        }
    } catch (e) { 
        alert("❌ فشل تحديث الرصيد، تأكد من الاتصال بالسيرفر"); 
    }
}

// بدء التشغيل
initAdmin();
