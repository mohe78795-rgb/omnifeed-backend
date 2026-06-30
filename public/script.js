// الإعدادات الأساسية
const API = "https://0zk30qr9iu.onrender.com";

// حالة التطبيق (State)
let state = {
    prods: [], 
    cart: [],
    orders: [],
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
                // إذا كان المستخدم مسجل مسبقاً، نفتح التطبيق مباشرة
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

// دالة الدخول المحدثة (تبحث في السيرفر)
async function handleLogin() {
    const p = document.getElementById('login-phone').value;
    const ps = document.getElementById('login-pass').value;

    if (!p || !ps) return toast("⚠️ أدخل البيانات أولاً");

    try {
        // جلب قائمة المستخدمين من السيرفر
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        
        // البحث عن المستخدم المطابق
        const user = data.active_users.find(u => u.phone === p && u.pass === ps);

        if (user) {
            // حفظ البيانات محلياً
            state.user = { 
                name: user.name, 
                phone: user.phone, 
                pass: user.pass, 
                bal: user.balance 
            };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            
            toast("✅ مرحباً بعودتك يا " + user.name);
            unlockApp();
        } else {
            toast("❌ رقم الهاتف أو كلمة المرور خطأ");
        }
    } catch (e) {
        toast("❌ فشل الاتصال بالسيرفر");
    }
}

// دالة إنشاء حساب جديد
async function handleSignup() {
    const n = document.getElementById('reg-name').value;
    const p = document.getElementById('reg-phone').value;
    const ps = document.getElementById('reg-pass').value;

    if(!n || !p || !ps) return toast("⚠️ أكمل كافة البيانات");

    try {
        const res = await fetch(`${API}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, phone: p, pass: ps, balance: 0 })
        });

        if(res.ok) {
            state.user = { name: n, phone: p, pass: ps, bal: 0 };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ تم إنشاء الحساب بنجاح");
            unlockApp();
        }
    } catch (e) { toast("❌ فشل الاتصال بالسيرفر"); }
}

// 3. فتح التطبيق وبدء العمل
function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); 
        fetchProducts();
        syncUserData(); 
    }, 50);

    // تحديث الرصيد تلقائياً كل 10 ثواني
    setInterval(syncUserData, 10000);
}

// مزامنة البيانات مع السيرفر (الرصيد والاسم)
async function syncUserData() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const current = data.active_users.find(u => u.phone === state.user.phone);
        
        if(current) {
            state.user.bal = current.balance;
            state.user.name = current.name;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) { console.log("خطأ في التزامن"); }
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

function ui() {
    if (!state.user) return;
    const balance = state.user.bal || 0;
    document.getElementById('u-balance').innerText = balance.toLocaleString();
    document.getElementById('u-balance-top').innerText = balance.toLocaleString() + " YER";
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('acc-name-display').innerText = state.user.name;
    // عرض الهاتف في صفحة حسابي إذا وجد العنصر
    const phoneEl = document.getElementById('acc-phone-display');
    if (phoneEl) phoneEl.innerText = state.user.phone;
    
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0).toUpperCase();
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-6 py-3 bg-white/5 rounded-2xl whitespace-nowrap text-xs font-bold transition-all ${state.cat === c ? 'bg-emerald-500 text-black' : ''}">
            ${c}
        </button>`).join('');
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    let filtered = state.cat === 'الكل' ? data : data.filter(p => p.cat === state.cat);
    
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-4 rounded-[2rem] border border-white/5 shadow-xl" onclick="sheet('${p.id}')">
            <div class="h-28 rounded-2xl bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[11px] font-black truncate">${p.name}</h4>
            <p class="text-emerald-500 font-black text-sm">${parseInt(p.price).toLocaleString()} YER</p>
        </div>`).join('');
}

// 5. السلة والطلبات
function sheet(id) {
    const p = state.prods.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = parseInt(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { add(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
    playSound('snd-click');
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

function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0;
    if (state.cart.length === 0) {
        list.innerHTML = "<div class='text-center py-20 opacity-20 font-black'>السلة فارغة</div>";
        document.getElementById('cart-total').innerText = "0 YER";
        return;
    }
    list.innerHTML = state.cart.map(i => {
        total += (i.price * i.qty);
        return `<div class="bg-[#0a101e] p-4 rounded-2xl flex justify-between items-center">
            <div class="flex items-center gap-3"><img src="${i.img}" class="w-10 h-10 rounded-lg"><div><h4 class="text-xs font-bold">${i.name}</h4></div></div>
            <div class="flex items-center gap-2"><button onclick="changeQty(${i.id}, -1)" class="w-6 h-6 bg-white/10 rounded">-</button><span>${i.qty}</span><button onclick="changeQty(${i.id}, 1)" class="w-6 h-6 bg-emerald-500 text-black rounded">+</button></div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function changeQty(id, d) {
    const i = state.cart.find(x => x.id == id);
    if(i) { i.qty += d; if(i.qty <= 0) state.cart = state.cart.filter(x => x.id != id); renderCart(); updateBadge(); }
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if (state.cart.length === 0) return toast("⚠️ السلة فارغة");
    if (state.user.bal < total) return toast("❌ الرصيد لا يكفي");

    const orderData = {
        total: total,
        items: state.cart,
        user_phone: state.user.phone,
        date: new Date().toLocaleDateString('ar-EG')
    };

    try {
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            const newBal = state.user.bal - total;
            // تحديث الرصيد في السيرفر
            await fetch(`${API}/api/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: state.user.phone, balance: newBal })
            });

            state.cart = [];
            updateBadge();
            syncUserData(); 
            toast("✅ تم إرسال الطلب");
            changeView('orders', document.getElementById('nav-orders'));
            document.getElementById('snd-cashier').play();
        }
    } catch (e) { toast("❌ فشل الاتصال بالسيرفر"); }
}

async function renderOrdersServer() {
    try {
        const res = await fetch(`${API}/api/orders`);
        const allOrders = await res.json();
        const myOrders = allOrders.filter(o => o.user_phone === state.user.phone);
        
        document.getElementById('orders-list').innerHTML = myOrders.map(o => `
            <div class="bg-[#0a101e] p-4 rounded-3xl border border-white/5 flex justify-between items-center">
                <div><p class="text-[10px] text-emerald-500 font-bold">#${o.id}</p><h4 class="font-bold">${o.total.toLocaleString()} YER</h4></div>
                <span class="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">جاري التجهيز</span>
            </div>`).join('');
    } catch (e) { console.log("خطأ في تحميل الطلبات"); }
}

// 6. خدمات عامة
function setCat(c) { state.cat = c; renderCats(); renderProds(); }

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    if (v === 'cart') renderCart();
    if (v === 'orders') renderOrdersServer();
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

function playSound(id) {
    const s = document.getElementById(id);
    if(s) s.play().catch(()=>{});
}

function searchInHome() {
    const term = document.getElementById('home-search').value.toLowerCase();
    const res = state.prods.filter(p => p.name.toLowerCase().includes(term));
    renderProds(res);
}
