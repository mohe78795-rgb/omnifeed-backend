const API = "https://0zk30qr9iu.onrender.com";
let state = { prods: [], cart: [], orders: JSON.parse(localStorage.getItem('abu_orders_v30')) || [], cat: 'الكل', user: JSON.parse(localStorage.getItem('abu_user_v30')) || null };

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) unlockApp();
            else document.getElementById('auth-screen').classList.remove('hidden');
        }, 800);
    }, 1500);
};

// --- نظام المصادقة والمزامنة ---

async function handleLogin() {
    const p = document.getElementById('login-phone').value, ps = document.getElementById('login-pass').value;
    try {
        toast("⏳ جاري الدخول...");
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: p, pass: ps })
        });
        const data = await res.json();
        if(res.ok) { state.user = data.user; saveUser(); unlockApp(); }
        else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ خطأ في السيرفر"); }
}

async function handleSignup() {
    const n = document.getElementById('reg-name').value, p = document.getElementById('reg-phone').value, ps = document.getElementById('reg-pass').value;
    try {
        toast("⏳ جاري الإنشاء...");
        const res = await fetch(`${API}/api/auth/signup`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: n, phone: p, pass: ps })
        });
        const data = await res.json();
        if(res.ok) { state.user = data.user; saveUser(); unlockApp(); }
        else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ فشل الاتصال"); }
}

async function syncUserData() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        if(res.ok) {
            const data = await res.json();
            state.user = data.user;
            saveUser();
            ui();
        }
    } catch(e) {}
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => { document.getElementById('main-app').style.opacity = "1"; ui(); syncUserData(); }, 50);
    initProducts();
}

async function initProducts(retries = 5) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = "<div class='col-span-2 text-center py-10 opacity-50'>جاري إيقاظ السيرفر...</div>";
    for(let i=0; i<retries; i++) {
        try {
            const res = await fetch(`${API}/api/products`);
            state.prods = await res.json();
            renderCats(); renderProds();
            return;
        } catch(e) { await new Promise(r => setTimeout(r, 2000)); }
    }
    grid.innerHTML = "<div class='col-span-2 text-center text-red-500'>⚠️ تعذر التحميل، أعد المحاولة</div>";
}

// --- العمليات والواجهة ---

function ui() {
    if(!state.user) return;
    const b = Number(state.user.bal) || 0;
    document.getElementById('u-balance').innerText = b.toLocaleString();
    document.getElementById('u-balance-top').innerText = b.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `<button onclick="setCat('${c}')" class="px-6 py-2 rounded-xl border border-white/5 ${state.cat === c ? 'bg-emerald-500 text-black' : 'text-slate-500'}">${c}</button>`).join('');
}

function renderProds() {
    const grid = document.getElementById('products-grid');
    let f = (state.cat === 'الكل') ? state.prods : state.prods.filter(p => p.cat === state.cat);
    grid.innerHTML = f.map(p => `<div class="bg-[#0a101e] p-4 rounded-[2rem] border border-white/5" onclick="sheet('${p.id}')">
        <div class="h-32 rounded-[1.5rem] bg-cover bg-center mb-3" style="background-image:url('${p.img}')"></div>
        <h4 class="text-xs font-bold truncate">${p.name}</h4>
        <p class="text-emerald-400 font-black mt-2">${Number(p.price).toLocaleString()} YER</p>
    </div>`).join('');
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");
    
    const order = { id: Math.random().toString(36).substr(2,5).toUpperCase(), total, items: [...state.cart], date: new Date().toLocaleDateString('ar-EG') };
    
    try {
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order })
        });
        if(res.ok) {
            state.user.bal -= total;
            state.orders.unshift(order);
            localStorage.setItem('abu_orders_v30', JSON.stringify(state.orders));
            saveUser();
            state.cart = [];
            ui();
            toast("✅ تم الطلب بنجاح");
            changeView('orders', null);
        }
    } catch(e) { toast("⚠️ فشل الطلب"); }
}

function sheet(id) {
    const p = state.prods.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function addToCart(p) {
    let i = state.cart.find(x => x.id === p.id);
    if(i) i.qty++; else state.cart.push({...p, qty:1});
    toast("🛒 أضيف للسلة");
}

function renderCart() {
    const list = document.getElementById('cart-list');
    if(!state.cart.length) { list.innerHTML = "السلة فارغة"; document.getElementById('cart-total').innerText = "0 YER"; return; }
    let total = 0;
    list.innerHTML = state.cart.map(i => {
        total += (i.price * i.qty);
        return `<div class="bg-[#0a101e] p-4 rounded-2xl flex justify-between"><span>${i.name} (${i.qty})</span><span>${(i.price*i.qty).toLocaleString()}</span></div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = state.orders.map(o => `<div class="p-5 bg-white/5 rounded-3xl"><h3>طلب #${o.id}</h3><p>${o.total} YER</p></div>`).join('');
}

function saveUser() { localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); }
function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function logout() { localStorage.removeItem('abu_user_v30'); location.reload(); }
function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    if(v === 'cart') renderCart();
    if(v === 'orders') renderOrders();
}
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
