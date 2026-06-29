const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

// رفع حد حجم البيانات المستقبلة لاستقبال صور المعرض الكبيرة (Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = './db.json', 
      USERS_PATH = './users.json', 
      ORDERS_PATH = './orders.json', 
      SETTINGS_PATH = './settings.json';

const initFile = (p, d) => { if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(d, null, 2)); };
initFile(USERS_PATH, { active_users: [] }); 
initFile(ORDERS_PATH, []); 
initFile(DB_PATH, []);
initFile(SETTINGS_PATH, { news: "مرحباً بكم في سوبر ماركت أبو حسين", banners: ["https://i.postimg.cc/D8RhYN2t/image.png"], popup: "" });

const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJ = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

// API Settings
app.get('/api/settings', (req, res) => res.json(readJ(SETTINGS_PATH)));
app.post('/api/settings', (req, res) => { writeJ(SETTINGS_PATH, req.body); res.json({success:true}); });

// API Products
app.get('/api/products', (req, res) => res.json(readJ(DB_PATH)));
app.post('/api/products', (req, res) => {
    let data = readJ(DB_PATH);
    data.push({ id: Date.now().toString(), stock: 10, oldPrice: 0, unit: "حبة", ...req.body });
    writeJ(DB_PATH, data); res.json({ success: true });
});
app.post('/api/products/delete', (req, res) => {
    let data = readJ(DB_PATH).filter(p => p.id.toString() !== req.body.id.toString());
    writeJ(DB_PATH, data); res.json({ success: true });
});

// API Users & Sync
app.post('/api/sync-user', (req, res) => {
    const { uuid, name } = req.body;
    let data = readJ(USERS_PATH);
    let user = data.active_users.find(u => u.uuid === uuid);
    if (!user) { 
        user = { uuid, name, balance: 0, history: [], last_seen: getTime() }; 
        data.active_users.push(user); 
        writeJ(USERS_PATH, data); 
    }
    res.json({ user });
});

app.get('/api/users', (req, res) => res.json(readJ(USERS_PATH)));

app.post('/api/users/update-balance', (req, res) => {
    let data = readJ(USERS_PATH);
    let user = data.active_users.find(u => u.uuid === req.body.uuid);
    if (user) {
        user.balance = parseInt(req.body.balance);
        user.history.push({ t: "تعديل رصيد", a: req.body.balance, d: getTime() });
        writeJ(USERS_PATH, data); res.json({ success: true });
    } else res.status(404).send("User Not Found");
});

// API Orders
app.post('/api/orders', (req, res) => {
    let users = readJ(USERS_PATH), prods = readJ(DB_PATH), orders = readJ(ORDERS_PATH);
    let user = users.active_users.find(u => u.uuid === req.body.uuid);

    if (user && user.balance >= req.body.totalAmount) {
        user.balance -= req.body.totalAmount;
        user.history.push({ t: "طلب منتجات", a: -req.body.totalAmount, d: getTime() });

        if (req.body.rawItems) {
            req.body.rawItems.forEach(ri => {
                let p = prods.find(x => x.name === ri.n);
                if(p) p.stock = Math.max(0, p.stock - ri.q);
            });
        }

        orders.push({ orderId: Date.now(), ...req.body, status: "⏳ انتظار", time: getTime() });
        
        writeJ(USERS_PATH, users); 
        writeJ(DB_PATH, prods); 
        writeJ(ORDERS_PATH, orders);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "رصيدك غير كافٍ أو المستخدم غير موجود" });
    }
});

app.get('/api/orders_list', (req, res) => res.json(readJ(ORDERS_PATH)));

app.post('/api/orders/update-status', (req, res) => {
    let data = readJ(ORDERS_PATH);
    let order = data.find(o => o.orderId == req.body.id);
    if(order) { order.status = req.body.status; writeJ(ORDERS_PATH, data); res.json({success:true}); }
    else res.status(404).send("Order Not Found");
});

app.get('/api/admin/stats', (req, res) => {
    let orders = readJ(ORDERS_PATH);
    let total = orders.filter(o=>o.status==="✅ تم").reduce((sum, o) => sum + (parseInt(o.totalAmount) || 0), 0);
    res.json({ totalSales: total, orderCount: orders.length });
});

