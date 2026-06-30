const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

let state = {
    prods: [], cart: [], 
    orders: JSON.parse(localStorage.getItem('abu_orders_v29')) || [],
    user: JSON.parse(localStorage.getItem('abu_user_v29')) || null,
    cat: 'الكل'
};

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) { unlockApp(); }
            else { 
                document.getElementById('auth-screen').classList.remove('hidden'); 
                document.getElementById('auth-screen').classList.add('flex'); 
            }
        }, 800);
    }, 1500);
};

function toggleAuth() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

function handleSignup() {
    const n = document.getElementById('reg-name').value;
    const p = document.getElementById('reg-phone').value;
    const ps = document.getElementById('reg-pass').value;
    
    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات");
    
    state.user = { name: n, phone: p, pass: ps, bal: 5000 };
    localStorage.setItem('abu_user_v29', JSON.stringify(state.user));
    toast("✅ تم إنشاء الحساب");
    unlockApp();
}

function handleLogin() {
    const p = document.getElementById('login-phone').value;
    const ps = document.getElementById('login-pass').value;
    const saved = JSON.parse(localStorage.getItem('abu_user_v29'));

    if(saved && saved.phone === p && saved.pass === ps) {
        state.user = saved;
        unlockApp();
    } else toast("❌ خطأ في البيانات");
}

function unlockApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('flex');
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); 
        initGoldParticles(); 
        init(); 
    }, 50);
}

async function init() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch (e) { toast("⚠️ عطل في البيانات"); }
}

function ui() {
    if (!state.user) return;
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    badge();
}

function changeView(v, b) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    
    if(b) b.classList.add('active');
    else {
        const btn = document.getElementById('nav-' + v);
        if(btn) btn.classList.add('active');
    }
    
    if (v === 'cart') renderCart();
    if (v === 'orders') renderOrders();
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `<button onclick="setCat('${c}')" class="px-7 py-3.5 bg-[#0a101e] rounded-2xl whitespace-nowrap text-[11px] font-black transition-all ${state.cat === c ? 'bg-emerald-500 text-black' : 'text-slate-500 border border-white/5'}">${c}</button>`).join('');
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    let filtered = state.cat === 'الكل' ? data : data.filter(p => p.cat === state.cat);
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-5 rounded-[2rem] border border-white/5 active:scale-95 transition-all text-right shadow-xl" onclick="sheet('${p.id}')">
            <div class="h-32 rounded-2xl bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-3"><span class="text-emerald-400 font-black">${parseInt(p.price).toLocaleString()}</span><i class="fas fa-plus-circle text-emerald-500"></i></div>
        </div>`).join('');
}

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
    badge(); toast("🛒 تمت الإضافة");
}

function badge() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const b = document.getElementById('cart-badge');
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); } else b.classList.add('hidden');
}

function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0;
    if (!state.cart.length) { 
        list.innerHTML = "<div class='text-center py-10 opacity-20 font-black'>السلة فارغة</div>"; 
        document.getElementById('cart-total').innerText = "0 YER"; 
        return; 
    }
    list.innerHTML = state.cart.map(i => {
        total += (i.price * i.qty);
        return `<div class="bg-[#0a101e] p-4 rounded-2xl flex justify-between items-center border border-white/5">
            <div class="flex items-center gap-3">
                <img src="${i.img}" class="w-10 h-10 rounded-lg object-cover">
                <div><h4 class="text-xs font-black">${i.name}</h4><span class="text-emerald-500 text-[10px]">${i.price} YER</span></div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="updateQty(${i.id}, -1)" class="w-6 h-6 bg-white/5 rounded">-</button>
                <span class="text-xs font-black">${i.qty}</span>
                <button onclick="updateQty(${i.id}, 1)" class="w-6 h-6 bg-emerald-500 text-black rounded">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function updateQty(id, d) {
    const i = state.cart.find(x => x.id == id);
    if(i) { i.qty += d; if(i.qty <=0) state.cart = state.cart.filter(x=>x.id!=id); renderCart(); badge(); }
}

function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if(!total) return toast("⚠️ السلة فارغة");
    if(state.user.bal < total) return toast("❌ رصيد غير كافٍ");
    
    state.user.bal -= total;
    state.orders.unshift({ id: Math.random().toString(36).substr(2,5).toUpperCase(), total, date: new Date().toLocaleDateString('ar-EG'), status: 'قيد التجهيز' });
    localStorage.setItem('abu_orders_v29', JSON.stringify(state.orders));
    localStorage.setItem('abu_user_v29', JSON.stringify(state.user));
    state.cart = [];
    ui(); changeView('orders');
    document.getElementById('snd-cashier').play();
    toast("✅ تم تنفيذ طلبك");
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!state.orders.length) return list.innerHTML = "<div class='text-center py-10 opacity-20 font-black'>لا يوجد طلبات</div>";
    list.innerHTML = state.orders.map(o => `<div class="p-5 bg-[#0a101e] rounded-3xl border border-white/5 flex justify-between items-center"><div><p class="text-[10px] text-emerald-500 font-black">#${o.id}</p><h4 class="text-sm font-black">${o.total.toLocaleString()} YER</h4></div><span class="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">${o.status}</span></div>`).join('');
}

function setCat(c) { state.cat = c; renderCats(); renderProds(); }
function logout() { localStorage.removeItem('abu_user_v29'); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function playSound(id) { document.getElementById(id).play().catch(()=>{}); }

function initGoldParticles() {
    const canvas = document.getElementById('gold-particles'); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight;
    let ps = Array(20).fill().map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, v: Math.random() * 0.5 }));
    function draw() { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "#10b98111"; ps.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, Math.PI*2); ctx.fill(); p.y -= p.v; if(p.y < 0) p.y = canvas.height; }); requestAnimationFrame(draw); }
    draw();
}
