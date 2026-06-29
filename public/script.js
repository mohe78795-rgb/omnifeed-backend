const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

let state = {
    prods: [], cart: [], location: null,
    orders: JSON.parse(localStorage.getItem('abu_orders_v29')) || [],
    cat: 'الكل', user: JSON.parse(localStorage.getItem('abu_user_v29')) || null,
    favs: JSON.parse(localStorage.getItem('abu_favs_v29')) || []
};

// تشغيل النظام
window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) { unlockApp(); }
            else { document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('auth-screen').classList.add('flex'); }
        }, 800);
    }, 1500);
};

const playSound = (id) => {
    const s = document.getElementById(id);
    if(s) { s.currentTime = 0; s.play().catch(()=>{}); }
};

function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }

function handleSignup() {
    const n = document.getElementById('reg-name').value, p = document.getElementById('reg-phone').value, ps = document.getElementById('reg-pass').value;
    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات");
    state.user = { name: n, phone: p, pass: ps, bal: 50000 };
    localStorage.setItem('abu_user_v29', JSON.stringify(state.user));
    unlockApp();
}

function handleLogin() {
    const p = document.getElementById('login-phone').value, ps = document.getElementById('login-pass').value;
    const saved = JSON.parse(localStorage.getItem('abu_user_v29'));
    if(saved && saved.phone === p && saved.pass === ps) { state.user = saved; unlockApp(); }
    else toast("❌ خطأ في البيانات");
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { app.style.opacity = "1"; ui(); initGoldParticles(); }, 50);
    init();
}

async function init() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch (e) { toast("⚠️ عطل في البيانات"); }
}

function ui() {
    if (!state.user) return;
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = "الهاتف: " + state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    badge();
}

function renderCats() {
    const cats = ['المفضلة', 'الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `<button onclick="setCat('${c}')" class="px-7 py-3.5 bg-[#0a101e] rounded-2xl whitespace-nowrap text-[11px] font-black uppercase transition-all ${state.cat === c ? 'bg-emerald-500 !text-black shadow-lg' : 'text-slate-500 border border-white/5'}">${c}</button>`).join('');
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    let filtered = data;
    if (state.cat === 'المفضلة') filtered = data.filter(p => state.favs.includes(p.id));
    else if (state.cat !== 'الكل') filtered = data.filter(p => p.cat === state.cat);

    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-5 rounded-[2.5rem] border border-white/5 active:scale-95 transition-all text-right shadow-xl relative" onclick="sheet('${p.id}')">
            <button class="fav-btn ${state.favs.includes(p.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(${p.id})"><i class="${state.favs.includes(p.id) ? 'fas' : 'far'} fa-heart"></i></button>
            <div class="h-32 rounded-[2rem] bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3"><span class="text-emerald-400 font-black text-lg">${parseInt(p.price).toLocaleString()}</span><i class="fas fa-plus-circle text-emerald-500 text-lg"></i></div>
        </div>`).join('');
}

function searchInHome() {
    const term = document.getElementById('home-search').value.toLowerCase();
    const res = state.prods.filter(p => p.name.toLowerCase().includes(term));
    renderProds(res);
}

function sheet(id) {
    playSound('snd-click');
    const p = state.prods.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = parseInt(p.price).toLocaleString();
    document.getElementById('sh-add-btn').onclick = () => { add(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }

function add(p) {
    const item = state.cart.find(i => i.id === p.id);
    if (item) item.qty++; else state.cart.push({ ...p, qty: 1 });
    badge(); toast("🛒 تمت الإضافة للحساب");
}

function updateQty(id, delta) {
    const i = state.cart.find(x => x.id == id);
    if (i) {
        i.qty += delta;
        if (i.qty <= 0) state.cart = state.cart.filter(x => x.id != id);
        renderCart(); badge();
    }
}

function badge() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const b = document.getElementById('cart-badge');
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); } else b.classList.add('hidden');
}

function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0;
    if (state.cart.length === 0) { list.innerHTML = "<div class='text-center py-20 opacity-10 font-black'>الحقيبة فارغة</div>"; document.getElementById('cart-total').innerText = "0 YER"; return; }
    list.innerHTML = state.cart.map((i) => {
        const sub = parseInt(i.price) * i.qty; total += sub;
        return `<div class="bg-[#0a101e] p-6 rounded-[2.5rem] flex justify-between items-center border border-white/5 animate-fadeIn shadow-lg">
            <div class="flex items-center gap-4"><img src="${i.img}" class="w-14 h-14 rounded-3xl object-cover shadow-lg"><div><h4 class="text-sm font-black text-white">${i.name}</h4><span class="text-emerald-500 font-bold text-[10px]">${parseInt(i.price).toLocaleString()} YER</span></div></div>
            <div class="flex items-center gap-4 bg-black/40 p-1 rounded-2xl">
                <button onclick="updateQty(${i.id}, -1)" class="w-8 h-8 rounded-xl bg-white/10 text-white font-black">-</button>
                <span class="text-[11px] font-black w-4 text-center text-white">${i.qty}</span>
                <button onclick="updateQty(${i.id}, 1)" class="w-8 h-8 rounded-xl bg-[#10b981] text-black font-black">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function openLocationModal() { if (!state.cart.length) return toast("⚠️ الحقيبة فارغة"); document.getElementById('location-modal').classList.remove('hidden'); }
function closeLocationModal() { document.getElementById('location-modal').classList.add('hidden'); }

function triggerGPSProcess() {
    closeLocationModal();
    toast("⚙️ جاري تحديد الإحداثيات...");
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
            state.location = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
            toast("✅ تم بنجاح، جاري فتح واتساب");
            setTimeout(() => sendWhatsAppToStore(), 500);
        }, () => {
            toast("❌ فشل تحديد الموقع، سيتم الإرسال بدونه");
            setTimeout(() => sendWhatsAppToStore(), 1000);
        }, { enableHighAccuracy: true, timeout: 5000 });
    } else sendWhatsAppToStore();
}

