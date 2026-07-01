/**
 * تموينات أبو حسين - المحرك البرمجي (الإصدار V31 المستقر)
 * تطوير وأتمتة: محمد موسى معجم
 */

const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

// 1. حالة التطبيق (State Management)
let state = {
    prods: [],
    cart: [],
    location: null,
    orders: JSON.parse(localStorage.getItem('abu_orders_v30')) || [], // سجل الطلبات المحلي كنسخة احتياطية
    cat: 'الكل',
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    favs: JSON.parse(localStorage.getItem('abu_favs_v30')) || []
};

// 2. التهيئة عند التشغيل
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                if (state.user) { 
                    unlockApp(); 
                } else { 
                    document.getElementById('auth-screen').classList.remove('hidden'); 
                }
            }, 800);
        }
    }, 1500);
};

// 3. نظام المصادقة (Auth API)

// --- دالة تسجيل الدخول (المحدثة بناءً على طلبك) ---
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
        } else {
            toast("❌ " + data.message);
        }
    } catch(e) { toast("⚠️ خطأ في الاتصال بالسيرفر"); }
}

// --- دالة إنشاء الحساب ---
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
        } else {
            toast("❌ " + (data.message || "فشل التسجيل"));
        }
    } catch(e) { toast("⚠️ فشل الاتصال بالسيرفر"); }
}

// 4. الإعلانات والمزامنة
async function loadPromoVideo() {
    try {
        const res = await fetch(`${API}/api/ads/active`);
        const data = await res.json();
        const video = document.getElementById('promo-video');
        if (video && data && data.videoUrl) {
            video.src = data.videoUrl;
            video.play().catch(() => console.log("Autoplay requires interaction"));
        }
    } catch (e) { console.error("فشل تحميل الفيديو"); }
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        if(res.ok) {
            const data = await res.json();
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) {}
}

// 5. إدارة الواجهة
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

async function initProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        if(!res.ok) throw new Error();
        state.prods = await res.json();
        renderCats(); 
        renderProds();
    } catch(e) {
        document.getElementById('products-grid').innerHTML = `<div class="col-span-2 text-center py-10 opacity-50 animate-pulse font-black">جاري إيقاظ المتجر...</div>`;
        setTimeout(initProducts, 3000); 
    }
}

function ui() {
    if (!state.user) return;
    const balance = Number(state.user.bal) || 0;
    // تحديث الرصيد العلوي فقط (u-balance-top)
    const topBal = document.getElementById('u-balance-top');
    if(topBal) topBal.innerText = balance.toLocaleString() + " YER";
    
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

// 6. السلة والطلبات
async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (Number(i.price) * i.qty), 0);
    if (!state.cart.length) return toast("⚠️ السلة فارغة");
    if (state.user.bal < total) return toast("❌ الرصيد غير كافٍ");

    try {
        toast("⏳ جاري معالجة الطلب...");
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
        });
        const data = await res.json();
        if(res.ok) {
            state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            state.cart = [];
            ui();
            triggerPrestigeNotif();
            changeView('orders', document.getElementById('nav-orders'));
            toast("✅ تم تنفيذ طلبك بنجاح");
        } else {
            toast("❌ " + data.message);
        }
    } catch(e) { toast("⚠️ فشل الاتصال"); }
}

async function fetchOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = `<div class="text-center py-10 opacity-30 animate-pulse font-black">جاري جلب الفواتير...</div>`;
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        if(!orders.length) { list.innerHTML = "<div class='text-center py-20 opacity-20'>لا يوجد فواتير</div>"; return; }
        
        list.innerHTML = orders.map(o => `
            <div class="bg-[#0a101e] p-6 rounded-[2rem] border border-white/5 mb-4 animate-fadeIn">
                <div class="flex justify-between mb-3">
                    <span class="text-emerald-500 font-black text-[10px]">#${o.id}</span>
                    <span class="text-[9px] opacity-50">${o.date}</span>
                </div>
                <div class="space-y-1 mb-4 text-[11px] opacity-70">
                    ${o.items.map(it => `<div>${it.name} (x${it.qty})</div>`).join('')}
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-white/5">
                    <span class="text-emerald-500 text-[10px] font-black">${o.status}</span>
                    <span class="text-lg font-black">${Number(o.total).toLocaleString()} YER</span>
                </div>
            </div>`).join('');
    } catch(e) { list.innerHTML = "فشل التحميل"; }
}

// 7. الرسوميات والتحكم
function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-7 py-3.5 bg-[#0a101e] rounded-2xl whitespace-nowrap text-[11px] font-black transition-all ${state.cat === c ? 'bg-emerald-500 text-black' : 'text-slate-500 border border-white/5'}">
            ${c}
        </button>`).join('');
}

function renderProds() {
    const grid = document.getElementById('products-grid');
    let f = (state.cat === 'الكل') ? state.prods : state.prods.filter(p => p.cat === state.cat);
    grid.innerHTML = f.map(p => `
        <div class="bg-[#0a101e] p-5 rounded-[2.5rem] border border-white/5 active:scale-95 transition-all text-right" onclick="openSheet('${p._id}')">
            <div class="h-32 rounded-[2rem] bg-cover bg-center mb-3" style="background-image:url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3">
                <span class="text-emerald-400 font-black">${Number(p.price).toLocaleString()}</span>
                <i class="fas fa-plus-circle text-emerald-500"></i>
            </div>
        </div>`).join('');
}

function openSheet(id) {
    playSound('snd-click');
    const p = state.prods.find(x => x._id == id);
    if(!p) return;
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
    list.innerHTML = state.cart.map(i => {
        total += (Number(i.price) * i.qty);
        return `<div class="bg-[#0a101e] p-5 rounded-3xl flex justify-between items-center border border-white/5 mb-3">
            <span class="text-xs font-bold">${i.name} (x${i.qty})</span>
            <span class="font-black text-emerald-400">${(i.price * i.qty).toLocaleString()}</span>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

// 8. وظائف مساعدة العامة
function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function changeView(v, b) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if(v === 'orders') fetchOrders();
    if(v === 'cart') renderCart();
}

function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function logout() { localStorage.clear(); location.reload(); }
function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function triggerPrestigeNotif() { document.getElementById('snd-cashier').play(); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(()=>{}); } }
