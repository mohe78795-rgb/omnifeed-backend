const API = "https://0zk30qr9iu.onrender.com";
let state = { 
    categories: [], 
    prods: [], 
    cart: [], 
    layoutMode: 0, 
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [],          
    selectedGame: null  
};

window.onload = () => {
    setTimeout(() => {
        if (state.user) unlockApp();
        else {
            const splash = document.getElementById('splash');
            if(splash) splash.classList.add('hidden');
            const authScreen = document.getElementById('auth-screen');
            if(authScreen) authScreen.classList.remove('hidden');
        }
    }, 2000);
};

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
                <div class="card-glass flex justify-between items-center animate-fadeIn mb-2">
                    <div class="text-right">
                        <h4 class="text-xs font-bold text-white">${i.name}</h4>
                        <p class="text-[10px] text-emerald-400 mt-1 font-black">${Number(i.price).toLocaleString()} YER × ${i.qty}</p>
                    </div>
                    <button onclick="removeFromCart('${i._id}')" class="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl active:scale-90 transition-all">
                        <i class="fas fa-trash-can text-[10px]"></i>
                    </button>
                </div>`).join('');
        } else {
            cartList.innerHTML = `
                <div class="opacity-30 text-center py-20 animate-fadeIn">
                    <i class="fas fa-shopping-basket text-4xl mb-4"></i>
                    <p class="text-xs font-bold">الحقيبة فارغة حالياً</p>
                </div>`;
        }
    }
}

function loadPromoVideo() {
    const v = document.getElementById('promo-video');
    if(v) { v.play().catch(() => console.log("Autoplay blocked")); }
}

function toggleMute() {
    const v = document.getElementById('promo-video');
    const icon = document.getElementById('mute-icon');
    if(v) {
        v.muted = !v.muted;
        icon.className = v.muted ? "fas fa-volume-mute text-white text-xs" : "fas fa-volume-up text-emerald-500 text-xs";
    }
}

function removeFromCart(id) {
    state.cart = state.cart.filter(x => x._id !== id);
    ui();
    toast("🗑️ تم الحذف من السلة");
}

function changeView(v, b) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');

    if(v === 'cart') ui(); 
    if(v === 'orders') fetchOrders();
    if(v === 'games') renderGamesMenu(); 
}

async function initGamesData() {
    try {
        const res = await fetch(`${API}/api/games`);
        const data = await res.json();
        if(data.success) { state.games = data.game_list; }
    } catch(e) { console.error("Games Fetching Error"); }
}

function renderGamesMenu() {
    const grid = document.getElementById('games-list-grid');
    if(!grid) return;
    
    cancelGameSelection();

    const gameIcons = {
        "PUBGM_GLOBAL": "https://img.icons8.com/color/144/pubg-drop-box.png",
        "MLBB_GLOBAL": "https://img.icons8.com/color/144/mobile-legends.png",
        "FREEFIRE_GLOBAL": "https://img.icons8.com/color/144/free-fire.png"
    };

    grid.innerHTML = state.games.map(g => `
        <div class="card-glass flex flex-col items-center animate-fadeIn cursor-pointer" onclick="selectGameToTopup('${g.game_code}')">
            <img src="${gameIcons[g.game_code] || 'https://img.icons8.com/color/144/game-controller.png'}" class="w-16 h-16 object-contain mb-3">
            <h3 class="text-xs font-black text-white">${g.game_name}</h3>
        </div>
    `).join('');
}

function selectGameToTopup(code) {
    playSound('snd-click');
    state.selectedGame = state.games.find(g => g.game_code === code);
    if(!state.selectedGame) return;

    document.getElementById('games-list-grid').classList.add('hidden');
    const panel = document.getElementById('game-topup-panel');
    panel.classList.remove('hidden');

    document.getElementById('selected-game-title').innerText = state.selectedGame.game_name;
    
    const denomList = document.getElementById('game-denominations-list');
    denomList.innerHTML = state.selectedGame.denominations.map(pkg => `
        <div class="card-glass flex justify-between items-center transition-all mb-2">
            <div class="text-right">
                <span class="text-sm font-black text-white block">${pkg.name}</span>
            </div>
            <button onclick="sendTopupRequest('${pkg.id}', ${pkg.price})" class="px-4 py-2 bg-emerald-500 text-black text-xs font-black rounded-xl active:scale-90">
                ${Number(pkg.price).toLocaleString()} YER
            </button>
        </div>
    `).join('');
}

function cancelGameSelection() {
    state.selectedGame = null;
    const panel = document.getElementById('game-topup-panel');
    const grid = document.getElementById('games-list-grid');
    if(panel) panel.classList.add('hidden');
    if(grid) grid.classList.remove('hidden');
}

async function validatePlayer() {
    playSound('snd-click');
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ أدخل معرف اللاعب أولاً");
    
    const display = document.getElementById('player-name-display');
    display.innerText = "جاري الفحص...";

    try {
        const res = await fetch(`${API}/api/games/validate-user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ game_code: state.selectedGame.game_code, user_id: id })
        });
        const data = await res.json();
        if(data.success) {
            display.innerText = `اسم الحساب: ${data.player_name} ✅`;
        } else {
            display.innerText = "فشل التعرف على المعرف";
        }
    } catch(e) { display.innerText = ""; toast("⚠️ خطأ في الاتصال"); }
}