// الحل الحاسم: إرسال واجهة لوحة التحكم مباشرة من السيرفر لضمان عدم حدوث خطأ المسار مجدداً
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة تحكم تموينات أبو حسين | التحكم الذكي</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; background: #05070a; color: white; }
        .royal-input { 
            width: 100%; background: rgba(255, 255, 255, 0.02); 
            border: 1px solid rgba(255, 255, 255, 0.08); 
            border-radius: 1.2rem; padding: 1.2rem; 
            color: white; outline: none; text-align: right; font-size: 14px;
        }
        .royal-input:focus { border-color: #10b981; }
        .btn-royal { 
            background: linear-gradient(135deg, #10b981, #059669); 
            color: #000; border: none; transition: 0.3s; font-weight: 900;
        }
        .btn-royal:active { transform: scale(0.96); }
        .luxury-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 2rem; padding: 1.5rem;
        }
    </style>
</head>
<body class="p-4 max-w-2xl mx-auto pb-20">

    <header class="flex justify-between items-center my-6 border-b border-white/5 pb-4">
        <div class="text-right">
            <span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">لوحة الإدارة الرئيسية</span>
            <h1 class="text-2xl font-black text-white">التحكم الذكي بالمتجر</h1>
        </div>
        <div class="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-xl">
            <i class="fas fa-sliders"></i>
        </div>
    </header>

    <div class="grid grid-cols-2 gap-4 mb-8">
        <div class="luxury-card text-center">
            <i class="fas fa-chart-line text-emerald-500 text-xl mb-2"></i>
            <p class="text-xs text-slate-400">إجمالي المبيعات</p>
            <h3 id="stat-sales" class="text-xl font-black mt-1 text-emerald-400">0 YER</h3>
        </div>
        <div class="luxury-card text-center">
            <i class="fas fa-boxes-stacked text-blue-500 text-xl mb-2"></i>
            <p class="text-xs text-slate-400">عدد الطلبات</p>
            <h3 id="stat-orders" class="text-xl font-black mt-1 text-white">0</h3>
        </div>
    </div>

    <section class="luxury-card space-y-5">
        <h2 class="text-lg font-black text-white border-r-4 border-emerald-500 pr-3 mb-4">إضافة منتج جديد للمتجر</h2>
        
        <form id="add-product-form" class="space-y-4" onsubmit="handleFormSubmit(event)">
            <div>
                <input type="text" id="p-name" class="royal-input" placeholder="اسم المنتج (مثال: علف تسمين)" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <input type="number" id="p-price" class="royal-input" placeholder="السعر (YER)" required>
                <input type="text" id="p-cat" class="royal-input" placeholder="القسم (مثال: أعلاف، معلبات)" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <input type="number" id="p-stock" class="royal-input" placeholder="الكمية المتوفرة بالمخزن" value="10">
                <input type="text" id="p-unit" class="royal-input" placeholder="الوحدة (حبة، كيس، كرتون)" value="حبة">
            </div>

            <div class="space-y-2">
                <label class="text-xs font-bold text-slate-400 block pr-2">صورة المنتج من معرض الهاتف:</label>
                <input type="file" id="p-img-file" accept="image/*" class="royal-input" style="padding: 0.8rem;" required>
            </div>

            <button type="submit" class="btn-royal w-full py-4 rounded-xl text-md shadow-lg mt-2 flex items-center justify-center gap-2">
                <i class="fas fa-plus-circle"></i> رفع وحفظ المنتج بالمتجر
            </button>
        </form>
    </section>

    <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-6 py-3 rounded-full text-xs font-black hidden shadow-2xl z-50"></div>

    <script>
        async function loadStats() {
            try {
                const res = await fetch('/api/admin/stats');
                const data = await res.json();
                document.getElementById('stat-sales').innerText = data.totalSales.toLocaleString() + " YER";
                document.getElementById('stat-orders').innerText = data.orderCount;
            } catch (e) {
                console.error("خطأ في جلب الإحصائيات");
            }
        }

        function convertFileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }

        async function handleFormSubmit(event) {
            event.preventDefault();
            
            const name = document.getElementById('p-name').value;
            const price = document.getElementById('p-price').value;
            const cat = document.getElementById('p-cat').value;
            const stock = document.getElementById('p-stock').value;
            const unit = document.getElementById('p-unit').value;
            const imgFile = document.getElementById('p-img-file').files[0];

            if(!imgFile) return showToast("⚠️ يرجى اختيار صورة من المعرض");

            showToast("⚙️ جاري معالجة ورفع الصورة...");

            try {
                const base64Image = await convertFileToBase64(imgFile);

                const productData = { name, price: parseInt(price), cat, stock: parseInt(stock), unit, img: base64Image };

                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });

                const result = await response.json();

                if(result.success) {
                    showToast("✅ تم حفظ المنتج وصورته بنجاح!");
                    document.getElementById('add-product-form').reset();
                    loadStats();
                } else {
                    showToast("❌ فشل حفظ المنتج");
                }
            } catch (err) {
                console.error(err);
                showToast("❌ حدث خطأ في الاتصال");
            }
        }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.classList.remove('hidden');
            setTimeout(() => t.classList.add('hidden'), 3500);
        }

        window.onload = loadStats;
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => console.log(`🚀 Abu Hussein Server Running on port ${PORT}`));
