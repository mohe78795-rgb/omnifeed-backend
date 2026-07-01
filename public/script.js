const API = window.location.origin;
let state = { categories: [], prods: [], cart: [], layoutMode: 0, user: JSON.parse(localStorage.getItem('abu_user_v30')) || null };

window.onload = () => {
    setTimeout(() => {
        if (state.user) unlockApp();
        else document.getElementById('auth-screen').classList.remove('hidden');
    }, 2000);
};

// ✅ المزامنة الصوتية الآمنة
function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        setTimeout(() => { sound.play().catch(() => {}); }, 0);
    }
}

// ✅ دالة فك قفل التطبيق (Startup Sequence)
function unlockApp() { 
    document.getElementById('auth-screen').style.display = "none"; 
    document.getElementById('main-app').classList.remove('hidden'); 
    setTimeout(async () => { 
        document.getElementById('main-app').style.opacity = "1"; 
        ui(); 
        loadPromoVideo(); 
        await initProducts(); 
        sync(); 
    }, 50); 
}

// ✅ المزامنة المؤمنة بكلمة المرور المحلية
async function sync() {
    if(!state.user || !state.user.phone || !state.user.pass) return;
    try {
        const res = await fetch(`${API}/api/auth/sync`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, pass: state.user.pass })
        });
        const d = await res.json();
        if(res.ok) {
            const currentPass = state.user.pass; // الاحتفاظ بالمفتاح المحلي
            state.user = d.user;
            state.user.pass = currentPass; // إعادة تعيينه للعمليات القادمة
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) {}
}

// ✅ تحديث الواجهة والسلة
function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);

    const cartList = document.getElementById('cart-list');
    if(cartList) {
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
        if(state.cart.length > 0) {
            cartList.innerHTML = state.cart.map(i => `
                <div class="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 animate-fadeIn mb-2 shadow-lg">
                    <div class="text-right">
                        <h4 class="text-xs font-bold text-white">${i.name}</h4>
                        <p class="text-[10px] text-emerald-400 mt-1 font-black">${Number(i.price).toLocaleString()} YER × ${i.qty}</p>
                    </div>
                    <button onclick="removeFromCart('${i._id}')" class="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl active:scale-90 transition-all"><i class="fas fa-trash-can"></i></button>
                </div>`).join('');
        } else { cartList.innerHTML = "<div class='opacity-20 text-center py-20 text-xs font-bold italic'>الحقيبة فارغة</div>"; }
    }
}

// ✅ التبديل الذكي بين الواجهات
function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    const target = document.getElementById('view-' + v);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById('cart-fab')?.classList.remove('bg-emerald-600', 'scale-110');
    
    if(b) {
        b.classList.add('active');
    } else {
        if(v === 'cart') { document.getElementById('cart-fab')?.classList.add('bg-emerald-600', 'scale-110'); }
        else {
            document.querySelectorAll('.nav-item').forEach(btn => {
                if(btn.getAttribute('onclick')?.includes(`'${v}'`)) btn.classList.add('active');
            });
        }
    }
    if(v === 'cart') ui(); 
    if(v === 'orders') fetchOrders();
    playSound('snd-click');
}

// ✅ معالجة المشتريات وإرسال التحقق الأمني المكتمل للمحفظة المالية
async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    if(state.cart.length === 0) return toast("⚠️ الحقيبة فارغة");
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");

    const btn = document.querySelector('#view-cart .btn-royal');
    if(btn.disabled) return;

    try {
        btn.disabled = true; btn.innerText = "⏳ جاري تأمين الطلب...";
        const res = await fetch(`${API}/api/orders/add`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            // 🛡️ نرسل الهاتف والباسورد المحلي معاً للتحقق في السيرفر الجديد
            body: JSON.stringify({ 
                phone: state.user.phone, 
                pass: state.user.pass, 
                order: { total, items: state.cart } 
            }) 
        });
        const d = await res.json();
        if(res.ok) {
            state.user.bal = d.currentBal; 
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            state.cart = []; ui(); await sync(); 
            playSound('snd-cashier'); toast("✅ تم تنفيذ طلبك"); changeView('orders');
        } else { toast("❌ " + d.message); }
    } catch(e) { toast("⚠️ فشل الاتصال بالشبكة"); } finally { btn.disabled = false; btn.innerText = "تأكيد المشتريات من الرصيد"; }
}

// ✅ فواتير العميل
async function fetchOrders() {
    const list = document.getElementById('orders-list');
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        list.innerHTML = orders.map(o => `
            <div class="p-5 bg-[#0a101e] rounded-2xl border border-white/5 mb-3 animate-fadeIn text-right shadow-xl">
                <div class="flex justify-between text-[10px] opacity-50"><span>${o.date}</span><span class="font-black text-emerald-500">ID: ${o.id}</span></div>
                <div class="font-bold text-lg text-white">${Number(o.total).toLocaleString()} YER</div>
                <div class="text-[10px] text-slate-400 bg-white/5 p-2 rounded-lg mt-2 font-black italic">الحالة: <span class="text-emerald-400 uppercase">${o.status}</span></div>
            </div>`).join('') || "<div class='opacity-20 text-center py-20'>لا توجد فواتير</div>";
    } catch(e) { list.innerHTML = "<div class='text-center py-20 text-red-500 font-bold'>⚠️ عطل في جلب البيانات</div>"; }
}

