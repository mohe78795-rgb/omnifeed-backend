const API = window.location.origin;
let state = {
    categories: [], prods: [], cart: [], layoutMode: 0,
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [], selectedGame: null, selectedDenom: null
};

let videoPlayer;

// استخراج ID يوتيوب
function getYTId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

// تحديث الإعلانات بالفيديو المطور
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            const vidId = getYTId(ads[0].videoUrl);
            if (!videoPlayer) {
                videoPlayer = new Plyr('#player', {
                    controls: [], autoplay: true, muted: true, loop: { active: true },
                    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
                });
            }
            videoPlayer.source = { type: 'video', sources: [{ src: vidId, provider: 'youtube' }] };
            container.classList.remove('hidden');
        }
    } catch(e) { console.log("Ad Error"); }
}

function toggleMute() {
    if (videoPlayer) {
        videoPlayer.muted = !videoPlayer.muted;
        document.getElementById('mute-icon').className = videoPlayer.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
}

// نظام الدردشة المطور
async function fetchMessages() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/messages/${state.user.phone}`);
        const data = await res.json();
        const list = document.getElementById('messages-list');
        if(data && data.length > 0) {
            list.innerHTML = data.map(m => {
                const isAdmin = m.sender === "ADMIN";
                return `
                <div class="flex ${isAdmin ? 'justify-start' : 'justify-end'} animate-fadeIn">
                    <div class="max-w-[80%] p-3 ${isAdmin ? 'bg-white/10 rounded-t-2xl rounded-bl-2xl border border-white/5' : 'bg-emerald-600 text-black rounded-t-2xl rounded-br-2xl'}">
                        <p class="text-[11px] font-bold">${m.body}</p>
                        <span class="text-[7px] opacity-40 block mt-1">${m.date}</span>
                    </div>
                </div>`;
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
    } catch(e) { console.log("Chat Error"); }
}

async function sendUserMessage() {
    const inp = document.getElementById('chat-input');
    const msg = inp.value.trim();
    if(!msg) return;
    try {
        const res = await fetch(`${API}/api/messages/user-send`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender: state.user.phone, body: msg })
        });
        if(res.ok) { inp.value = ""; fetchMessages(); playSound('snd-click'); }
    } catch(e) { toast("❌ فشل الإرسال"); }
}

// الوظائف الأساسية للمتجر (معدلة)
async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui(); await initProducts(); await fetchAds(); await fetchGames(); await fetchMessages();
}

function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
    document.getElementById('acc-date').innerText = state.user.joinDate;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    document.getElementById('acc-avatar-large').innerText = state.user.name.charAt(0);

    const cartList = document.getElementById('cart-list');
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
    if(state.cart.length > 0) {
        cartList.innerHTML = state.cart.map(i => `
            <div class="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                <div><h4 class="font-bold text-sm">${i.name}</h4><p class="text-xs text-emerald-400">${(i.price*i.qty).toLocaleString()} YER</p></div>
                <div class="flex gap-3 bg-black/40 px-3 py-1 rounded-xl">
                    <button onclick="updateQty('${i._id}', -1)">-</button><span>${i.qty}</span><button onclick="updateQty('${i._id}', 1)">+</button>
                </div>
            </div>`).join('');
    } else cartList.innerHTML = `<div class="text-center py-10 text-xs opacity-30">السلة فارغة</div>`;
}

// تكملة الدوال الأساسية (سريعة ومختصرة)
async function initProducts() { 
    let c = await (await fetch(`${API}/api/categories`)).json(); state.categories = c;
    let p = await (await fetch(`${API}/api/products`)).json(); state.prods = p;
    renderCategories();
}
function renderCategories() {
    document.getElementById('categories-list').innerHTML = state.categories.map(c => `
    <div onclick="openCategory('${c.name}')" class="card-glass">
        <img src="${c.img}" class="w-full h-32 object-cover rounded-2xl mb-3">
        <h3 class="font-black text-sm">${c.name}</h3>
    </div>`).join('');
}
function openCategory(n) {
    document.getElementById('cat-title-display').innerText = n;
    const filtered = state.prods.filter(p => p.cat === n);
    document.getElementById('products-list').innerHTML = filtered.map(p => `
    <div onclick="openProductSheet('${p._id}')" class="p-4 bg-white/5 rounded-3xl flex gap-4 items-center">
        <img src="${p.img}" class="w-20 h-20 object-cover rounded-2xl">
        <div class="flex-1"><h3 class="font-black text-sm">${p.name}</h3><p class="text-xs text-emerald-400 font-bold">${p.price.toLocaleString()} YER</p></div>
    </div>`).join('');
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-products').classList.remove('hidden');
}
function openProductSheet(id) {
    const p = state.prods.find(x => x._id === id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = p.price.toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}
function addToCart(p) { let i = state.cart.find(x => x._id === p._id); if(i) i.qty++; else state.cart.push({...p, qty:1}); ui(); toast("🛒 تمت الإضافة"); }
function updateQty(id, d) { let i = state.cart.find(x => x._id === id); if(i) { i.qty += d; if(i.qty <= 0) state.cart = state.cart.filter(x => x._id !== id); ui(); } }
async function checkout() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ الرصيد غير كافٍ");
    let res = await fetch(`${API}/api/orders/add`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } }) });
    if(res.ok) { let d = await res.json(); state.cart = []; state.user.bal = d.currentBal; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); ui(); toast("✅ تم الطلب"); changeView('orders'); }
}
async function loadOrders() {
    let orders = await (await fetch(`${API}/api/orders/${state.user.phone}`)).json();
    document.getElementById('orders-list').innerHTML = orders.map(o => `
    <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
        <div class="flex justify-between text-xs mb-2"><span class="text-emerald-400 font-bold">${o.id}</span><span>${o.status}</span></div>
        <div class="text-[10px] opacity-60">${o.items.map(i => i.name).join(', ')}</div>
        <div class="mt-2 text-sm font-bold text-left">${o.total.toLocaleString()} YER</div>
    </div>`).join('');
}
async function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    if(v === 'orders') loadOrders();
    if(v === 'notifications') fetchMessages();
}
async function sync() {
    try {
        let res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        let d = await res.json(); if(d.success) { state.user = d.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); ui(); }
    } catch(e) {}
}
async function handleAuth() {
    const isS = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value, phone = document.getElementById('auth-phone').value, pass = document.getElementById('auth-pass').value;
    let url = isS ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    let res = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name, phone, pass }) });
    let d = await res.json(); if(d.success) { state.user = d.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); unlockApp(); } else toast(d.message);
}
function toggleAuthMode() {
    const c = document.getElementById('signup-name-container'), t = document.getElementById('auth-title'), b = document.getElementById('auth-btn');
    c.classList.toggle('hidden');
    t.innerText = c.classList.contains('hidden') ? "تسجيل الدخول" : "إنشاء حساب";
    b.innerText = c.classList.contains('hidden') ? "دخول آمن" : "تسجيل جديد";
}
function setLayout(m) { 
    const l = document.getElementById('categories-list'); l.className = "cards-container " + (m==0?'mode-dual':m==1?'mode-matrix':'mode-list');
    document.querySelectorAll('[id^="btn-layout-"]').forEach((x,i) => { x.className = i==m ? "px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-black transition" : "px-3 py-1.5 rounded-xl text-xs font-black text-slate-400 transition" });
}

// شحن الألعاب (مختصر)
async function fetchGames() {
    let d = await (await fetch(`${API}/api/games`)).json(); if(d.success) {
        state.games = d.game_list;
        document.getElementById('games-list').innerHTML = state.games.map(g => `<div onclick="selectGame('${g.game_code}')" class="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center"><div><h4 class="font-bold text-sm">${g.game_name}</h4><p class="text-[10px] text-emerald-400">شحن آلي ⚡</p></div><i class="fas fa-chevron-left"></i></div>`).join('');
    }
}
function selectGame(c) {
    const g = state.games.find(x => x.game_code === c); state.selectedGame = g;
    document.getElementById('selected-game-title').innerText = g.game_name;
    document.getElementById('game-denoms-list').innerHTML = g.denominations.map(d => `<div onclick="pickDenom(this, '${d.id}')" class="p-3 bg-black/40 border border-white/5 rounded-xl text-center"><p class="text-xs font-bold">${d.name}</p><p class="text-[10px] text-emerald-400">${d.price} YER</p></div>`).join('');
    document.getElementById('game-topup-panel').classList.remove('hidden');
}
function pickDenom(el, id) {
    document.querySelectorAll('#game-denoms-list div').forEach(x => x.classList.remove('border-emerald-500', 'bg-emerald-500/10'));
    el.classList.add('border-emerald-500', 'bg-emerald-500/10');
    state.selectedDenom = state.selectedGame.denominations.find(x => x.id === id);
}
async function processGameTopup() {
    const id = document.getElementById('game-player-id').value; if(!id || !state.selectedDenom) return;
    let res = await fetch(`${API}/api/games/topup`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: state.user.phone, price: state.selectedDenom.price, game_code: state.selectedGame.game_code, user_id: id, denomination_id: state.selectedDenom.id }) });
    let d = await res.json(); if(d.success) { state.user.bal = d.currentBal; ui(); toast("✅ تم الشحن بنجاح"); document.getElementById('game-topup-panel').classList.add('hidden'); } else toast(d.message);
}

// وظائف مساعدة
function manualRefresh() { sync(); initProducts(); fetchAds(); fetchMessages(); toast("🔄 تم التحديث"); }
function logout() { localStorage.clear(); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(e=>{}); } }

window.onload = () => { setTimeout(() => { if (state.user) unlockApp(); else { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); } }, 2000); };
