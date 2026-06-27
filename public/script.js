const BASE_URL = "https://omnifeed.serveousercontent.com";
let state = { 
    allProds: [], 
    cart: [], 
    currentCat: 'الكل', 
    user: JSON.parse(localStorage.getItem('user_info')) || null 
};

function toggleAuth() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

async function handleSignup() {
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const pass = document.getElementById('reg-pass').value;
    if (!name || !phone || !pass) return showToast("⚠️ يرجى ملء كافة البيانات");
    const userInfo = { name, phone, pass, balance: 0, points: 0 };
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    state.user = userInfo;
    showToast("✅ تم إنشاء الحساب بنجاح");
    unlockApp();
}

async function handleLogin() {
    const phone = document.getElementById('login-phone').value;
    const pass = document.getElementById('login-pass').value;
    const savedUser = JSON.parse(localStorage.getItem('user_info'));
    if (savedUser && savedUser.phone === phone && savedUser.pass === pass) {
        state.user = savedUser;
        unlockApp();
    } else { showToast("❌ بيانات الدخول غير صحيحة"); }
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => app.style.opacity = "1", 50);
    initApp();
}

async function initApp() {
    updateUI();
    try {
        const pRes = await fetch(`${BASE_URL}/api/products`);
        state.allProds = await pRes.json();
        renderCats();
        renderProducts();
    } catch (e) { showToast("⚠️ فشل جلب المنتجات"); }
}

function updateUI() {
    const u = state.user;
    if (!u) return;
    document.getElementById('u-name').innerText = u.name;
    document.getElementById('acc-name').innerText = u.name;
    document.getElementById('acc-phone').innerText = u.phone;
    document.getElementById('u-balance').innerText = u.balance.toLocaleString();
    document.getElementById('acc-bal').innerText = u.balance.toLocaleString();
    document.getElementById('u-avatar').innerText = u.name.charAt(0);
    const hr = new Date().getHours();
    document.getElementById('greeting').innerText = hr < 12 ? "صباح الخير" : "مساء الخير";
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.allProds.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-6 py-3 glass-card rounded-2xl whitespace-nowrap text-[10px] font-black uppercase transition-all ${state.currentCat === c ? 'bg-emerald-500 !text-black' : 'opacity-40'}">${c}</button>
    `).join('');
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    const filtered = state.allProds.filter(p => (state.currentCat === 'الكل' || p.cat === state.currentCat) && p.name.toLowerCase().includes(search));
    grid.innerHTML = filtered.map(p => `
        <div class="glass-card p-4 rounded-[2rem] border border-white/5 shadow-xl" onclick="openSheet('${p.id}')">
            <div class="h-32 rounded-2xl bg-cover bg-center mb-4" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[10px] font-bold truncate opacity-80">${p.name}</h4>
            <div class="flex justify-between items-center mt-3"><span class="text-emerald-400 font-black text-xs">${parseInt(p.price).toLocaleString()}</span><i class="fas fa-plus-circle text-emerald-500"></i></div>
        </div>
    `).join('');
}

function changeView(view, btn) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(view === 'cart') renderCart();
}

function openSheet(id) {
    const p = state.allProds.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = parseInt(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    document.getElementById('product-sheet').style.bottom = "0";
}

function closeSheet() {
    document.getElementById('sheet-overlay').classList.add('hidden');
    document.getElementById('product-sheet').style.bottom = "-100%";
}

function addToCart(p) {
    state.cart.push(p);
    const b = document.getElementById('cart-badge');
    b.innerText = state.cart.length;
    b.classList.remove('hidden');
    showToast("🛒 أضيفت للسلة");
}

function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0;
    if (state.cart.length === 0) { list.innerHTML = "<p class='text-center py-20 opacity-20'>السلة فارغة</p>"; document.getElementById('cart-total').innerText = 0; return; }
    list.innerHTML = state.cart.map((item) => {
        total += parseInt(item.price);
        return `<div class="glass-card p-4 flex justify-between items-center"><span class="text-xs font-black">${item.name}</span><span class="text-emerald-400 font-bold">${parseInt(item.price).toLocaleString()}</span></div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function logout() { localStorage.removeItem('user_info'); location.reload(); }
function setCat(c) { state.currentCat = c; renderCats(); renderProducts(); }
function filterProducts() { renderProducts(); }
function showToast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}
