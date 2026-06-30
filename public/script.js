const API = "https://0zk30qr9iu.onrender.com";

let state = {
    prods: [], cart: [], 
    orders: JSON.parse(localStorage.getItem('abu_orders_v30')) || [],
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    cat: 'الكل'
};

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) { unlockApp(); }
            else { document.getElementById('auth-screen').classList.remove('hidden'); }
        }, 800);
    }, 2000);
};

function toggleAuth() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

async function handleSignup() {
    const n = document.getElementById('reg-name').value, 
          p = document.getElementById('reg-phone').value, 
          ps = document.getElementById('reg-pass').value;

    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات");

    const newUser = { name: n, phone: p, pass: ps, balance: 0 };

    try {
        const res = await fetch(`${API}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        
        if(res.ok) {
            state.user = { name: n, phone: p, pass: ps, bal: 0 };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ تم إنشاء الحساب");
            unlockApp();
        }
    } catch (e) { toast("❌ فشل التسجيل"); }
}

function handleLogin() {
    const p = document.getElementById('login-phone').value, 
          ps = document.getElementById('login-pass').value;
    const saved = JSON.parse(localStorage.getItem('abu_user_v30'));
    if(saved && saved.phone === p && saved.pass === ps) { 
        state.user = saved; 
        unlockApp(); 
    } else toast("❌ خطأ في البيانات");
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { app.style.opacity = "1"; ui(); }, 50);
    fetchProducts();
    syncUserData(); 
}

async function syncUserData() {
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const current = data.active_users.find(u => u.phone === state.user.phone);
        if(current) {
            state.user.bal = current.balance;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) {}
}

async function fetchProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch (e) {}
}

function ui() {
    if (!state.user) return;
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `<button onclick="setCat('${c}')" class="px-6 py-3 bg-white/5 rounded-2xl whitespace-nowrap text-xs font-bold ${state.cat === c ? 'bg-emerald-500 text-black' : ''}">${c}</button>`).join('');
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    let filtered = state.cat === 'الكل' ? data : data.filter(p => p.cat === state.cat);
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-4 rounded-[2rem] border border-white/5 shadow-xl" onclick="sheet('${p.id}')">
            <div class="h-28 rounded-2xl bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[11px] font-black truncate">${p.name}</h4>
            <p class="text-emerald-500 font-black text-sm">${parseInt(p.price).toLocaleString()} YER</p>
        </div>`).join('');
}

function sheet(id) {
    const p = state.prods.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = parseInt(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { add(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function closeSheet() { 
    document.getElementById('product-sheet').style.bottom = "-100%"; 
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); 
}

function add(p) {
    const item = state.cart.find(i => i.id === p.id);
    if (item) item.qty++; else state.cart.push({ ...p, qty: 1 });
    updateBadge(); toast("🛒 تمت الإضافة");
}

function updateBadge() {
    const b = document.getElementById('cart-badge');
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
}

function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0;
    list.innerHTML = state.cart.map(i => {
        total += (i.price * i.qty);
        return `<div class="bg-[#0a101e] p-4 rounded-2xl flex justify-between items-center">
            <div class="flex items-center gap-3"><img src="${i.img}" class="w-10 h-10 rounded-lg"><div><h4 class="text-xs font-bold">${i.name}</h4></div></div>
            <div class="flex items-center gap-2"><button onclick="changeQty(${i.id}, -1)" class="w-6 h-6 bg-white/10 rounded">-</button><span>${i.qty}</span><button onclick="changeQty(${i.id}, 1)" class="w-6 h-6 bg-emerald-500 text-black rounded">+</button></div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function changeQty(id, d) {
    const i = state.cart.find(x => x.id == id);
    if(i) { i.qty += d; if(i.qty <= 0) state.cart = state.cart.filter(x => x.id != id); renderCart(); updateBadge(); }
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ الرصيد لا يكفي");

    const order = {
        id: Math.random().toString(36).substr(2, 5).toUpperCase(),
        total: total,
        items: state.cart,
        date: new Date().toLocaleDateString('ar-EG'),
        user_phone: state.user.phone
    };

    try {
        await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        
        state.user.bal -= total;
        state.orders.unshift(order);
        localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
        localStorage.setItem('abu_orders_v30', JSON.stringify(state.orders));
        
        state.cart = [];
        updateBadge(); ui(); changeView('orders');
        document.getElementById('snd-cashier').play();
        toast("✅ تم إرسال الطلب");
    } catch(e) { toast("❌ فشل الاتصال"); }
}

function renderOrders() {
    document.getElementById('orders-list').innerHTML = state.orders.map(o => `
        <div class="bg-[#0a101e] p-4 rounded-3xl border border-white/5 flex justify-between items-center">
            <div><p class="text-[10px] text-emerald-500 font-bold">#${o.id}</p><h4 class="font-bold">${o.total.toLocaleString()} YER</h4></div>
            <span class="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">جاري التجهيز</span>
        </div>`).join('');
}

function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if(v === 'cart') renderCart();
    if(v === 'orders') renderOrders();
}
function logout() { localStorage.removeItem('abu_user_v30'); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
