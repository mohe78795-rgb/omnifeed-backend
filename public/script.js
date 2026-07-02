// ملف script.js الكامل والمصحح
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
        else document.getElementById('auth-screen').classList.remove('hidden');
    }, 2000);
};

// --- تحديث واجهة المستخدم الشامل ---
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
                <div class="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 animate-fadeIn mb-2">
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

function removeFromCart(id) {
    state.cart = state.cart.filter(x => x._id !== id);
    ui();
    toast("🗑️ تم الحذف من السلة");
}

// --- تبديل الشاشات ---
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

// --- إدارة قسم الألعاب ---
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
        <div class="card-glass p-5 animate-fadeIn shadow-xl flex flex-col items-center border border-white/5 active:scale-95 transition-all" onclick="selectGameToTopup('${g.game_code}')">
            <img src="${gameIcons[g.game_code] || 'https://img.icons8.com/color/144/game-controller.png'}" class="w-16 h-16 object-contain mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <h3 class="text-xs font-black text-white">${g.game_name}</h3>
            <span class="text-[8px] text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">شحن آمن</span>
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
        <div class="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all mb-2">
            <div class="text-right">
                <span class="text-sm font-black text-white block">${pkg.name}</span>
                <span class="text-[10px] text-slate-400">كود الفئة: ${pkg.id}</span>
            </div>
            <button onclick="sendTopupRequest('${pkg.id}', ${pkg.price})" class="px-4 py-2 bg-emerald-500 text-black text-xs font-black rounded-xl active:scale-90 transition-all shadow-md shadow-emerald-500/10">
                ${Number(pkg.price).toLocaleString()} YER
            </button>
        </div>
    `).join('');
}

function cancelGameSelection() {
    state.selectedGame = null;
    document.getElementById('game-player-id').value = '';
    document.getElementById('player-name-display').innerText = '';
    document.getElementById('game-topup-panel').classList.add('hidden');
    document.getElementById('games-list-grid').classList.remove('hidden');
}

async function validatePlayer() {
    playSound('snd-click');
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ أدخل معرف اللاعب");
    
    document.getElementById('player-name-display').innerText = "جاري الفحص...";

    try {
        const res = await fetch(`${API}/api/games/validate-user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ game_code: state.selectedGame.game_code, user_id: id })
        });
        const data = await res.json();
        if(data.success) {
            document.getElementById('player-name-display').innerText = `اسم الحساب: ${data.player_name} ✅`;
        } else {
            document.getElementById('player-name-display').innerText = "فشل التعرف على المعرف";
        }
    } catch(e) { toast("⚠️ خطأ في الاتصال"); }
}

async function sendTopupRequest(pkgId, price) {
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ أدخل معرف اللاعب");
    if(state.user.bal < price) return toast("❌ رصيد غير كافٍ");

    if(!confirm(`تأكيد الشحن بقيمة ${price} ريال؟`)) return;

    try {
        const res = await fetch(`${API}/api/games/topup`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, game_code: state.selectedGame.game_code, user_id: id, denomination_id: pkgId, price: price })
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

// --- خدمات عامة ---
async function fetchOrders() {
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const orders = await res.json();
        const list = document.getElementById('orders-list');
        if(res.ok && orders.length > 0) {
            list.innerHTML = orders.map(o => `
                <div class="p-5 bg-[#0a101e] rounded-2xl border border-white/5 mb-3 space-y-2 animate-fadeIn shadow-xl text-right">
                    <div class="flex justify-between text-[10px] opacity-50"><span>${o.date}</span></div>
                    <div class="font-bold text-lg">${Number(o.total).toLocaleString()} YER</div>
                    <div class="text-[10px] text-emerald-400 font-black">${o.status}</div>
                </div>`).join('');
        }
    } catch(e) { console.error("Orders Error"); }
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('main-app').style.opacity = "1";
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
    grid.innerHTML = state.categories.map(cat => `
        <div class="card-glass" onclick="openCategory('${cat.name}')">
            <img src="${cat.img}" class="w-full h-20 object-cover rounded-xl mb-3">
            <h3 class="text-[10px] font-black text-white">${cat.name}</h3>
        </div>`).join('');
}

function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(()=>{}); } }
function logout() { localStorage.clear(); location.reload(); }
//[span_1](start_span)[span_1](end_span)

