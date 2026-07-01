const API = "https://0zk30qr9iu.onrender.com";
let state = { prods: [], cart: [], orders: [], cat: 'الكل', user: JSON.parse(localStorage.getItem('abu_user_v30')) || null };

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) unlockApp();
            else document.getElementById('auth-screen').classList.remove('hidden');
        }, 700);
    }, 1500);
};

// --- نظام الإعلان السحابي والتحكم بالصوت ---
async function loadPromoVideo() {
    try {
        const res = await fetch(`${API}/api/ads/active`);
        const data = await res.json();
        const video = document.getElementById('promo-video');
        if (video && data && data.videoUrl) {
            video.src = data.videoUrl;
            video.muted = true; // البدء مكتوماً لضمان التشغيل التلقائي
            video.play().catch(() => console.log("التشغيل التلقائي يتطلب تفاعل"));
        }
    } catch (e) { console.error("فشل تحميل الفيديو"); }
}

function toggleMute() {
    const video = document.getElementById('promo-video');
    const icon = document.getElementById('mute-icon');
    video.muted = !video.muted;
    icon.className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
    toast(video.muted ? "🔇 تم كتم الصوت" : "🔊 الصوت يعمل");
}

// --- نظام المصادقة السحابي ---
function toggleAuth() {
    const l = document.getElementById('login-box');
    const s = document.getElementById('signup-box');
    l.classList.toggle('hidden');
    s.classList.toggle('hidden');
}

async function handleLogin() {
    const phone = document.getElementById('login-phone').value;
    const pass = document.getElementById('login-pass').value;
    if(!phone || !pass) return toast("⚠️ يرجى ملء الحقول");
    
    try {
        toast("⏳ جاري التحقق...");
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone, pass })
        });
        const data = await res.json();
        if(res.ok) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            unlockApp();
        } else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ خطأ في الاتصال"); }
}

async function handleSignup() {
    const n = document.getElementById('reg-name').value;
    const p = document.getElementById('reg-phone').value;
    const ps = document.getElementById('reg-pass').value;
    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات");

    try {
        toast("⏳ جاري إنشاء الحساب...");
        const res = await fetch(`${API}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, phone: p, pass: ps })
        });
        const data = await res.json();
        if(res.ok) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            unlockApp();
        } else toast("❌ " + (data.message || "فشل التسجيل"));
    } catch(e) { toast("⚠️ عطل في السيرفر"); }
}

// --- إدارة التطبيق ---
function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); 
        sync(); 
        loadPromoVideo(); 
    }, 50);
    initProducts();
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); ui(); }
    } catch(e) {}
}

function ui() {
    if(!state.user) return;
    const b = Number(state.user.bal) || 0;
    document.getElementById('u-balance-top').innerText = b.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

// (بقية الدوال: initProducts, processBalanceOrder, renderCart, renderOrders, الخ كما في الإصدار السابق لضمان العمل 100%)
async function initProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch(e) { setTimeout(initProducts, 3000); }
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (Number(i.price) * i.qty), 0);
    if(!state.cart.length) return toast("⚠️ السلة فارغة");
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");
    try {
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
        });
        const data = await res.json();
        if(res.ok) {
            state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            state.cart = [];
            ui();
            document.getElementById('snd-cashier').play();
            toast("✅ تم تنفيذ طلبك بنجاح");
            changeView('orders', document.getElementById('nav-orders'));
        }
    } catch(e) { toast("⚠️ فشل الاتصال"); }
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `<button onclick="setCat('${c}')" class="px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black ${state.cat === c ? 'bg-emerald-500 text-black shadow-glow' : 'bg-white/5 text-slate-500'}">${c}</button>`).join('');
}

function renderProds() {
    const grid = document.getElementById('products-grid');
    let f = (state.cat === 'الكل') ? state.prods : state.prods.filter(p => p.cat === state.cat);
    grid.innerHTML = f.map(p => `
        <div class="bg-[#0a101e] p-5 rounded-[2.5rem] border border-white/5 active:scale-95 transition-all text-right shadow-xl" onclick="openSheet('${p._id}')">
            <div class="h-32 rounded-[2rem] bg-cover bg-center mb-3" style="background-image:url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3"><span class="text-emerald-400 font-black">${Number(p.price).toLocaleString()}</span><i class="fas fa-plus-circle text-emerald-500"></i></div>
        </div>`).join('');
}

function openSheet(id) {
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
    if(!state.cart.length) { list.innerHTML = "<div class='text-center py-20 opacity-20'>فارغة</div>"; document.getElementById('cart-total').innerText = "0 YER"; return; }
    let total = 0;
    list.innerHTML = state.cart.map(i => { total += (i.price * i.qty); return `<div class="bg-[#0a101e] p-5 rounded-[1.5rem] flex justify-between border border-white/5 mb-2"><span class="text-xs font-bold">${i.name} (x${i.qty})</span><span class="font-black text-emerald-400">${(i.price*i.qty).toLocaleString()}</span></div>`; }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

async function fetchOrders() {
    const list = document.getElementById('orders-list');
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        list.innerHTML = orders.map(o => `<div class="p-6 bg-[#0a101e] rounded-[2rem] border border-white/5 mb-4 animate-fadeIn shadow-lg"><div class="flex justify-between mb-2"><span class="text-emerald-500 font-black text-[10px]">#${o.id}</span><span class="font-black text-white text-lg">${o.total.toLocaleString()} YER</span></div><div class="text-[10px] opacity-50">${o.status} - ${o.date}</div></div>`).join('');
    } catch(e) {}
}

function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if(v === 'orders') fetchOrders();
    if(v === 'cart') renderCart();
}

function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function logout() { localStorage.clear(); location.reload(); }
