const API = window.location.origin; // ليعمل السيرفر تلقائياً محلياً أو على ريندر
let state = {
    categories: [],
    prods: [],
    cart: [],
    layoutMode: 0,
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [],
    selectedGame: null,
    selectedDenom: null
};

// --- تفعيل ميزة السحب للأسفل للتحديث (Pull to Refresh) ---
let touchStart = 0;
window.addEventListener('touchstart', e => { touchStart = e.touches[0].pageY; }, {passive: true});
window.addEventListener('touchmove', e => {
    const touchMove = e.touches[0].pageY;
    if (window.scrollY === 0 && touchMove > touchStart + 160) {
        touchStart = 999999; // منع التكرار العشوائي
        manualRefresh();
    }
}, {passive: true});

async function manualRefresh() {
    const btn = document.getElementById('refresh-btn');
    if(btn) btn.classList.add('rotate-180', 'opacity-50');
    toast("⏳ جاري تحديث ومزامنة البيانات الفورية...");

    await sync();
    await initProducts();
    await fetchAds();
    await fetchMessages();

    if(btn) {
        setTimeout(() => {
            btn.classList.remove('rotate-180', 'opacity-50');
        }, 500);
    }
    toast("✅ تم التحديث بنجاح");
}

setInterval(() => {
    if(state.user) sync();
}, 20000);

window.onload = () => {
    setTimeout(() => {
        if (state.user) unlockApp();
        else {
            document.getElementById('splash').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }, 2000);
};

function ui() {
    if(!state.user) return;

    // تحديث البيانات الشخصية والمحفظة بشكل آمن وبدون توقف
    const topBal = document.getElementById('u-balance-top');
    if(topBal) topBal.innerText = Number(state.user.bal).toLocaleString() + " YER";

    const accName = document.getElementById('acc-name');
    if(accName) accName.innerText = state.user.name;

    const accPhone = document.getElementById('acc-phone');
    if(accPhone) accPhone.innerText = state.user.phone;

    const accDate = document.getElementById('acc-date');
    if(accDate) accDate.innerText = state.user.joinDate || "مستمر";

    const avatar = document.getElementById('u-avatar');
    if(avatar) avatar.innerText = state.user.name.charAt(0);

    const avatarLarge = document.getElementById('acc-avatar-large');
    if(avatarLarge) avatarLarge.innerText = state.user.name.charAt(0);

    // معالجة واحتساب سلة المشتريات وعرض زر السلة والتوتال
    const cartList = document.getElementById('cart-list');
    if(cartList) {
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const cartTotal = document.getElementById('cart-total');
        if(cartTotal) cartTotal.innerText = total.toLocaleString() + " YER";

        if(state.cart.length > 0) {
            cartList.innerHTML = state.cart.map(i => `
                <div class="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                    <div>
                        <h4 class="font-bold text-sm">${i.name}</h4>
                        <p class="text-xs text-emerald-400 mt-1">${(i.price * i.qty).toLocaleString()} YER</p>
                    </div>
                    <div class="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                        <button onclick="updateQty('${i._id}', -1)" class="text-xs text-slate-400">-</button>
                        <span class="text-xs font-black">${i.qty}</span>
                        <button onclick="updateQty('${i._id}', 1)" class="text-xs text-emerald-400">+</button>
                    </div>
                </div>
            `).join('');
        } else {
            cartList.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-bold">حقيبة التسوق فارغة</div>`;
        }
    }
}

async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui();
    await initProducts();
    await fetchAds();
    await fetchGames();
    await fetchMessages();
}

async function initProducts() {
    try {
        let rCat = await fetch(`${API}/api/categories`);
        state.categories = await rCat.json();
        let rProd = await fetch(`${API}/api/products`);
        state.prods = await rProd.json();
        renderCategories();
    } catch (e) { toast("❌ عطل في جلب البيانات من السيرفر"); }
}