function sendWhatsAppToStore() {
    const total = state.cart.reduce((s, i) => s + (parseInt(i.price) * i.qty), 0);
    const items = state.cart.map(i => `• ${i.name} [الكمية: ${i.qty}] - ${parseInt(i.price).toLocaleString()} YER`).join('\n');
    let msg = `*طلب جديد من تموينات أبو حسين*\n\nالمحتويات:\n${items}\n\n*إجمالي المبلغ: ${total.toLocaleString()} YER*`;
    if(state.location) msg += `\n\n📍 رابط موقع التوصيل الدقيق:\n${state.location}`;
    else msg += `\n\n⚠️ لم يتم إرفاق موقع جغرافي.`;
    window.open(`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function processBalanceOrder() {
    if (state.cart.length === 0) return toast("⚠️ الحقيبة فارغة");
    const total = state.cart.reduce((s, i) => s + (parseInt(i.price) * i.qty), 0);
    if (state.user.bal < total) return toast("❌ الرصيد غير كافٍ");

    // تجهيز بيانات الطلب
    const o = {
        id: Math.random().toString(36).substr(2, 5).toUpperCase(),
        total: total,
        status: '🛠️ جديد',
        date: new Date().toLocaleDateString('ar-EG'),
        items: [...state.cart]
    };

    // إرسال الطلب للسيرفر
    try {
        await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(o)
        });
    } catch(e) { console.log("خطأ في الاتصال بالسيرفر"); }

    // تحديث النظام محلياً
    state.user.bal -= total;
    state.orders.unshift(o);
    localStorage.setItem('abu_orders_v29', JSON.stringify(state.orders));
    localStorage.setItem('abu_user_v29', JSON.stringify(state.user));

    state.cart = []; ui(); triggerPrestigeNotif(); changeView('orders', null);
    toast("✅ تم إرسال الطلب بنجاح");
}

function triggerPrestigeNotif() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById('snd-cashier').play().catch(()=>{});
    const banner = document.getElementById('top-push-notif'); banner.style.top = "20px";
    setTimeout(() => banner.style.top = "-150px", 5000);
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!state.orders.length) return list.innerHTML = "<div class='text-center py-20 opacity-10 font-black uppercase'>لا يوجد سجل</div>";
    list.innerHTML = state.orders.map(o => `
        <div class="invoice-card animate-fadeIn shadow-xl mb-6 text-right">
            <div class="flex justify-between items-center mb-6">
                <div class="text-right"><p class="text-[10px] font-black text-emerald-500 uppercase mb-1">فاتورة تجارية</p><h3 class="text-xl font-black text-white">ID: #${o.id}</h3></div>
                <div class="text-left"><p class="text-[9px] text-slate-500 font-bold">${o.date}</p><span class="text-[8px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg font-black animate-pulse">${o.status}</span></div>
            </div>
            <div class="space-y-1 mb-8 border-y border-white/5 py-4">
                <p class="text-[9px] text-slate-500 font-black mb-3 uppercase tracking-widest text-right">كشف المحتويات :</p>
                ${o.items.map((it, idx) => `<div class="invoice-item"><div class="flex items-center gap-3"><span class="text-[10px] text-emerald-500 font-black">${idx + 1}</span><span class="text-xs font-bold text-slate-300">${it.name}</span></div><span class="text-xs font-black text-white">${(it.price * it.qty).toLocaleString()} YER</span></div>`).join('')}
            </div>
            <div class="timeline mt-8">
                <div class="step active"><div class="dot"><i class="fas fa-check"></i></div><span class="step-label">تم الاستلام</span></div>
                <div class="step"><div class="dot">2</div><span class="step-label">جاري التجهيز</span></div>
                <div class="step"><div class="dot">3</div><span class="step-label">مع السائق</span></div>
                <div class="step"><div class="dot">4</div><span class="step-label">عند الباب</span></div>
            </div>
        </div>`).join('');
}

function changeView(v, b) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active'); else {
        const map = { home: 'nav-home', offers: 'nav-offers', orders: 'nav-orders', account: 'nav-account' };
        if(document.getElementById(map[v])) document.getElementById(map[v]).classList.add('active');
    }
    if (v === 'cart') renderCart(); if (v === 'orders') renderOrders();
}

function initGoldParticles() {
    const canvas = document.getElementById('gold-particles'); if(!canvas) return;
    const ctx = canvas.getContext('2d'); canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight;
    let p = Array(30).fill().map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2, v: Math.random() * 0.3 }));
    function draw() { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "#fbbf2422"; p.forEach(i => { ctx.beginPath(); ctx.arc(i.x, i.y, i.s, 0, Math.PI*2); ctx.fill(); i.y -= i.v; if(i.y < -10) i.y = canvas.height + 10; }); requestAnimationFrame(draw); }
    draw();
}

function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function toggleFav(id) { if (state.favs.includes(id)) state.favs = state.favs.filter(i => i !== id); else state.favs.push(id); localStorage.setItem('abu_favs_v29', JSON.stringify(state.favs)); renderProds(); }
function logout() { localStorage.removeItem('abu_user_v29'); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
if (state.user) unlockApp();
