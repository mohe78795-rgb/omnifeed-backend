// منظومة أبو حسين الحصرية - الواجهة العالمية v4.0
const API = window.location.origin; 
const WHATSAPP_NUMBER = "+967737528057"; // رقم حساب أبو حسين للمبيعات والمستلزمات

let state = {
    categories: [],
    prods: [],
    cart: [],
    layoutMode: 0, 
    user: JSON.parse(localStorage.getItem('abu_user_premium')) || null,
    games: [],
    selectedGame: null,
    selectedDenom: null
};

// تشغيل التطبيق بكفاءة كاملة عند التحميل
window.onload = () => {
    setTimeout(() => {
        if (state.user) unlockApp();
        else {
            document.getElementById('splash').style.display = 'none';
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }, 1800); // سرعة استجابة سريعة جداً لمحاكاة التطبيقات العالمية
};

async function unlockApp() {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui();
    await initProducts();
    await fetchAds();
    await fetchGames();
    await fetchMessages();
}

// جلب المنتجات والأقسام
async function initProducts() {
    try {
        let rCat = await fetch(`${API}/api/categories`);
        state.categories = await rCat.json();
        let rProd = await fetch(`${API}/api/products`);
        state.prods = await rProd.json();
        renderCategories();
    } catch (e) { toast("❌ حدث خطأ أثناء تحديث المنتجات"); }
}

// عرض الأقسام بكروت نظيفة جداً ومريحة للعين
function renderCategories() {
    const list = document.getElementById('categories-list');
    if(!list) return;
    list.innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="premium-card animate-slide-up">
            <img src="${c.img}" class="w-full h-28 object-cover rounded-xl mb-3 shadow-md bg-white/5">
            <h3 class="font-bold text-xs text-white text-right">${c.name}</h3>
            <p class="text-[10px] text-slate-400 text-right mt-0.5">${c.sub || 'تصفح التفاصيل'}</p>
        </div>
    `).join('');
}

// التحكم بنوع الشبكة (مربعي - مصفوفة - قائمة)
function setLayout(mode) {
    const container = document.getElementById('categories-list');
    if(!container) return;
    container.classList.remove('grid-matrix', 'grid-dual', 'grid-list');
    document.querySelectorAll('.layout-pill').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-layout-${mode}`).classList.add('active');
    
    if(mode === 0) container.classList.add('grid-dual');
    else if(mode === 1) container.classList.add('grid-matrix');
    else if(mode === 2) container.classList.add('grid-list');
    
    state.layoutMode = mode;
    playSound('snd-click');
}

// تصفح قسم محدد وعرض منتجاته
function openCategory(catName) {
    document.getElementById('cat-title-display').innerText = catName;
    const list = document.getElementById('products-list');
    const filtered = state.prods.filter(p => p.cat === catName);
    
    if(filtered.length > 0) {
        list.innerHTML = filtered.map(p => `
            <div onclick="openProductSheet('${p._id}')" class="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex gap-3 items-center cursor-pointer active:scale-[0.99] transition-all">
                <img src="${p.img}" class="w-16 h-16 object-cover rounded-lg bg-white/5 shadow-inner">
                <div class="flex-1 text-right">
                    <h3 class="font-bold text-xs text-white">${p.name}</h3>
                    <p class="text-xs text-[#10b981] font-bold font-mono mt-1">${Number(p.price).toLocaleString()} YER</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400"><i class="fas fa-plus text-[10px]"></i></div>
            </div>
        `).join('');
    } else {
        list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-medium">القسم فارغ حالياً</div>`;
    }
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-products').classList.remove('hidden');
    playSound('snd-click');
}

// الحصول على إحداثيات الـ GPS لتطبيق التوصيل الذكي
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { toast("⚠️ ميزة الموقع غير مدعومة بجهازك"); reject(); }
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ link: `https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}` }),
            (e) => { alert("❌ لإتمام الطلب بدقة، يرجى تفعيل الموقع (GPS) والسماح للمتجر بالوصول إليه."); reject(e); },
            { enableHighAccuracy: true, timeout: 7000 }
        );
    });
}