// ✅ دالة الدخول (تثبيت الباسورد محلياً فوراً)
async function handleLogin() {
    const phone = document.getElementById('login-phone').value, pass = document.getElementById('login-pass').value;
    if(!phone || !pass) return toast("⚠️ أدخل البيانات");
    try {
        const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone, pass }) });
        const d = await res.json();
        if(res.ok) { 
            state.user = d.user; 
            state.user.pass = pass; // 🔑 حقن كلمة المرور في الكاش المحلي
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); 
            unlockApp(); 
        }
        else toast("❌ " + d.message);
    } catch(e) { toast("⚠️ عطل في السيرفر"); }
}

// ✅ دالة التسجيل (تثبيت الباسورد محلياً فوراً)
async function handleSignup() {
    const n = document.getElementById('reg-name').value, p = document.getElementById('reg-phone').value, ps = document.getElementById('reg-pass').value;
    if(!n || !p || !ps) return toast("⚠️ أكمل الحقول");
    try {
        const res = await fetch(`${API}/api/auth/signup`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: n, phone: p, pass: ps }) });
        const d = await res.json();
        if(res.ok) { 
            state.user = d.user; 
            state.user.pass = ps; // 🔑 حقن كلمة المرور في الكاش المحلي
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); 
            unlockApp(); 
        }
        else toast("❌ " + d.message);
    } catch(e) { toast("⚠️ عطل فني"); }
}

// ✅ إدارة المنتجات والأقسام
async function initProducts() {
    try {
        const [pRes, cRes] = await Promise.all([ fetch(`${API}/api/products`), fetch(`${API}/api/categories`) ]);
        state.prods = await pRes.json(); state.categories = await cRes.json();
        renderCategories();
    } catch (e) { setTimeout(initProducts, 3000); }
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = state.categories.map(cat => `
        <div class="card-glass animate-fadeIn shadow-lg" onclick="openCategory('${cat.name}')">
            <img src="${cat.img}" class="w-full h-20 object-cover rounded-xl mb-3 border border-white/5">
            <h3 class="text-[10px] font-black truncate text-white">${cat.name}</h3>
            <span class="text-[8px] opacity-40 text-white">${cat.sub}</span>
        </div>`).join('');
}

function openCategory(catName) {
    playSound('snd-click');
    document.getElementById('current-cat-name').innerText = catName;
    changeView('category-details');
    const filtered = state.prods.filter(p => p.cat === catName);
    const prodGrid = document.getElementById('category-products-grid');
    prodGrid.innerHTML = filtered.map(p => `
        <div class="card-glass animate-fadeIn shadow-lg" onclick="sheet('${p._id}')">
            <img src="${p.img}" class="w-full h-32 object-cover rounded-xl mb-3 border border-white/5">
            <h3 class="text-xs font-bold truncate text-white">${p.name}</h3>
            <p class="text-emerald-400 font-black mt-1 text-sm">${Number(p.price).toLocaleString()} YER</p>
        </div>`).join('') || "<div class='col-span-full opacity-30 text-center py-20 font-bold'>قريباً..</div>";
}

// ✅ أدوات التحكم بالتشكيل والملف الشخصي
function switchLayout() {
    state.layoutMode = (state.layoutMode + 1) % 3;
    const grid = document.getElementById('categories-grid'), icons = ["fa-table-cells", "fa-grip-lines-vertical", "fa-list-ul"];
    grid.className = `cards-container ${["mode-matrix", "mode-dual", "mode-list"][state.layoutMode]}`;
    document.getElementById('layoutIcon').className = `fa ${icons[state.layoutMode]} text-emerald-500`;
    playSound('snd-click');
}

function sheet(id) {
    const p = state.prods.find(x => x._id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
    playSound('snd-click');
}

async function loadPromoVideo() {
    try {
        const res = await fetch(`${API}/api/ads/active`);
        const data = await res.json();
        const video = document.getElementById('promo-video');
        if (video && data && data.videoUrl) { video.src = data.videoUrl; video.muted = true; video.play().catch(() => {}); }
    } catch (e) {}
}

function toggleMute() {
    const video = document.getElementById('promo-video'), icon = document.getElementById('mute-icon');
    if(video) { video.muted = !video.muted; icon.className = video.muted ? "fas fa-volume-mute text-white text-[11px]" : "fas fa-volume-up text-white text-[11px]"; }
}

function addToCart(p) { let i = state.cart.find(x => x._id === p._id); if(i) i.qty++; else state.cart.push({...p, qty:1}); toast("🛒 تمت الإضافة"); }
function removeFromCart(id) { state.cart = state.cart.filter(x => x._id !== id); ui(); }
function logout() { localStorage.clear(); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function toggleAuth() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }

