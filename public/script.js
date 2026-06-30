/**
 * تموينات أبو حسين - المحرك البرمجي (V30)
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

// 2. التهيئة عند التشغيل
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            if (state.user) { 
                unlockApp(); 
            } else { 
                document.getElementById('auth-screen').classList.remove('hidden'); 
            }
        }, 800);
    }, 1500);
};

// 3. نظام المصادقة (Auth API)
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
    } catch(e) {
        toast("⚠️ فشل الاتصال بالسيرفر");
    }
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
    } catch(e) {
        toast("⚠️ فشل الاتصال بالسيرفر");
    }
}

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

// 4. عرض البيانات (UI Updates)
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

async function initProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); 
        renderProds();
    } catch (e) { toast("⚠️ عطل في جلب المنتجات"); }
}

function ui() {
    if (!state.user) return;
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = "هاتف: " + state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    updateBadge();
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    let filtered = (state.cat === 'الكل') ? data : data.filter(p => p.cat === state.cat);
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-5 rounded-[2.5rem] border border-white/5 active:scale-95 transition-all text-right relative" onclick="openSheet('${p.id}')">
            <div class="h-32 rounded-[2rem] bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3">
                <span class="text-emerald-400 font-black">${parseInt(p.price).toLocaleString()}</span>
                <i class="fas fa-plus-circle text-emerald-500"></i>
            </div>
        </div>`).join('');
}

// 5. السلة والعمليات المالية
async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (parseInt(i.price) * i.qty), 0);
    if (!state.cart.length) return toast("⚠️ السلة فارغة");
    if (state.user.bal < total) return toast("❌ الرصيد غير كافٍ");

    const orderData = {
        id: Math.random().toString(36).substr(2, 5).toUpperCase(),
        total: total,
        status: 'تم الاستلام',
        date: new Date().toLocaleDateString('ar-EG'),
        items: [...state.cart]
    };

    try {
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
            toast("❌ فشل تنفيذ الطلب");
        }
    } catch(e) { toast("⚠️ خطأ في الاتصال بالسيرفر"); }
}

// 6. الموقع وواتساب
function triggerGPSProcess() {
    closeLocationModal();
    toast("⚙️ جاري تحديد الإحداثيات...");
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
            state.location = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
            sendWhatsAppToStore();
        }, () => {
            toast("⚠️ تعذر تحديد الموقع، سيتم الإرسال بدونه");
            sendWhatsAppToStore();
        }, { enableHighAccuracy: true });
    } else {
        sendWhatsAppToStore();
    }
}

function sendWhatsAppToStore() {
    const total = state.cart.reduce((s, i) => s + (parseInt(i.price) * i.qty), 0);
    const itemsStr = state.cart.map(i => `• ${i.name} (${i.qty})`).join('\n');
    let msg = `*طلب جديد*\n${itemsStr}\n\n*الإجمالي: ${total.toLocaleString()} YER*`;
    if(state.location) msg += `\n\n📍 الموقع:\n${state.location}`;
    
    window.open(`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

// 7. وظائف مساعدة (Utilities)
function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function changeView(v, b) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if (v === 'cart') renderCart();
    if (v === 'orders') renderOrders();
}

function playSound(id) {
    const s = document.getElementById(id);
    if(s) { s.currentTime = 0; s.play().catch(()=>{}); }
}

function initGoldParticles() {
    const canvas = document.getElementById('gold-particles');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    let p = Array(30).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: Math.random() * 2,
        v: Math.random() * 0.3
    }));
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#fbbf2422";
        p.forEach(i => {
            ctx.beginPath(); ctx.arc(i.x, i.y, i.s, 0, Math.PI*2); ctx.fill();
            i.y -= i.v; if(i.y < -10) i.y = canvas.height + 10;
        });
        requestAnimationFrame(draw);
    }
    draw();
}

// الدوال المفقودة من أجل اكتمال المنطق
function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function logout() { localStorage.removeItem('abu_user_v30'); location.reload(); }
function closeLocationModal() { document.getElementById('location-modal').classList.add('hidden'); }
function openLocationModal() { document.getElementById('location-modal').classList.remove('hidden'); }
function openSheet(id) {
    playSound('snd-click');
    const p = state.prods.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = parseInt(p.price).toLocaleString();
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function addToCart(p) {
    const item = state.cart.find(i => i.id === p.id);
    if (item) item.qty++; else state.cart.push({ ...p, qty: 1 });
    updateBadge(); toast("🛒 تمت الإضافة");
}
function updateBadge() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const b = document.getElementById('cart-badge');
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); } else b.classList.add('hidden');
}