// معالجة وإرسال الطلبات
async function processOrder(method) {
    if (state.cart.length === 0) return toast("🛒 السلة فارغة تماماً");
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    
    if (method === 'wallet' && state.user.bal < total) {
        playSound('snd-notification');
        return toast("❌ رصيد المحفظة الحالي غير كافٍ");
    }

    toast("⏳ جاري تحديد موقع التوصيل الحالي...");
    try {
        const location = await getUserLocation();
        if (method === 'whatsapp') {
            let itemsString = state.cart.map(i => `• ${i.name} (الكمية: ${i.qty})`).join('\n');
            let text = `*طلب شراء جديد - متجر أبو حسين*\n\n*العميل:* ${state.user.name}\n*الهاتف:* ${state.user.phone}\n\n*الطلبات:*\n${itemsString}\n\n*الإجمالي:* ${total.toLocaleString()} YER\n\n*موقع التوصيل:* ${location.link}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
            state.cart = []; ui();
            changeView('home', document.querySelector("button[onclick*='home']"));
        } else {
            submitOrderToDB(location, total, method === 'wallet' ? "رصيد محفظة" : "عند الاستلام");
        }
    } catch (e) {}
}

async function submitOrderToDB(loc, total, paymentType) {
    toast("⏳ جاري حفظ وتأكيد العملية...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart, location: loc.link, paymentMethod: paymentType } })
        });
        if (res.ok) {
            let data = await res.json();
            playSound('snd-cashier');
            toast(`✅ تم تأكيد عمليتك بنجاح`);
            state.cart = [];
            if(paymentType === "رصيد محفظة") state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_premium', JSON.stringify(state.user));
            ui();
            changeView('orders', document.querySelector("button[onclick*='orders']"));
        } else { toast("❌ حدث خطأ أثناء إتمام العملية"); }
    } catch(e) { toast("❌ تحقق من اتصالك بالشبكة"); }
}

// التنقل الذكي والسلس بين الواجهات
function changeView(viewId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(`view-${viewId}`);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('animate-slide-up');
    }
    if(btn) btn.classList.add('active');
    
    if(viewId === 'orders') loadOrders();
    if(viewId === 'notifications') { fetchMessages(); document.getElementById('msg-dot').classList.add('hidden'); }
    if(viewId === 'home') renderCategories();
    
    ui();
    closeSheet();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// تحديثات شاشات الألعاب والإعلانات والوظائف الفرعية (تلقائي)
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        const player = document.getElementById('ad-video-player');
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            let url = ads[0].videoUrl;
            if(url.includes("watch?v=")) url = url.replace("watch?v=", "embed/");
            player.src = url;
            container.classList.remove('hidden');
        }
    } catch(e) {}
}

async function fetchGames() {
    try {
        let res = await fetch(`${API}/api/games`);
        let data = await res.json();
        if(data.success) {
            state.games = data.game_list;
            document.getElementById('games-list').innerHTML = state.games.map(g => `
                <div onclick="selectGame('${g.game_code}')" class="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center cursor-pointer active:scale-95 transition-all">
                    <span class="text-xs font-bold text-white">${g.game_name}</span>
                    <i class="fas fa-chevron-left text-[10px] text-slate-500"></i>
                </div>
            `).join('');
        }
    } catch(e) {}
}

function selectGame(code) {
    const g = state.games.find(x => x.game_code === code);
    state.selectedGame = g;
    document.getElementById('selected-game-title').innerText = g.game_name;
    document.getElementById('game-denoms-list').innerHTML = g.denominations.map(d => `
        <div onclick="pickDenom(this, '${d.id}')" class="p-4 bg-white/[0.01] border border-white/5 rounded-xl text-center cursor-pointer transition-all active:scale-95">
            <p class="text-xs font-bold text-white">${d.name}</p>
            <p class="text-[11px] text-[#10b981] font-bold mt-0.5 font-mono">${d.price.toLocaleString()} YER</p>
        </div>
    `).join('');
    document.getElementById('game-topup-panel').classList.remove('hidden');
}

function pickDenom(el, id) {
    document.querySelectorAll('#game-denoms-list > div').forEach(c => c.style.borderColor = 'rgba(255,255,255,0.05)');
    el.style.borderColor = '#10b981';
    state.selectedDenom = state.selectedGame.denominations.find(x => x.id === id);
    playSound('snd-click');
}

async function validatePlayer() {
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ الرجاء كتابة معرّف اللاعب");
    toast("⏳ جاري التحقق من الحساب...");
    try {
        let res = await fetch(`${API}/api/games/validate-user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ game_code: state.selectedGame.game_code, user_id: id })
        });
        let data = await res.json();
        if(data.success) {
            const d = document.getElementById('player-name-display');
            d.innerHTML = `اللاعب: ${data.player_name}`;
            d.classList.remove('hidden');
        } else { toast("❌ المعرّف غير موجود"); }
    } catch(e){}
}

