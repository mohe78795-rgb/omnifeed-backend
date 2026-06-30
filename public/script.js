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

// --- Auth ---
async function handleLogin() {
    const p = document.getElementById('login-phone').value, ps = document.getElementById('login-pass').value;
    if(!p || !ps) return toast("⚠️ أكمل البيانات");
    try {
        toast("⏳ جاري التحقق...");
        const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: p, pass: ps }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; save(); unlockApp(); }
        else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ عطل في السيرفر"); }
}

async function handleSignup() {
    const n = document.getElementById('reg-name').value, p = document.getElementById('reg-phone').value, ps = document.getElementById('reg-pass').value;
    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات");
    try {
        toast("⏳ جاري الإنشاء...");
        const res = await fetch(`${API}/api/auth/signup`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: n, phone: p, pass: ps }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; save(); unlockApp(); }
        else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ عطل في السيرفر"); }
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
        if(!res.ok) throw new Error();
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch(e) { 
        document.getElementById('products-grid').innerHTML = "<div class='col-span-2 text-center py-10 opacity-50'>⏳ جاري إيقاظ السيرفر...</div>";
        setTimeout(initProducts, 3000); 
    }
}

// --- Logic ---
async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (Number(i.price) * i.qty), 0);
    if(!state.cart.length) return toast("⚠️ السلة فارغة");
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");

    try {
        toast("⏳ جاري معالجة الطلب...");
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
        });
        const data = await res.json();
        if(res.ok) {
            state.user.bal = data.currentBal; // تحديث من السيرفر مباشرة
            state.orders.unshift(data.order); // إضافة الطلب الرسمي بمعرفه الجديد
            localStorage.setItem('abu_orders_v30', JSON.stringify(state.orders));
            save();
            state.cart = [];
            ui();
            triggerNotif();
            changeView('orders', null);
            toast("✅ تم تنفيذ طلبك بنجاح");
        } else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ عطل في السيرفر"); }
}

async function sync() {
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok) { state.user = data.user; save(); ui(); }
    } catch(e){}
}

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
    document.getElementById('cat-list').innerHTML = cats.map(c => `<button onclick="setCat('${c}')" class="px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black ${state.cat === c ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500'}">${c}</button>`).join('');
}

function renderProds() {
    const grid = document.getElementById('products-grid');
    let f = (state.cat === 'الكل') ? state.prods : state.prods.filter(p => p.cat === state.cat);
    grid.innerHTML = f.map(p => `<div class="bg-[#0a101e] p-4 rounded-[2rem] border border-white/5" onclick="sheet('${p._id}')">
        <div class="h-32 rounded-[1.5rem] bg-cover bg-center mb-3" style="background-image:url('${p.img}')"></div>
        <h4 class="text-xs font-bold truncate">${p.name}</h4>
        <p class="text-emerald-400 font-black mt-2">${Number(p.price).toLocaleString()} YER</p>
    </div>`).join('');
}

function sheet(id) {
    const p = state.prods.find(x => x._id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function addToCart(p) {
    let i = state.cart.find(x => x._id === p._id);
    if(i) i.qty++; else state.cart.push({...p, qty:1});
    toast("🛒 أضيف للسلة");
}

function renderCart() {
    const list = document.getElementById('cart-list');
    if(!state.cart.length) { list.innerHTML = "<div class='text-center py-10 opacity-20'>فارغة</div>"; document.getElementById('cart-total').innerText = "0 YER"; return; }
    let total = 0;
    list.innerHTML = state.cart.map(i => { total += (i.price * i.qty); return `<div class="bg-[#0a101e] p-4 rounded-2xl flex justify-between"><span>${i.name} (x${i.qty})</span><span>${(i.price*i.qty).toLocaleString()}</span></div>`; }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if(!state.orders.length) { list.innerHTML = "<div class='text-center py-10 opacity-20'>لا يوجد سجل</div>"; return; }
    list.innerHTML = state.orders.map(o => `<div class="p-5 bg-white/5 rounded-3xl"><div class="flex justify-between mb-2"><span class="text-emerald-500 text-[10px]">ID: ${o.id}</span><span>${o.total.toLocaleString()} YER</span></div><p class="text-[10px] opacity-50">${o.date}</p></div>`).join('');
}

// --- Utils ---
function save() { localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); }
function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function logout() { localStorage.removeItem('abu_user_v30'); location.reload(); }
function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function changeView(v, b) { document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden')); document.getElementById('view-' + v).classList.remove('hidden'); document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active')); if(b) b.classList.add('active'); if(v === 'cart') renderCart(); if(v === 'orders') renderOrders(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function triggerNotif() { document.getElementById('snd-cashier').play(); const b = document.getElementById('top-push-notif'); b.style.top = "20px"; setTimeout(() => b.style.top = "-150px", 5000); }
function initGoldParticles() { const canvas = document.getElementById('gold-particles'); const ctx = canvas.getContext('2d'); canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight; let p = Array(20).fill().map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2, v: Math.random() * 0.1 })); function draw() { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "#fbbf2411"; p.forEach(i => { ctx.beginPath(); ctx.arc(i.x, i.y, i.s, 0, Math.PI*2); ctx.fill(); i.y -= i.v; if(i.y < -10) i.y = canvas.height + 10; }); requestAnimationFrame(draw); } draw(); }
