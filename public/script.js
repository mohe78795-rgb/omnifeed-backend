const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

let state = {
    prods: [], cart: [], orders: [],
    cat: 'الكل', user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    settings: { status: "open", news: "" }
};

// 1. التهيئة والتشغيل
window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) unlockApp();
            else document.getElementById('auth-screen').classList.remove('hidden');
        }, 700);
    }, 2000);
};

// 2. المزامنة مع السيرفر (V31 & V32)
async function syncWithServer() {
    if (!state.user) return;
    try {
        // جلب بيانات المستخدم والنقاط
        const uRes = await fetch(`${API}/api/user/${state.user.phone}`);
        if (uRes.ok) {
            const data = await uRes.json();
            state.user.bal = data.balance;
            state.user.stars = data.stars;
            ui();
        }
        // جلب إعدادات المحل والحالة
        const sRes = await fetch(`${API}/api/settings`);
        state.settings = await sRes.json();
        applySettings();
        // جلب الطلبات وحالاتها
        const oRes = await fetch(`${API}/api/orders/${state.user.phone}`);
        state.orders = await oRes.json();
        if (!document.getElementById('view-orders').classList.contains('hidden')) renderOrders();
    } catch (e) { console.log("Offline Mode"); }
}

function applySettings() {
    const banner = document.getElementById('system-banner');
    const bannerText = document.getElementById('banner-text');
    if (state.settings.news) { banner.classList.remove('hidden'); bannerText.innerText = state.settings.news; }
    document.getElementById('main-app').classList.toggle('store-closed', state.settings.status === "closed");
}

// 3. إدارة المتجر والمنتجات
async function fetchProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch (e) { toast("⚠️ عطل في جلب البيانات"); }
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    let filtered = (state.cat === 'الكل') ? data : data.filter(p => p.cat === state.cat);
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-4 rounded-[2.2rem] border border-white/5 active:scale-95 transition-all shadow-lg" onclick="sheet('${p.id}')">
            <div class="h-32 rounded-3xl bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-xs font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3">
                <span class="text-emerald-400 font-black text-sm">${parseInt(p.price).toLocaleString()}</span>
                <i class="fas fa-plus-circle text-emerald-500 text-lg"></i>
            </div>
        </div>`).join('');
}

// 4. نظام السلة والدفع (V31)
async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (parseInt(i.price) * i.qty), 0);
    if(!total) return toast("⚠️ السلة فارغة");
    if(state.user.bal < total) return toast("❌ رصيدك غير كافٍ");

    toast("⏳ جاري تأمين الطلب...");
    try {
        const res = await fetch(`${API}/api/orders/new`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, items: state.cart, total: total })
        });
        if(res.ok) {
            const data = await res.json();
            state.user.bal = data.newBalance;
            state.user.stars = data.newStars;
            state.cart = [];
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui(); triggerPrestigeNotif(); changeView('orders', null);
            toast("✅ تم تنفيذ الطلب وربحت نجوم!");
        }
    } catch(e) { toast("❌ خطأ في السيرفر"); }
}

// 5. سجل الطلبات المطور (V32)
function renderOrders() {
    const list = document.getElementById('orders-list');
    if(!state.orders.length) return list.innerHTML = "<div class='text-center py-20 opacity-10 font-black'>لا توجد عمليات</div>";
    list.innerHTML = state.orders.map(o => `
        <div class="order-card animate-slideUp">
            <div class="flex justify-between items-start mb-4">
                <div><p class="text-[9px] text-emerald-500 font-black">ORDER #${o.id}</p><h3 class="text-xl font-black">${o.total.toLocaleString()} YER</h3></div>
                <div class="text-left"><span class="text-[8px] bg-white/5 px-2 py-1 rounded-md text-slate-500">${o.date}</span></div>
            </div>
            <div class="timeline">
                ${['طلب', 'تجهيز', 'توصيل', 'استلام'].map((label, i) => `
                    <div class="step ${o.statusStep >= i ? 'active' : ''}">
                        <div class="dot">${o.statusStep >= i ? '<i class="fas fa-check"></i>' : i+1}</div>
                        <span class="step-label">${label}</span>
                    </div>
                `).join('')}
            </div>
            <div class="flex gap-2 mt-4 pt-4 border-t border-white/5">
                <button onclick="reorder('${o.id}')" class="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">إعادة طلب</button>
                <button onclick="rateOrder('${o.id}')" class="px-5 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black"><i class="fas fa-star"></i></button>
            </div>
        </div>`).join('');
}

// 6. ميزات V32 الإضافية
function reorder(orderId) {
    const oldOrder = state.orders.find(o => o.id === orderId);
    if(oldOrder) {
        state.cart = [...oldOrder.items];
        badge(); changeView('cart', null);
        toast("🛒 تم نسخ المنتجات للسلة");
    }
}

function rateOrder(id) { toast("⭐ شكراً لتقييمك!"); }

// 7. الدوال المساعدة
function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => { document.getElementById('main-app').style.opacity = "1"; ui(); syncWithServer(); initGoldParticles(); }, 50);
    fetchProducts();
}

function ui() {
    if (!state.user) return;
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('u-stars').innerText = state.user.stars || 0;
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    badge();
}

function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if(v === 'cart') renderCart();
    if(v === 'orders') renderOrders();
    playSound('snd-click');
}

function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function handleLogin() { /* كود التحقق من السيرفر */ unlockApp(); }
function handleSignup() { /* كود التسجيل في السيرفر */ unlockApp(); }
function logout() { localStorage.clear(); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 3000); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime=0; s.play().catch(()=>{}); } }
function badge() { 
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const b = document.getElementById('cart-badge');
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); } else b.classList.add('hidden');
}

// جسيمات الذهب الخلفية
function initGoldParticles() {
    const canvas = document.getElementById('gold-particles');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    let particles = Array(25).fill().map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2, v: Math.random() * 0.3 }));
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); p.y -= p.v; if (p.y < 0) p.y = canvas.height; });
        requestAnimationFrame(draw);
    }
    draw();
}

// تحديث دوري للسيرفر كل دقيقتين
setInterval(syncWithServer, 120000);