async function processGameTopup() {
    const id = document.getElementById('game-player-id').value;
    if(!id || !state.selectedDenom) return toast("⚠️ يرجى تعبئة كافة الحقول أولاً");
    if(state.user.bal < state.selectedDenom.price) return toast("❌ الرصيد غير كافٍ");
    
    if(!confirm(`هل تود بالتأكيد شحن الحزمة للحساب: ${id}؟`)) return;
    toast("⚡ جاري الشحن الفوري الآمن...");
    try {
        let res = await fetch(`${API}/api/games/topup`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, game_code: state.selectedGame.game_code, user_id: id, denomination_id: state.selectedDenom.id, price: state.selectedDenom.price })
        });
        let data = await res.json();
        if(data.success) {
            toast("✅ تم الشحن المباشر بنجاح");
            state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_premium', JSON.stringify(state.user));
            ui();
            document.getElementById('game-topup-panel').classList.add('hidden');
        } else { toast("❌ " + data.message); }
    } catch(e){}
}

async function fetchMessages() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/messages/${state.user.phone}`);
        const data = await res.json();
        const list = document.getElementById('messages-list');
        if(data && data.length > 0) {
            document.getElementById('msg-dot').classList.remove('hidden');
            list.innerHTML = data.map(m => `
                <div class="p-4 bg-white/[0.01] border border-white/5 rounded-xl text-right">
                    <span class="text-[9px] text-slate-500">${m.date}</span>
                    <h3 class="text-xs font-bold text-white mt-1">${m.title}</h3>
                    <p class="text-xs text-slate-400 mt-1">${m.body}</p>
                </div>
            `).join('');
        } else { list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500">لا توجد رسائل واردة</div>`; }
    } catch(e){}
}

