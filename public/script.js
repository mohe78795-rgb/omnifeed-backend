// ملف script.js المصحح للعمل بدون قاعدة بيانات حالياً
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

// --- البيانات الثابتة للألعاب (بديلة لقاعدة البيانات) ---
function initGamesData() {
    state.games = [
        {
            game_code: "PUBGM_GLOBAL",
            game_name: "ببجي موبايل",
            denominations: [
                { id: "60_uc", name: "60 شدة", price: 500 },
                { id: "300_uc", name: "300 شدة", price: 2500 }
            ]
        },
        {
            game_code: "FREEFIRE_GLOBAL",
            game_name: "فري فاير",
            denominations: [
                { id: "100_dia", name: "100 جوهرة", price: 400 },
                { id: "500_dia", name: "500 جوهرة", price: 1800 }
            ]
        }
    ];
    renderGamesMenu();
}

// --- تحديث واجهة المستخدم ---
function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal || 0).toLocaleString() + " YER";
    document.getElementById('acc-name-display').innerText = state.user.name;
    document.getElementById('acc-phone-display').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

// --- إدارة قسم الألعاب ---
function renderGamesMenu() {
    const grid = document.getElementById('games-list-grid');
    if(!grid) return;

    const gameIcons = {
        "PUBGM_GLOBAL": "https://img.icons8.com/color/144/pubg-drop-box.png",
        "FREEFIRE_GLOBAL": "https://img.icons8.com/color/144/free-fire.png"
    };

    grid.innerHTML = state.games.map(g => `
        <div class="card-glass p-5 flex flex-col items-center border border-white/5 active:scale-95 transition-all cursor-pointer" onclick="selectGameToTopup('${g.game_code}')">
            <img src="${gameIcons[g.game_code] || 'https://img.icons8.com/color/144/game-controller.png'}" class="w-16 h-16 object-contain mb-3">
            <h3 class="text-xs font-black text-white">${g.game_name}</h3>
        </div>
    `).join('');
}

function selectGameToTopup(code) {
    playSound('snd-click');
    state.selectedGame = state.games.find(g => g.game_code === code);
    document.getElementById('games-list-grid').classList.add('hidden');
    const panel = document.getElementById('game-topup-panel');
    panel.classList.remove('hidden');
    document.getElementById('selected-game-title').innerText = state.selectedGame.game_name;

    document.getElementById('game-denominations-list').innerHTML = state.selectedGame.denominations.map(pkg => `
        <div class="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 mb-2">
            <span class="text-sm font-black">${pkg.name}</span>
            <button onclick="toast('تم اختيار ${pkg.name} - يتطلب ربط سيرفر لإتمام الطلب')" class="px-4 py-2 bg-emerald-500 text-black text-xs font-black rounded-xl">
                ${pkg.price} YER
            </button>
        </div>
    `).join('');
}

function cancelGameSelection() {
    document.getElementById('game-topup-panel').classList.add('hidden');
    document.getElementById('games-list-grid').classList.remove('hidden');
}

// --- الخدمات ---
function changeView(v, b) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('view-' + v).classList.remove('hidden');
    if(v === 'games') renderGamesMenu();
}

function unlockApp() {
    document.getElementById('auth-screen').style.display = "none";
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('main-app').style.opacity = "1";
    ui();
    initGamesData(); // تحميل الألعاب فوراً
}

function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.play().catch(()=>{}); } }

