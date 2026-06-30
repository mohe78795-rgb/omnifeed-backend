const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

// الحالة العامة للتطبيق
let state = {
    prods: [], 
    cart: [], 
    user: { name: "عميل أبو حسين", phone: "737528057", bal: 25000 },
    orders: JSON.parse(localStorage.getItem('abu_orders')) || [],
    cat: 'الكل'
};

window.onload = () => {
    // محاكاة شاشة التمهيد
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            const app = document.getElementById('main-app');
            app.classList.remove('hidden');
            setTimeout(() => { app.style.opacity = "1"; init(); }, 50);
        }, 700);
    }, 2000);
};

async function init() {
    ui();
    initGoldParticles();
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); 
        renderProds();
    } catch (e) { toast("⚠️ عطل في جلب البيانات"); }
}

function ui() {
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    updateBadge();
}

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    document.getElementById('cat-list').innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-6 py-3 bg-[#0a101e] rounded-2xl whitespace-nowrap text-[11px] font-black uppercase transition-all ${state.cat === c ? 'bg-emerald-500 !text-black shadow-lg' : 'text-slate-500 border border-white/5'}">
            ${c}
        </button>`).join('');
}

function renderProds(data = state.prods) {
    const grid = document.getElementById('products-grid');
    let filtered = state.cat === 'الكل' ? data : data.filter(p => p.cat === state.cat);
    
    grid.innerHTML = filtered.map(p => `
        <div class="bg-[#0a101e] p-4 rounded-[2rem] border border-white/5 active:scale-95 transition-all text-right shadow-xl" onclick="sheet(${p.id})">
            <div class="h-32 rounded-2xl bg-cover bg-center mb-3" style="background-image: url('${p.img}')"></div>
            <h4 class="text-[12px] font-black truncate text-white">${p.name}</h4>
            <div class="flex justify-between items-center mt-2">
                <span class="text-emerald-400 font-black text-sm">${parseInt(p.price).toLocaleString()}</span>
                <i class="fas fa-plus-circle text-emerald-500 text-lg"></i>
            </div>
        </div>`).join('');
}

function searchInHome() {
    const term = document.getElementById('home-search').value.toLowerCase();
    const res = state.prods.filter(p => p.name.toLowerCase().includes(term));
    renderProds(res);
}

function sheet(id) {
    const p = state.prods.find(x => x.id == id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = parseInt(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
    playSound('snd-click');
}

function closeSheet() {
    document.getElementById('product-sheet').style.bottom = "-100%";
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500);
}

function addToCart(p) {
    const item = state.cart.find(i => i.id === p.id);
    if (item) item.qty++; else state.cart.push({ ...p, qty: 1 });
    updateBadge();
    toast("🛒 تم الإضافة للسلة");
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
        return `
        <div class="bg-[#0a101e] p-5 rounded-[2rem] flex justify-between items-center border border-white/5">
            <div class="flex items-center gap-3">
                <img src="${i.img}" class="w-12 h-12 rounded-xl object-cover">
                <div><h4 class="text-xs font-black">${i.name}</h4><span class="text-emerald-500 font-bold text-[10px]">${i.price} YER</span></div>
            </div>
            <div class="flex items-center gap-3 bg-black/50 p-1 rounded-xl">
                <button onclick="updateQty(${i.id}, -1)" class="w-7 h-7 rounded-lg bg-white/5 font-black">-</button>
                <span class="text-xs font-black w-4 text-center">${i.qty}</span>
                <button onclick="updateQty(${i.id}, 1)" class="w-7 h-7 rounded-lg bg-emerald-500 text-black font-black">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
}

function updateQty(id, delta) {
    const i = state.cart.find(x => x.id == id);
    if (i) {
        i.qty += delta;
        if (i.qty <= 0) state.cart = state.cart.filter(x => x.id != id);
        renderCart(); updateBadge();
    }
}

function updateBadge() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    const b = document.getElementById('cart-badge');
    if(count > 0) { b.innerText = count; b.classList.remove('hidden'); } else b.classList.add('hidden');
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(v === 'cart') renderCart();
    if(v === 'orders') renderOrders();
    playSound('snd-click');
}

async function processBalanceOrder() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if (!total) return toast("⚠️ السلة فارغة");
    if (state.user.bal < total) return toast("❌ الرصيد غير كافٍ");

    state.user.bal -= total;
    const newOrder = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        total: total,
        date: new Date().toLocaleDateString('ar-EG'),
        status: "جاري التجهيز",
        items: [...state.cart]
    };
    state.orders.unshift(newOrder);
    localStorage.setItem('abu_orders', JSON.stringify(state.orders));
    state.cart = [];
    ui();
    toast("✅ تم تنفيذ طلبك من الرصيد");
    triggerPushNotif("تم استلام طلبك بنجاح وبدأنا التجهيز!");
    changeView('orders');
    document.getElementById('snd-cashier').play();
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!state.orders.length) return list.innerHTML = "<div class='text-center py-20 opacity-20 font-black'>لا يوجد طلبات سابقة</div>";
    list.innerHTML = state.orders.map(o => `
        <div class="p-6 bg-[#0a101e] rounded-[2rem] border border-white/5 space-y-4">
            <div class="flex justify-between items-start">
                <div><p class="text-[10px] text-emerald-500 font-black">طلب رقم #${o.id}</p><h3 class="text-sm font-black text-white">${o.date}</h3></div>
                <span class="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-lg">${o.status}</span>
            </div>
            <div class="border-t border-white/5 pt-3">
                <p class="text-[10px] text-slate-500 font-bold">المجموع: <span class="text-white">${o.total.toLocaleString()} YER</span></p>
            </div>
        </div>`).join('');
}

function openLocationModal() { if(!state.cart.length) return toast("⚠️ السلة فارغة"); document.getElementById('location-modal').classList.remove('hidden'); }
function closeLocationModal() { document.getElementById('location-modal').classList.add('hidden'); }

function triggerGPSProcess() {
    toast("⚙️ جاري تحديد الموقع...");
    navigator.geolocation.getCurrentPosition((pos) => {
        const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const msg = `طلب جديد عبر واتساب:\nالمجموع: ${total} YER\nالموقع: ${link}`;
        window.open(`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
        closeLocationModal();
    }, () => toast("❌ يرجى تفعيل الـ GPS"));
}

function triggerPushNotif(msg) {
    const n = document.getElementById('top-push-notif');
    document.getElementById('notif-text').innerText = msg;
    n.style.top = "20px";
    setTimeout(() => n.style.top = "-150px", 4000);
}

function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function playSound(id) { document.getElementById(id).play().catch(()=>{}); }

function initGoldParticles() {
    const canvas = document.getElementById('gold-particles');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    let particles = Array(20).fill().map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, v: Math.random() * 0.5 }));
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
        particles.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, Math.PI*2); ctx.fill();
            p.y -= p.v; if(p.y < 0) p.y = canvas.height;
        });
        requestAnimationFrame(draw);
    }
    draw();
}