async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        const player = document.getElementById('ad-video-player');

        if (ads && ads.length > 0 && ads[0].videoUrl) {
            let embedUrl = ads[0].videoUrl;
            if(embedUrl.includes("watch?v=")) {
                embedUrl = embedUrl.replace("watch?v=", "embed/");
            }
            player.src = embedUrl;
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    } catch(e) { console.log("Ad Fetch Error"); }
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
                <div class="p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">${m.date}</span>
                        <i class="fas fa-envelope-open text-emerald-500 opacity-20"></i>
                    </div>
                    <h3 class="text-sm font-black mb-1">${m.title}</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">${m.body}</p>
                </div>
            `).join('');
        } else {
            document.getElementById('msg-dot').classList.add('hidden');
            list.innerHTML = `<div class="opacity-30 text-center py-20 text-xs font-bold">لا توجد إشعارات أو رسائل جديدة</div>`;
        }
    } catch(e) { console.log("Msg Error"); }
}

async function fetchGames() {
    try {
        let res = await fetch(`${API}/api/games`);
        let data = await res.json();
        if(data.success) {
            state.games = data.game_list;
            const list = document.getElementById('games-list');
            list.innerHTML = state.games.map(g => `
                <div onclick="selectGame('${g.game_code}')" class="p-5 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center cursor-pointer active:scale-[0.98] transition">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 text-lg">
                            <i class="fas fa-gamepad"></i>
                        </div>
                        <div>
                            <h3 class="font-black text-sm">${g.game_name}</h3>
                            <p class="text-[9px] text-emerald-500 font-bold">شحن مباشر تلقائي ⚡</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-left text-xs text-slate-500"></i>
                </div>
            `).join('');
        }
    } catch(e) { console.log("Games Error"); }
}

function selectGame(code) {
    const g = state.games.find(x => x.game_code === code);
    state.selectedGame = g;
    document.getElementById('selected-game-title').innerText = g.game_name;
    document.getElementById('game-player-id').value = "";
    document.getElementById('player-name-display').classList.add('hidden');

    const denomsDiv = document.getElementById('game-denoms-list');
    denomsDiv.innerHTML = g.denominations.map(d => `
        <div onclick="pickDenom(this, '${d.id}')" class="denom-card p-4 bg-black/40 border border-white/5 rounded-2xl text-center cursor-pointer transition">
            <p class="text-xs font-black">${d.name}</p>
            <p class="text-[10px] text-emerald-400 mt-1 font-bold">${d.price.toLocaleString()} YER</p>
        </div>
    `).join('');

    state.selectedDenom = null;
    document.getElementById('game-topup-panel').classList.remove('hidden');
    document.getElementById('game-topup-panel').scrollIntoView({ behavior: 'smooth' });
}

function pickDenom(el, id) {
    document.querySelectorAll('.denom-card').forEach(c => c.classList.remove('border-emerald-500', 'bg-emerald-500/5'));
    el.classList.add('border-emerald-500', 'bg-emerald-500/5');
    state.selectedDenom = state.selectedGame.denominations.find(x => x.id === id);
    playSound('snd-click');
}

async function validatePlayer() {
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ أدخل الـ ID أولاً");
    let res = await fetch(`${API}/api/games/validate-user`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ game_code: state.selectedGame.game_code, user_id: id })
    });
    let data = await res.json();
    if(data.success) {
        const display = document.getElementById('player-name-display');
        display.innerText = "👤 اسم اللاعب: " + data.player_name;
        display.classList.remove('hidden');
    }
}

async function processGameTopup() {
    const id = document.getElementById('game-player-id').value;
    if(!id || !state.selectedDenom) return toast("⚠️ أكمل البيانات وحدد الفئة");

    if(state.user.bal < state.selectedDenom.price) return toast("❌ رصيد محفظتك غير كافٍ لشحن هذه الفئة");

    toast("⚡ جاري الشحن الفوري عبر السيرفر...");
    let res = await fetch(`${API}/api/games/topup`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            phone: state.user.phone,
            game_code: state.selectedGame.game_code,
            user_id: id,
            denomination_id: state.selectedDenom.id,
            price: state.selectedDenom.price
        })
    });
    let data = await res.json();
    if(data.success) {
        playSound('snd-cashier');
        toast("✅ تم شحن اللعبة بنجاح فوري وتم خصم الرصيد!");
        state.user.bal = data.currentBal;
        localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
        ui();
        document.getElementById('game-topup-panel').classList.add('hidden');
    } else {
        toast("❌ " + data.message);
    }
}

function renderCategories() {
    const list = document.getElementById('categories-list');
    if(!list) return;
    list.innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="card-glass">
            <img src="${c.img}" class="w-full h-32 object-cover rounded-2xl mb-3">
            <h3 class="font-black text-sm text-slate-100">${c.name}</h3>
            <p class="text-[9px] text-slate-500 mt-1">${c.sub || 'خدمات متميزة'}</p>
        </div>
    `).join('');
}

function openCategory(catName) {
    document.getElementById('cat-title-display').innerText = catName;
    const list = document.getElementById('products-list');
    const filtered = state.prods.filter(p => p.cat === catName);

    if(filtered.length > 0) {
        list.innerHTML = filtered.map(p => `
            <div onclick="openProductSheet('${p._id}')" class="p-4 bg-white/5 rounded-3xl border border-white/5 flex gap-4 items-center cursor-pointer active:scale-[0.99] transition">
                <img src="${p.img}" class="w-20 h-20 object-cover rounded-2xl">
                <div class="flex-1">
                    <h3 class="font-black text-sm">${p.name}</h3>
                    <p class="text-xs text-emerald-400 font-bold mt-1">${Number(p.price).toLocaleString()} YER</p>
                </div>
                <i class="fas fa-plus text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-xl"></i>
            </div>
        `).join('');
    } else {
        list.innerHTML = `<div class="opacity-30 text-center py-12 text-xs font-bold">لا توجد منتجات حالياً في هذا القسم</div>`;
    }

    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-products').classList.remove('hidden');
}

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

