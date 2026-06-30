// الربط المباشر بالسيرفر (مثل رابط المنتجات تماماً)
const API = "https://0zk30qr9iu.onrender.com";

let state = {
    prods: [], 
    cart: [],
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    cat: 'الكل'
};

// 1. تشغيل النظام (مثل جلب المنتجات)
window.onload = () => {
    // إخفاء الشاشة الترحيبية
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) splash.style.opacity = '0';
        
        setTimeout(() => {
            if (splash) splash.style.display = 'none';
            
            // التحقق: هل المستخدم مسجل دخول في هذا المتصفح؟
            if (state.user) { 
                unlockApp(); 
            } else { 
                document.getElementById('auth-screen').classList.remove('hidden'); 
            }
        }, 800);
    }, 2000);
};

// 2. إنشاء حساب جديد (حفظ في السيرفر مثل إضافة منتج)
async function handleSignup() {
    const n = document.getElementById('reg-name').value.trim();
    const p = document.getElementById('reg-phone').value.trim();
    const ps = document.getElementById('reg-pass').value.trim();

    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات المطلوبة");

    try {
        const res = await fetch(`${API}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, phone: p, pass: ps, balance: 0 })
        });
        
        const data = await res.json();
        if(data.success) {
            // حفظ نسخة مؤقتة في المتصفح لسرعة الدخول مستقبلاً
            state.user = { name: n, phone: p, pass: ps, bal: 0 };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ تم تفعيل حسابك بنجاح");
            unlockApp();
        }
    } catch (e) {
        toast("❌ فشل الاتصال بالسيرفر");
    }
}

// 3. تسجيل الدخول (مطابق لطريقة جلب المنتجات)
async function handleLogin() {
    const p = document.getElementById('login-phone').value.trim();
    const ps = document.getElementById('login-pass').value.trim();

    if (!p || !ps) return toast("⚠️ يرجى إدخال البيانات");

    try {
        // جلب قائمة المستخدمين (مثل جلب المنتجات تماماً)
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        
        // البحث عن المستخدم داخل المصفوفة المستلمة من السيرفر
        const found = data.active_users.find(u => String(u.phone) === String(p) && String(u.pass) === String(ps));

        if (found) {
            state.user = { 
                name: found.name, 
                phone: found.phone, 
                pass: found.pass, 
                bal: found.balance || 0 
            };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ مرحباً بعودتك " + found.name);
            unlockApp();
        } else {
            toast("❌ بيانات الدخول غير صحيحة");
        }
    } catch (e) {
        toast("❌ عطل في سيرفر التحقق");
    }
}

// 4. فتح واجهة المتجر وجلب البيانات
function unlockApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    
    setTimeout(() => { 
        app.style.opacity = "1"; 
        ui(); // تحديث الاسم والرصيد في الشاشة
        fetchProducts(); // جلب المنتجات (الرابط الشغال)
        syncUserData(); // مزامنة الرصيد من السيرفر
    }, 50);

    // تحديث البيانات كل 10 ثواني لضمان دقة الرصيد
    setInterval(syncUserData, 10000);
}

// مزامنة رصيد المستخدم من ملف users.json بالسيرفر
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
    } catch(e) { console.log("تزامن البيانات متوقف"); }
}

// 5. جلب المنتجات (الرابط الذي يعمل عندك)
async function fetchProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); 
        renderProds();
    } catch (e) {
        toast("⚠️ فشل تحميل المنتجات");
    }
}

// تحديث النصوص في الواجهة
function ui() {
    if (!state.user) return;
    const balance = state.user.bal || 0;
    
    document.getElementById('u-balance').innerText = balance.toLocaleString();
    document.getElementById('u-balance-top').innerText = balance.toLocaleString() + " YER";
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('acc-name-display').innerText = state.user.name;
    
    const avatar = document.getElementById('u-avatar');
    if (avatar) avatar.innerText = state.user.name.charAt(0).toUpperCase();
}

// --- بقية وظائف المتجر (السلة، البحث، التصنيفات) ---
function setCat(c) { state.cat = c; renderCats(); renderProds(); }

function renderCats() {
    const cats = ['الكل', ...new Set(state.prods.map(p => p.cat))];
    const container = document.getElementById('cat-list');
    if(!container) return;
    container.innerHTML = cats.map(c => `
        <button onclick="setCat('${c}')" class="px-6 py-3 bg-white/5 rounded-2xl whitespace-nowrap text-xs font-bold ${state.cat === c ? 'bg-emerald-500 text-black' : ''}">
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
            <p class="text-emerald-500 font-black text-sm">${parseInt(p.price).toLocaleString()} YER</p>
        </div>`).join('');
}

function toggleAuth() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

function logout() {
    localStorage.removeItem('abu_user_v30');
    location.reload();
}

function toast(m) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = m;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
}
// دوال السلة (Sheet) والبحث تضاف هنا كما هي في كودك السابق...
