/**
 * تموينات أبو حسين - المحرك البرمجي (V30 - MongoDB Edition)
 * تطوير وأتمتة: محمد موسى معجم
 */

const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

// 1. حالة التطبيق (State Management)
let state = {
    prods: [],
    cart: [],
    location: null,
    orders: JSON.parse(localStorage.getItem('abu_orders_v30')) || [],
    cat: 'الكل',
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    favs: JSON.parse(localStorage.getItem('abu_favs_v30')) || []
};

// 2. التهيئة عند التشغيل (Splash Screen Logic)
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if(splash) {
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

// 3. دالة جلب المنتجات الذكية (Retry Mechanism)
async function initProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        if (!res.ok) throw new Error();
        state.prods = await res.json();
        
        // إذا نجح الاتصال، نقوم بالرسم
        renderCats(); 
        renderProds();
        console.log("✅ تم جلب المنتجات من MongoDB");
    } catch (e) {
        console.log("⏳ السيرفر في وضع النوم (Render Cold Start)، جاري المحاولة مرة أخرى...");
        // إظهار مؤشر تحميل بسيط للمستخدم
        const grid = document.getElementById('products-grid');
        if(grid) grid.innerHTML = `<div class="col-span-2 text-center py-10 opacity-50 animate-pulse font-black">جاري إيقاظ المتجر...</div>`;
        
        setTimeout(initProducts, 3000); // إعادة المحاولة كل 3 ثواني
    }
}

// 4. نظام المصادقة (Auth API)
async function handleLogin() {
    const p = document.getElementById('login-phone').value;
    const ps = document.getElementById('login-pass').value;
    if(!p || !ps) return toast("⚠️ أدخل البيانات");

    try {
        toast("⏳ جاري التحقق...");
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: p, pass: ps })
        });
        const data = await res.json();
        if(res.ok) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            unlockApp();
        } else {
            toast("❌ " + (data.message || "خطأ في البيانات"));
        }
    } catch(e) { toast("⚠️ فشل الاتصال بالسيرفر"); }
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
        } else {
            toast("❌ " + (data.message || "فشل التسجيل"));
        }
    } catch(e) { toast("⚠️ فشل الاتصال بالسيرفر"); }
}

// مزامنة البيانات (Sync)
async function syncUserData() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        if(res.ok) {
            const data = await res.json();
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) { console.warn("Sync failed"); }
}

// 5. إدارة الواجهة (UI Management)
function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); 
        initGoldParticles(); 
        syncUserData(); 
    }, 50);
    initProducts();
}

function ui() {
    if (!state.user) return;
    const balance = Number(state.user.bal) || 0;
    document.getElementById('u-balance').innerText = balance.toLocaleString();
    document.getElementById('u-balance-top').innerText = balance.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = "هاتف: " + state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    updateBadge();
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    const catList = document.getElementById('cat-list');
    if(!catList) return;
    catList.innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-7 py-3.5 bg-[#0a101e] rounded-2xl whitespace-nowrap text-[11px] font-black transition-all ${state.cat === c ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 border border-white/5'}">
            ${c}
        </button>`).join('');
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    if(!grid) return;
    let filtered = (state.cat === 'الكل') ? data : data.filter(p => p.cat === state.cat);
    
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-5 rounded-[2.5rem] border border-white/5 active:scale-95 transition-all text-right relative shadow-xl" onclick="openSheet('${p._id || p.id}')">
            <div class="h-32 rounded-[2rem] bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3">
                <span class="text-emerald-400 font-black">${Number(p.price).toLocaleString()}</span>
                <i class="fas fa-plus-circle text-emerald-500 text-lg"></i>
            </div>
        </div>`).join('');
}

// 6. السلة والطلبات
async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (Number(i.price) * i.qty), 0);
    if (!state.cart.length) return toast("⚠️ السلة فارغة");
    if (state.user.bal < total) return toast("❌ الرصيد غير كافٍ");

    const orderData = {
        id: Math.random().toString(36).substr(2, 5).toUpperCase(),
        total: total,
        status: 'تم الاستلام',
        items: [...state.cart]
    };

    try {
        toast("⏳ جاري معالجة الطلب...");
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.user.phone, order: orderData })
        });
        
        if(res.ok) {
            state.user.bal -= total;
            state.orders.unshift(orderData);
            localStorage.setItem('abu_orders_v30', JSON.stringify(state.orders));
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            state.cart = [];
            ui();
            triggerPrestigeNotif();
            changeView('orders', null);
            toast("✅ تم تنفيذ الطلب بنجاح");
        } else {
            const err = await res.json();
            toast("❌ " + (err.message || "فشل الطلب"));
        }
    } catch(e) { toast("⚠️ فشل الاتصال بالسيرفر"); }
}