async function loadOrders() {
    const list = document.getElementById('orders-list');
    if(!list) return;
    list.innerHTML = `<div class="text-center py-6 text-xs text-slate-500">جاري التحديث...</div>`;
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`);
        let orders = await res.json();
        list.innerHTML = orders.length > 0 ? orders.map(o => `
            <div class="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-2 text-right">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-mono font-bold text-slate-400">${o.id || 'فاتورة'}</span>
                    <span class="text-[10px] px-2 py-0.5 bg-white/5 rounded-md text-white font-medium">${o.status}</span>
                </div>
                <div class="text-xs text-slate-400 bg-black/40 p-3 rounded-lg">${o.items.map(i => `• ${i.name} (x${i.qty})`).join('<br>')}</div>
                <div class="flex justify-between items-center pt-1">
                    <span class="text-[9px] text-slate-500">${o.date}</span>
                    <span class="text-xs font-bold text-[#10b981] font-mono">${o.total.toLocaleString()} YER</span>
                </div>
            </div>`).join('') : `<div class="text-center py-12 text-xs text-slate-500">سجل العمليات فارغ</div>`;
    } catch (e) { list.innerHTML = "خطأ في الاتصال"; }
}

function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    
    if(document.getElementById('acc-name')) {
        document.getElementById('acc-name').innerText = state.user.name;
        document.getElementById('acc-phone').innerText = state.user.phone;
        document.getElementById('acc-avatar-large').innerText = state.user.name.charAt(0);
        document.getElementById('acc-date').innerText = state.user.joinDate || "مستمر";
    }

    const cartList = document.getElementById('cart-list');
    if(cartList) {
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
        
        const badge = document.getElementById('cart-badge');
        if(state.cart.length > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');

        if(state.cart.length > 0) {
            cartList.innerHTML = state.cart.map(i => `
                <div class="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center">
                    <div class="text-right">
                        <h4 class="font-bold text-xs text-white">${i.name}</h4>
                        <p class="text-xs text-[#10b981] font-bold mt-0.5 font-mono">${(i.price * i.qty).toLocaleString()} YER</p>
                    </div>
                    <div class="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-lg">
                        <button onclick="updateQty('${i._id}', -1)" class="text-xs text-slate-400 font-bold">-</button>
                        <span class="text-xs font-bold text-white w-4 text-center font-mono">${i.qty}</span>
                        <button onclick="updateQty('${i._id}', 1)" class="text-xs text-[#10b981] font-bold">+</button>
                    </div>
                </div>`).join('');
        } else { cartList.innerHTML = `<div class="text-center py-12 text-xs text-slate-500">حقيبة التسوق فارغة</div>`; }
    }
}

async function handleAuth() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;

    if(!phone || !pass || (isSignup && !name)) return toast("⚠️ يرجى ملء الحقول بالكامل");
    let url = isSignup ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    
    toast("⏳ جاري التحقق الآمن...");
    try {
        let res = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, phone, pass}) });
        let data = await res.json();
        if(data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_premium', JSON.stringify(state.user));
            unlockApp();
        } else { toast("❌ " + data.message); }
    } catch(e) { toast("❌ حدث خطأ في السيرفر"); }
}

function addToCart(p) { 
    let i = state.cart.find(x => x._id === p._id); 
    if(i) i.qty++; else state.cart.push({...p, qty:1}); 
    ui(); toast("🛒 أضيف بنجاح"); playSound('snd-click');
}

function updateQty(id, delta) { 
    let i = state.cart.find(x => x._id === id); 
    if(i) { 
        i.qty += delta; 
        if(i.qty <= 0) state.cart = state.cart.filter(x => x._id !== id); 
        ui(); playSound('snd-click');
    } 
}

function toast(m) { 
    const t = document.getElementById('toast'); 
    t.innerText = m; t.classList.remove('hidden'); 
    if(window.tOut) clearTimeout(window.tOut);
    window.tOut = setTimeout(() => t.classList.add('hidden'), 3500); 
}

function logout() { localStorage.removeItem('abu_user_premium'); location.reload(); }

function openProductSheet(id) {
    const p = state.prods.find(x => x._id === id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
    playSound('snd-click');
}

function closeSheet() { 
    document.getElementById('product-sheet').style.bottom = "-100%"; 
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 300); 
}

function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(()=>{}); } }

function toggleAuthMode() {
    const container = document.getElementById('signup-name-container');
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    
    container.classList.toggle('hidden');
    if(container.classList.contains('hidden')) {
        title.innerText = "مرحباً بك";
        btn.innerText = "تسجيل الدخول";
        toggleBtn.innerText = "أنشئ حساباً الآن";
    } else {
        title.innerText = "حساب جديد";
        btn.innerText = "تأكيد التسجيل";
        toggleBtn.innerText = "لديك حساب؟ دخول";
    }
}

function manualRefresh() {
    toast("⏳ جاري تحديث البيانات...");
    Promise.all([initProducts(), fetchAds(), fetchGames(), fetchMessages(), sync()])
        .then(() => toast("✅ تم التحديث بنجاح"));
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok && data.success) { state.user = data.user; localStorage.setItem('abu_user_premium', JSON.stringify(state.user)); ui(); }
    } catch (e) {}
}
setInterval(() => { if(state.user) sync(); }, 60000);