function addToCart(p) {
    let i = state.cart.find(x => x._id === p._id);
    if(i) i.qty++; else state.cart.push({...p, qty:1});
    ui();
    toast("🛒 أضيف للسلة بنجاح");
}

function updateQty(id, delta) {
    let i = state.cart.find(x => x._id === id);
    if(i) {
        i.qty += delta;
        if(i.qty <= 0) state.cart = state.cart.filter(x => x._id !== id);
        ui();
    }
}

async function checkout() {
    if(state.cart.length === 0) return toast("🛒 سلتك فارغة لتنفيذ طلب");
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ رصيد محفظتك غير كافٍ لإتمام الدفع");

    toast("⏳ جاري معالجة وإرسال طلبك...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
        });
        let data = await res.json();
        if(res.ok) {
            playSound('snd-cashier');
            toast("✅ تم تنفيذ وشراء الطلب وسحب الرصيد بنجاح!");
            state.cart = [];
            state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            changeView('orders', document.querySelector("button[onclick*='orders']"));
        }
    } catch(e) { toast("❌ عطل في الشبكة"); }
}

async function loadOrders() {
    const list = document.getElementById('orders-list');
    if(!list) return;
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`);
        let orders = await res.json();
        if(orders.length > 0) {
            list.innerHTML = orders.map(o => `
                <div class="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-black text-emerald-400">${o.id}</span>
                        <span class="text-[10px] px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-slate-400 font-bold">${o.status}</span>
                    </div>
                    <div class="text-xs text-slate-400 space-y-1">
                        ${o.items.map(i => `<div>• ${i.name} (x${i.qty})</div>`).join('')}
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-white/5">
                        <span class="text-[9px] text-slate-500">${o.date}</span>
                        <span class="text-sm font-black text-emerald-400">${Number(o.total).toLocaleString()} YER</span>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-bold">لا توجد فواتير سابقة</div>`;
        }
    } catch (e) { list.innerHTML = "خطأ في جلب الفواتير"; }
}

async function changeView(viewId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');

    if(viewId === 'orders') await loadOrders();
    if(viewId === 'notifications') await fetchMessages();
    if(viewId === 'home') await fetchAds();
    ui();
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok && data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) { console.log("Sync failed silently"); }
}

async function handleAuth() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;

    if(!phone || !pass || (isSignup && !name)) return toast("⚠️ الرجاء ملء كافة الحقول");

    let url = isSignup ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    let body = isSignup ? { name, phone, pass } : { phone, pass };

    toast("⏳ جاري التحقق من الحساب...");
    try {
        let res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        let data = await res.json();
        if(data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ أهلاً بك! تم الدخول بنجاح");
            unlockApp();
        } else {
            toast("❌ " + data.message);
        }
    } catch(e) { toast("❌ فشل الاتصال بالسيرفر المركزي"); }
}

function toggleAuthMode() {
    const container = document.getElementById('signup-name-container');
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const toggleText = document.getElementById('auth-toggle-text');

    if(container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        title.innerText = "إنشاء حساب";
        btn.innerText = "تسجيل الحساب الجديد";
        toggleText.innerText = "لديك حساب بالفعل؟";
        toggleBtn.innerText = "تسجيل الدخول";
    } else {
        container.classList.add('hidden');
        title.innerText = "تسجيل الدخول";
        btn.innerText = "دخول آمن";
        toggleText.innerText = "ليس لديك حساب؟";
        toggleBtn.innerText = "إنشاء حساب جديد";
    }
}

function setLayout(mode) {
    const container = document.getElementById('categories-list');
    if(!container) return;
    
    container.classList.remove('mode-matrix', 'mode-dual', 'mode-list');
    document.querySelectorAll('[id^="btn-layout-"]').forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-black');
        b.classList.add('text-slate-400');
    });

    const activeBtn = document.getElementById(`btn-layout-${mode}`);
    if(activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-emerald-500', 'text-black');
    }
    
    if(mode === 0) container.classList.add('mode-dual');
    if(mode === 1) container.classList.add('mode-matrix');
    if(mode === 2) container.classList.add('mode-list');
    state.layoutMode = mode;
}

function logout() { localStorage.clear(); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3500); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(e=>{}); } }


