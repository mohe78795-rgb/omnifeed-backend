const API = "https://0zk30qr9iu.onrender.com";

async function fetchOrders() {
    try {
        const res = await fetch(`${API}/api/orders`);
        const orders = await res.json();
        const list = document.getElementById('admin-orders-list');
        
        list.innerHTML = orders.map(o => `
            <div class="order-card shadow-2xl">
                <div class="flex justify-between mb-4">
                    <span class="font-black text-emerald-500">طلب #${o.id}</span>
                    <span class="text-xs text-slate-500">${o.date}</span>
                </div>
                <div class="text-sm font-bold mb-4">
                    ${o.items.map(i => `<div class="flex justify-between"><span>${i.name}</span><span>x${i.qty}</span></div>`).join('')}
                </div>
                <div class="border-t border-white/5 pt-4 flex justify-between items-center">
                    <span class="text-lg font-black">${o.total.toLocaleString()} YER</span>
                    <button onclick="markAsReady('${o.id}')" class="bg-emerald-500 text-black font-black px-4 py-2 rounded-xl text-xs hover:scale-105 transition-all">تم التجهيز</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.log("خطأ في جلب البيانات"); }
}

// تنبيه صوتي عند فتح الصفحة أو تحديثها
function alertNewOrder() { document.getElementById('snd-alert').play().catch(()=>{}); }

setInterval(fetchOrders, 5000); // تحديث تلقائي كل 5 ثواني
fetchOrders();