async function sendTopupRequest(pkgId, price) {
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ أدخل معرف اللاعب!");
    if(state.user.bal < price) return toast("❌ رصيد غير كافٍ");

    if(!confirm(`تأكيد شحن بقيمة ${price} YER؟`)) return;

    try {
        toast("⏳ جاري المعالجة...");
        const res = await fetch(`${API}/api/games/topup`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                phone: state.user.phone,
                game_code: state.selectedGame.game_code,
                user_id: id,
                denomination_id: pkgId,
                price: price
            })
        });
        const data = await res.json();
        if(res.ok && data.success) {
            playSound('snd-cashier'); 
            state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            toast("🚀 تم الشحن بنجاح!");
            cancelGameSelection();
        } else {
            toast("❌ " + data.message);
        }
    } catch(e) { toast("⚠️ عطل فني"); }
}

async function fetchOrders() {
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        const list = document.getElementById('orders-list');
        if(res.ok && orders.length > 0) {
            list.innerHTML = orders.map(o => `
                <div class="card-glass mb-3 text-right">
                    <div class="flex justify-between text-[10px] opacity-50"><span>${o.date}</span></div>
                    <div class="font-bold text-lg">${Number(o.total).toLocaleString()} YER</div>
                    <div class="text-[10px] text-emerald-400">حالة الطلب: ${o.status}</div>
                </div>`).join('');
        }
    } catch(e) { console.error("Orders Error"); }
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    if(state.cart.length === 0) return toast("⚠️ الحقيبة فارغة");
    
    try {
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
        });
        if(res.ok) {
            const data = await res.json();
            state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            state.cart = [];
            ui();
            toast("✅ تم تنفيذ طلبك");
            changeView('orders', document.querySelector('.nav-item:nth-child(4)'));
        }
    } catch(e) { toast("⚠️ عطل فني"); }
}

async function handleLogin() {
    const phone = document.getElementById('login-phone').value, pass = document.getElementById('login-pass').value;
    try {
        const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone, pass }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); unlockApp(); }
        else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ عطل فني"); }
}

async function handleSignup() {
    const name = document.getElementById('reg-name').value, phone = document.getElementById('reg-phone').value, pass = document.getElementById('reg-pass').value;
    try {
        const res = await fetch(`${API}/api/auth/signup`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name, phone, pass }) });
        const data = await res.json();
        if(res.ok) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); unlockApp(); }
        else toast("❌ " + data.message);
    } catch(e) { toast("⚠️ عطل فني"); }
}

function unlockApp() {
    const splash = document.getElementById('splash');
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    
    if(splash) splash.style.display = "none";
    if(authScreen) authScreen.style.display = "none";
    if(mainApp) {
        mainApp.classList.remove('hidden');
        setTimeout(() => mainApp.style.opacity = "1", 50);
    }
    ui();
    initProducts();
    initGamesData();
}

async function initProducts() {
    try {
        const [prodRes, catRes] = await Promise.all([ fetch(`${API}/api/products`), fetch(`${API}/api/categories`) ]);
        state.prods = await prodRes.json(); state.categories = await catRes.json();
        renderCategories();
    } catch (e) { setTimeout(initProducts, 3000); }
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if(!grid) return;
    grid.innerHTML = state.categories.map(cat => `
        <div class="card-glass cursor-pointer" onclick="openCategory('${cat.name}')">
            <img src="${cat.img}" class="w-full h-20 object-cover rounded-xl mb-3">
            <h3 class="text-[10px] font-black text-white">${cat.name}</h3>
        </div>`).join('');
}

function openCategory(catName) {
    document.getElementById('current-cat-name').innerText = catName;
    changeView('category-details');
    const filtered = state.prods.filter(p => p.cat === catName);
    const prodGrid = document.getElementById('category-products-grid');
    prodGrid.innerHTML = filtered.map(p => `
        <div class="card-glass cursor-pointer" onclick="sheet('${p._id}')">
            <img src="${p.img}" class="w-full h-32 object-cover rounded-xl mb-3">
            <h3 class="text-xs font-bold text-white">${p.name}</h3>
            <p class="text-emerald-400 font-black mt-1 text-sm">${Number(p.price).toLocaleString()} YER</p>
        </div>`).join('');
}

function switchLayout() {
    state.layoutMode = (state.layoutMode + 1) % 3;
    const grid = document.getElementById('categories-grid'), icons = ["fa-table-cells", "fa-grip-lines-vertical", "fa-list-ul"];
    grid.className = `cards-container ${["mode-matrix", "mode-dual", "mode-list"][state.layoutMode]}`;
    document.getElementById('layoutIcon').className = `fa ${icons[state.layoutMode]} text-emerald-500`;
}

function sheet(id) {
    const p = state.prods.find(x => x._id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function addToCart(p) {
    let i = state.cart.find(x => x._id === p._id);
    if(i) i.qty++; else state.cart.push({...p, qty:1});
    toast("🛒 أضيف للسلة");
}

function toast(m) { 
    const t = document.getElementById('toast'); 
    t.innerText = m; t.classList.remove('hidden'); 
    setTimeout(() => t.classList.add('hidden'), 3000); 
}

function closeSheet() { 
    document.getElementById('product-sheet').style.bottom = "-100%"; 
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); 
}

function playSound(id) { 
    const s = document.getElementById(id); 
    if(s) { s.currentTime = 0; s.play().catch(()=>{}); } 
}

function toggleAuth() { 
    document.getElementById('login-box').classList.toggle('hidden'); 
    document.getElementById('signup-box').classList.toggle('hidden'); 
}
