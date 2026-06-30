const API = "https://0zk30qr9iu.onrender.com";
const STORE_PHONE = "967737528057";

let state = {
    prods: [], cart: [], 
    orders: JSON.parse(localStorage.getItem('abu_orders_v30')) || [],
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    cat: 'الكل'
};

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash').style.display = 'none';
            if (state.user) { unlockApp(); }
            else { document.getElementById('auth-screen').classList.remove('hidden'); }
        }, 800);
    }, 2000);
};

// تسجيل حساب جديد وربطه بالسيرفر
async function handleSignup() {
    const n = document.getElementById('reg-name').value, 
          p = document.getElementById('reg-phone').value, 
          ps = document.getElementById('reg-pass').value;

    if(!n || !p || !ps) return toast("⚠️ أكمل البيانات");

    const newUser = { name: n, phone: p, pass: ps, balance: 0 };

    try {
        const res = await fetch(`${API}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        
        if(res.ok) {
            state.user = { ...newUser, bal: 0 };
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ تم إنشاء الحساب بنجاح");
            unlockApp();
        }
    } catch (e) { toast("❌ فشل التسجيل"); }
}

function handleLogin() {
    const p = document.getElementById('login-phone').value, 
          ps = document.getElementById('login-pass').value;
    const saved = JSON.parse(localStorage.getItem('abu_user_v30'));
    if(saved && saved.phone === p && saved.pass === ps) { 
        state.user = saved; unlockApp(); 
    } else toast("❌ خطأ في رقم الهاتف أو كلمة المرور");
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    const app = document.getElementById('main-app');
    app.classList.remove('hidden');
    setTimeout(() => { app.style.opacity = "1"; ui(); }, 50);
    fetchProducts();
    syncUserData(); // تزامن الرصيد من السيرفر
}

async function syncUserData() {
    try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        const current = data.active_users.find(u => u.phone === state.user.phone);
        if(current) {
            state.user.bal = current.balance;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) {}
}

async function fetchProducts() {
    try {
        const res = await fetch(`${API}/api/products`);
        state.prods = await res.json();
        renderCats(); renderProds();
    } catch (e) { toast("⚠️ عطل في الاتصال بالسيرفر"); }
}

function ui() {
    if (!state.user) return;
    document.getElementById('u-balance').innerText = state.user.bal.toLocaleString();
    document.getElementById('u-balance-top').innerText = state.user.bal.toLocaleString() + " YER";
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

// ... بقية دوال السلة والعرض (نفس المنطق السابق مع تحسينات بصرية)
function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    if(b) b.classList.add('active');
    if(v === 'cart') renderCart();
}

function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}
