const API = "https://0zk30qr9iu.onrender.com"; // رابط سيرفرك على ريندر
let state = { prods: [], cart: [], orders: [], cat: 'الكل', user: JSON.parse(localStorage.getItem('abu_user_v30')) || null };

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        if (state.user) unlockApp();
        else document.getElementById('auth-screen').classList.remove('hidden');
    }, 2000);
};

// --- المصادقة والمزامنة ---
async function handleLogin() {
    const p = document.getElementById('login-phone').value, ps = document.getElementById('login-pass').value;
    try {
        const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: p, pass: ps }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; save(); unlockApp(); } else toast(data.message);
    } catch(e) { toast("⚠️ عطل في السيرفر"); }
}

async function sync() {
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok) { state.user = data.user; save(); ui(); }
    } catch(e) {}
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => { document.getElementById('main-app').style.opacity = "1"; ui(); sync(); }, 50);
    initProducts();
}

async function initProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch(e) { setTimeout(initProducts, 3000); }
}

// --- العمليات المالية والفواتير ---
async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");
    
    try {
        toast("⏳ جاري تأمين العملية...");
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
        });
        const data = await res.json();
        if(res.ok) {
            state.user.bal = data.currentBal; // تحديث فوري من السيرفر
            save();
            state.cart = [];
            ui();
            toast("✅ تم إصدار الفاتورة بنجاح");
            changeView('orders', document.getElementById('nav-orders'));
        }
    } catch(e) { toast("⚠️ فشل الاتصال"); }
}

async function fetchOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = "<div class='text-center py-10 opacity-50'>جاري المزامنة...</div>";
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        list.innerHTML = orders.map(o => `
            <div class="bg-white/5 p-6 rounded-[2rem] border border-white/5 animate-fadeIn mb-4">
                <div class="flex justify-between mb-4">
                    <span class="text-emerald-500 font-black text-[10px]">#${o.id}</span>
                    <span class="text-[10px] opacity-50">${o.date}</span>
                </div>
                <div class="space-y-1 mb-4 text-xs opacity-70">
                    ${o.items.map(it => `<div>${it.name} (x${it.qty})</div>`).join('')}
                </div>
                <div class="flex justify-between pt-3 border-t border-white/5 items-center">
                    <span class="text-emerald-500 text-[10px] font-black">${o.status}</span>
                    <span class="text-lg font-black">${o.total.toLocaleString()} YER</span>
                </div>
            </div>`).join('');
    } catch(e) { list.innerHTML = "فشل التحميل"; }
}

// --- UI Utils ---
function ui() {
    const b = Number(state.user.bal) || 0;
    document.getElementById('u-balance').innerText = b.toLocaleString();
    document.getElementById('u-balance-top').innerText = b.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if(v === 'orders') fetchOrders();
    if(v === 'cart') renderCart();
}

function save() { localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function logout() { localStorage.clear(); location.reload(); }

// (بقية دوال renderProds و renderCats و renderCart و sheet كما في النسخ السابقة)