// 7. وظائف مساعدة (Utilities)
function setCat(c) { 
    state.cat = c; 
    renderCats(); 
    renderProds(); 
}

function openSheet(id) {
    playSound('snd-click');
    const p = state.prods.find(x => (x._id || x.id) == id);
    if(!p) return;
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString();
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function closeSheet() { 
    document.getElementById('product-sheet').style.bottom = "-100%"; 
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); 
}

function addToCart(p) {
    const item = state.cart.find(i => (i._id || i.id) === (p._id || p.id));
    if (item) item.qty++; else state.cart.push({ ...p, qty: 1 });
    updateBadge(); 
    toast("🛒 تمت الإضافة للسلة");
}

function updateBadge() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const b = document.getElementById('cart-badge');
    if(b) {
        if(count > 0) { b.innerText = count; b.classList.remove('hidden'); } 
        else b.classList.add('hidden');
    }
}

function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0;
    if (!state.cart.length) { 
        list.innerHTML = "<div class='text-center py-20 opacity-20 font-black'>السلة فارغة</div>"; 
        document.getElementById('cart-total').innerText = "0 YER"; 
        return; 
    }
    list.innerHTML = state.cart.map(i => {
        total += (Number(i.price) * i.qty);
        return `<div class="bg-[#0a101e] p-5 rounded-3xl flex justify-between items-center border border-white/5 mb-3">
            <div class="flex items-center gap-3">
                <img src="${i.img}" class="w-12 h-12 rounded-xl object-cover">
                <div><h4 class="text-xs font-bold">${i.name}</h4><span class="text-emerald-500 text-[10px]">${Number(i.price).toLocaleString()}</span></div>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="updateQty('${i._id || i.id}', -1)" class="w-7 h-7 bg-white/5 rounded-lg">-</button>
                <span class="text-xs font-bold">${i.qty}</span>
                <button onclick="updateQty('${i._id || i.id}', 1)" class="w-7 h-7 bg-emerald-500 text-black rounded-lg">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function updateQty(id, delta) {
    const i = state.cart.find(x => (x._id || x.id) == id);
    if (i) {
        i.qty += delta;
        if (i.qty <= 0) state.cart = state.cart.filter(x => (x._id || x.id) != id);
        renderCart(); updateBadge();
    }
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if(!state.orders.length) { list.innerHTML = "<div class='text-center py-20 opacity-20 font-black'>لا يوجد طلبات سابقة</div>"; return; }
    list.innerHTML = state.orders.map(o => `
        <div class="bg-white/5 p-5 rounded-[2rem] border border-white/5">
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] font-black text-emerald-500">ID: #${o.id}</span>
                <span class="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg">${o.status}</span>
            </div>
            <div class="flex justify-between items-end">
                <span class="text-xs text-slate-400">${o.date || 'اليوم'}</span>
                <span class="text-lg font-black">${Number(o.total).toLocaleString()} YER</span>
            </div>
        </div>`).join('');
}

// 8. المؤثرات والوظائف العامة
function triggerPrestigeNotif() {
    playSound('snd-cashier');
    const banner = document.getElementById('top-push-notif');
    if(banner) {
        banner.style.top = "20px";
        setTimeout(() => banner.style.top = "-150px", 5000);
    }
}

function changeView(v, b) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    const target = document.getElementById('view-' + v);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    
    if (v === 'cart') renderCart();
    if (v === 'orders') renderOrders();
}

function initGoldParticles() {
    const canvas = document.getElementById('gold-particles');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    let p = Array(20).fill().map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2, v: Math.random() * 0.2 }));
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "#fbbf2411";
        p.forEach(i => { ctx.beginPath(); ctx.arc(i.x, i.y, i.s, 0, Math.PI*2); ctx.fill(); i.y -= i.v; if(i.y < -10) i.y = canvas.height + 10; });
        requestAnimationFrame(draw);
    }
    draw();
}

function toast(m) {
    const t = document.getElementById('toast');
    if(t) {
        t.innerText = m; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
}

function toggleAuth() { 
    document.getElementById('login-box').classList.toggle('hidden'); 
    document.getElementById('signup-box').classList.toggle('hidden'); 
}

function logout() { 
    localStorage.removeItem('abu_user_v30'); 
    location.reload(); 
}

function playSound(id) {
    const s = document.getElementById(id);
    if(s) { s.currentTime = 0; s.play().catch(()=>{}); }
}
