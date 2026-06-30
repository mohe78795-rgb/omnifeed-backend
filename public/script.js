const API = "https://0zk30qr9iu.onrender.com";

// حالة التطبيق
let state = {
    prods: [], 
    cart: [],
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    cat: 'الكل'
};

// 1. تشغيل النظام عند فتح الصفحة
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                // التحقق من حالة الدخول
                if (state.user) { 
                    unlockApp(); 
                } else { 
                    document.getElementById('auth-screen').classList.remove('hidden'); 
                }
            }, 800);
        }
    }, 2000);
};

// 2. إدارة الحساب (الدخول والتسجيل)
function toggleAuth() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

// دالة إنشاء الحساب - ترسل البيانات لـ users.json
async function handleSignup() {
    const n = document.getElementById('reg-name').value;
    const p = document.getElementById('reg-phone').value;
    const ps = document.getElementById('reg-pass').value;

    if(!n || !p || !ps) return toast("⚠️ أكمل كافة البيانات");

    try {
        const res = await fetch(`${API}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: n, 
                phone: p, 
                pass: ps, 
                balance: 0 
            })
        });

        const data = await res.json();
        if(data.success) {
            state.user = { name: n, phone: p, pass: ps, bal: 0 };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ تم إنشاء حسابك بنجاح");
            unlockApp();
        }
    } catch (e) { toast("❌ فشل الاتصال بالسيرفر"); }
}

function handleLogin() {
    const p = document.getElementById('login-phone').value;
    const ps = document.getElementById('login-pass').value;
    const saved = JSON.parse(localStorage.getItem('abu_user_v30'));

    if(saved && saved.phone === p && saved.pass === ps) {
        state.user = saved;
        unlockApp();
    } else {
        toast("❌ رقم الهاتف أو كلمة المرور خطأ");
    }
}

// 3. فتح التطبيق
function unlockApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); 
        fetchProducts();
        syncUserData(); // مزامنة فورية عند الفتح
    }, 50);

    // تحديث الرصيد كل 10 ثواني من السيرفر
    setInterval(syncUserData, 10000);
}

// دالة تحديث الواجهة (الاسم والرصيد)
function ui() {
    if (!state.user) return;
    const balance = state.user.bal || 0;

    // تحديث الرصيد
    document.getElementById('u-balance').innerText = balance.toLocaleString();
    document.getElementById('u-balance-top').innerText = balance.toLocaleString() + " YER";

    // تحديث الأسماء
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('acc-name-display').innerText = state.user.name;

    // تحديث الأفاتار
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0).toUpperCase();
}

// دالة جلب الرصيد الحقيقي من السيرفر
async function syncUserData() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const current = data.active_users.find(u => u.phone === state.user.phone);
        if(current) {
            state.user.bal = current.balance;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) { console.log("خطأ في المزامنة"); }
}

// 4. جلب المنتجات وعرضها
async function fetchProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); 
        renderProds();
    } catch (e) { toast("⚠️ عطل في جلب المنتجات"); }
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-6 py-3 bg-white/5 rounded-2xl whitespace-nowrap text-xs font-bold ${state.cat === c ? 'bg-emerald-500 text-black' : ''}">
            ${c}
        </button>`).join('');
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

// 5. السلة والوظائف الأخرى
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
    updateBadge(); 
    toast("🛒 تمت الإضافة");
}

function updateBadge() {
    const b = document.getElementById('cart-badge');
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function logout() {
    localStorage.removeItem('abu_user_v30');
    location.reload();
}

function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function setCat(c) { state.cat = c; renderCats(); renderProds(); }
