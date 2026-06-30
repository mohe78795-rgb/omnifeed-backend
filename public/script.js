const API = "https://0zk30qr9iu.onrender.com";

// حالة التطبيق (State)
let state = {
    prods: [], 
    cart: [],
    orders: JSON.parse(localStorage.getItem('abu_orders_v30')) || [],
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

// دالة إنشاء الحساب (المصلحة لإرسال كل البيانات للسيرفر)
async function handleSignup() {
    const n = document.getElementById('reg-name').value;
    const p = document.getElementById('reg-phone').value;
    const ps = document.getElementById('reg-pass').value;

    if(!n || !p || !ps) return toast("⚠️ أكمل كافة البيانات");

    try {
        // إرسال البيانات للسيرفر ليتم حفظها في users.json
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

        if(res.ok) {
            state.user = { name: n, phone: p, pass: ps, bal: 0 };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ تم إنشاء حسابك بنجاح");
            unlockApp();
        } else {
            toast("❌ فشل التسجيل في السيرفر");
        }
    } catch (e) { 
        toast("❌ خطأ في الاتصال بالسيرفر"); 
    }
}

function handleLogin() {
    const p = document.getElementById('login-phone').value;
    const ps = document.getElementById('login-pass').value;
    const saved = JSON.parse(localStorage.getItem('abu_user_v30'));

    if(saved && saved.phone === p && saved.pass === ps) {
        state.user = saved;
        unlockApp();
    } else {
        toast("❌ بيانات الدخول خاطئة");
    }
}

// 3. فتح التطبيق وبدء التزامن
function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); 
        fetchProducts();
        syncUserData(); // جلب الرصيد من السيرفر فوراً
    }, 50);

    // تحديث الرصيد تلقائياً كل 10 ثواني (لو الآدمن عدل الرصيد يظهر للزبون)
    setInterval(syncUserData, 10000);
}

// دالة مزامنة الرصيد من users.json في السيرفر
async function syncUserData() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const currentServerUser = data.active_users.find(u => u.phone === state.user.phone);
        
        if(currentServerUser) {
            state.user.bal = currentServerUser.balance;
            state.user.name = currentServerUser.name;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui(); // تحديث الأرقام المعروضة في الشاشة
        }
    } catch(e) { console.error("تزامن البيانات فشل"); }
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
    const bal = state.user.bal || 0;
    document.getElementById('u-balance').innerText = bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = bal.toLocaleString() + " YER";
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('acc-name-display').innerText = state.user.name;
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
        <div class="bg-[#0a101e] p-4 rounded-[2rem] border border-white/5 shadow-xl animate-fadeIn" onclick="sheet('${p.id}')">
            <div class="h-28 rounded-2xl bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[11px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-2">
                <span class="text-emerald-500 font-black text-sm">${parseInt(p.price).toLocaleString()} <small class="text-[8px]">YER</small></span>
                <i class="fas fa-plus-circle text-emerald-500"></i>
            </div>
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
    toast("🛒 تمت إضافة المنتج للسلة");
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
        return `
        <div class="bg-[#0a101e] p-4 rounded-2xl flex justify-between items-center border border-white/5">
            <div class="flex items-center gap-3">
                <img src="${i.img}" class="w-10 h-10 rounded-lg object-cover">
                <div><h4 class="text-xs font-bold text-white">${i.name}</h4><span class="text-emerald-500 text-[10px]">${i.price} YER</span></div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="changeQty(${i.id}, -1)" class="w-7 h-7 bg-white/10 rounded-lg font-black text-white">-</button>
                <span class="text-xs font-black w-4 text-center">${i.qty}</span>
                <button onclick="changeQty(${i.id}, 1)" class="w-7 h-7 bg-emerald-500 rounded-lg font-black text-black">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function changeQty(id, d) {
    const i = state.cart.find(x => x.id == id);
    if(i) {
        i.qty += d;
        if(i.qty <= 0) state.cart = state.cart.filter(x => x.id != id);
        renderCart(); 
        updateBadge();
    }
}

// تنفيذ الطلب وخصم الرصيد في السيرفر
async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if (state.cart.length === 0) return toast("⚠️ السلة فارغة");
    if (state.user.bal < total) return toast("❌ الرصيد لا يكفي");

    const orderData = {
        total: total,
        items: state.cart,
        date: new Date().toLocaleDateString('ar-EG'),
        user_phone: state.user.phone
    };

    try {
        // 1. إرسال الطلب للسيرفر ليظهر عند الآدمن
        const orderRes = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (orderRes.ok) {
            // 2. تحديث الرصيد الجديد في السيرفر (خصم المبلغ)
            const newBalance = state.user.bal - total;
            await fetch(`${API}/api/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: state.user.phone, 
                    balance: newBalance 
                })
            });

            // 3. تحديث البيانات محلياً
            state.user.bal = newBalance;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            
            state.cart = [];
            updateBadge();
            ui();
            renderOrdersServer(); // تحديث قائمة طلباتي
            changeView('orders', document.getElementById('nav-orders'));
            document.getElementById('snd-cashier').play().catch(()=>{});
            toast("✅ تم تنفيذ الطلب بنجاح");
        }
    } catch(e) { toast("❌ فشل الاتصال بالسيرفر"); }
}

async function renderOrdersServer() {
    try {
        const res = await fetch(`${API}/api/orders`);
        const allOrders = await res.json();
        // تصفية الطلبات الخاصة بهذا المستخدم فقط
        const myOrders = allOrders.filter(o => o.user_phone === state.user.phone);
        
        document.getElementById('orders-list').innerHTML = myOrders.map(o => `
            <div class="bg-[#0a101e] p-5 rounded-3xl border border-white/5 flex justify-between items-center shadow-xl">
                <div>
                    <p class="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">طلب رقم #${o.id}</p>
                    <h4 class="font-black text-white text-lg">${parseInt(o.total).toLocaleString()} YER</h4>
                    <p class="text-[9px] text-slate-500 mt-1">${o.time || o.date}</p>
                </div>
                <span class="text-[10px] bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full font-black animate-pulse">جاري التجهيز</span>
            </div>`).join('');
            
        if (myOrders.length === 0) {
            document.getElementById('orders-list').innerHTML = "<div class='text-center py-20 opacity-20 font-black'>لا توجد طلبات سابقة</div>";
        }
    } catch (e) { console.log("فشل تحميل الطلبات"); }
}

// 6. خدمات عامة
function setCat(c) { 
    state.cat = c; 
    renderCats(); 
    renderProds(); 
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    if (v === 'cart') renderCart();
    if (v === 'orders') renderOrdersServer();
    playSound('snd-click');
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
