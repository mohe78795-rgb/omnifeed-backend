const API = "https://0zk30qr9iu.onrender.com";
let state = { categories: [], prods: [], cart: [], layoutMode: 0, user: JSON.parse(localStorage.getItem('abu_user_v30')) || null };

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

// --- نظام الإعلان والتحكم بالصوت ---
async function loadPromoVideo() {
    try {
        const res = await fetch(`${API}/api/ads/active`);
        const data = await res.json();
        const video = document.getElementById('promo-video');
        if (video && data && data.videoUrl) {
            video.src = data.videoUrl;
            video.muted = true;
            video.play().catch(() => {});
        }
    } catch (e) {}
}

function toggleMute() {
    const video = document.getElementById('promo-video');
    video.muted = !video.muted;
    document.getElementById('mute-icon').className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

// --- نظام تبديل العرض (Layout Switcher) ---
function switchLayout() {
    state.layoutMode = (state.layoutMode + 1) % 3;
    const grid = document.getElementById('categories-grid');
    const icon = document.getElementById('layoutIcon');
    const classes = ["mode-matrix", "mode-dual", "mode-list"];
    const icons = ["fa-table-cells", "fa-grip-lines-vertical", "fa-list-ul"];
    grid.className = `cards-container ${classes[state.layoutMode]}`;
    icon.className = `fa ${icons[state.layoutMode]} text-emerald-500`;
    if(window.navigator.vibrate) window.navigator.vibrate(25);
}

// --- المصادقة ---
function toggleAuth() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

async function handleLogin() {
    const phone = document.getElementById('login-phone').value, pass = document.getElementById('login-pass').value;
    try {
        const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone, pass }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); unlockApp(); }
        else toast(data.message);
    } catch(e) { toast("⚠️ عطل فني"); }
}

async function handleSignup() {
    const name = document.getElementById('reg-name').value, phone = document.getElementById('reg-phone').value, pass = document.getElementById('reg-pass').value;
    try {
        const res = await fetch(`${API}/api/auth/signup`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name, phone, pass }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); unlockApp(); }
        else toast(data.message);
    } catch(e) { toast("⚠️ عطل فني"); }
}

// --- إدارة المتجر السحابي ---
function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => { document.getElementById('main-app').style.opacity = "1"; ui(); sync(); loadPromoVideo(); }, 50);
    initProducts();
}

async function initProducts() {
    try {
        const [prodRes, catRes] = await Promise.all([ fetch(`${API}/api/products`), fetch(`${API}/api/categories`) ]);
        state.prods = await prodRes.json();
        state.categories = await catRes.json();
        renderCategories();
    } catch (e) { setTimeout(initProducts, 3000); }
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = state.categories.map(cat => `
        <div class="card-glass animate-fadeIn" onclick="openCategory('${cat.name}')">
            <img src="${cat.img}" class="w-full h-24 object-cover rounded-xl mb-3 card-img">
            <h3 class="text-[11px] font-bold truncate">${cat.name}</h3>
            <span class="text-[8px] opacity-40">${cat.sub}</span>
        </div>`).join('');
}

function openCategory(catName) {
    if(window.navigator.vibrate) window.navigator.vibrate(30);
    document.getElementById('current-cat-name').innerText = catName;
    changeView('category-details');
    const filtered = state.prods.filter(p => p.cat === catName);
    const prodGrid = document.getElementById('category-products-grid');
    prodGrid.innerHTML = filtered.map(p => `
        <div class="card-glass animate-fadeIn" onclick="sheet('${p._id}')">
            <img src="${p.img}" class="w-full h-32 object-cover rounded-xl mb-3">
            <h3 class="text-xs font-bold truncate">${p.name}</h3>
            <p class="text-emerald-400 font-black mt-1 text-sm">${p.price.toLocaleString()} YER</p>
        </div>`).join('') || "<div class='col-span-full opacity-30 text-center py-20'>قريباً..</div>";
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");
    try {
        const res = await fetch(`${API}/api/orders/add`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } }) });
        const data = await res.json();
        if(res.ok) { state.user.bal = data.currentBal; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); state.cart = []; ui(); toast("✅ تم بنجاح"); changeView('orders'); }
    } catch(e) { toast("⚠️ فشل الاتصال"); }
}

// --- أدوات المساعدة ---
async function sync() {
    const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
    const data = await res.json();
    if(res.ok) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); ui(); }
}

function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
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
}

function sheet(id) {
    const p = state.prods.find(x => x._id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = p.price.toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function addToCart(p) {
    let i = state.cart.find(x => x._id === p._id);
    if(i) i.qty++; else state.cart.push({...p, qty:1});
    toast("🛒 تمت الإضافة");
}

function logout() { localStorage.clear(); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
