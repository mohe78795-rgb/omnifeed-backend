const express = require('express');                                              
const mongoose = require('mongoose');                                            
const cors = require('cors');
const path = require('path');                                                                                                                                     
require('dotenv').config(); // 👈 1. أضفنا هذا السطر في الأعلى لقراءة ملف الـ .env السري

const app = express();
const PORT = process.env.PORT || 3000;                                           

// --- الإعدادات الأساسية (Middlewares) ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. الاتصال بالقاعدة ---
// 👈 2. استبدلنا الرابط المكشوف بـ process.env.MONGO_URI لقراءته بأمان من ملف .env
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ متصل بسحابة أبو حسين (MongoDB)");
    })
    .catch(err => {
        console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err);
    });

// ==========================================
// 🗃️ تعريف موديلات وقواعد البيانات (Schemas)
// ==========================================

// 1. موديل المستخدمين (المحفظة الرقمية)
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 } // الرصيد بالعملة المحلية YER
});
const User = mongoose.model('User', UserSchema);

// 2. موديل المنتجات الأساسية للكتالوج
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    cat: { type: String, required: true },
    img: { type: String, required: true }
});
const Product = mongoose.model('Product', ProductSchema);

// 3. موديل أقسام المتجر
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: { type: String, default: "" },
    img: { type: String, required: true }
});
const Category = mongoose.model('Category', CategorySchema);

// 4. موديل الفواتير وسجل العمليات
const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true },
    phone: { type: String, required: true },
    total: { type: Number, required: true },
    status: { type: String, default: "مكتمل ✅" },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) },
    items: { type: Array, required: true }
});
const Order = mongoose.model('Order', OrderSchema);


// ==========================================
// 🔐 مسارات الهوية والتحقق (Authentication)
// ==========================================

// تسجيل حساب جديد وتفعيل محفظة افتراضية
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.status(400).json({ success: false, message: "رقم الهاتف مسجل مسبقاً" });

        // رصيد افتراضي أولي للتجربة 5000 YER
        const newUser = new User({ name, phone, pass, bal: 5000 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false, message: "حدث خطأ في خادم التسجيل" }); }
});

// تسجيل الدخول العادي
app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (!user) return res.status(400).json({ success: false, message: "رقم الهاتف أو كلمة المرور غير صحيحة" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false, message: "خطأ في السيرفر الداخلي" }); }
});

// مزامنة رصيد الحساب المباشر
app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (!user) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false, message: "فشلت مزامنة البيانات" }); }
});


// ==========================================
// 📦 مسارات المنتجات والأقسام (Catalog)
// ==========================================

app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find({})); } catch(e) { res.status(500).send(e); }
});

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({})); } catch(e) { res.status(500).send(e); }
});


// ==========================================
// 🧾 مسارات الدفع الفوري وفواتير السلة (Orders)
// ==========================================

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < order.total) return res.status(400).json({ message: "رصيد المحفظة غير كافٍ لإتمام الشراء" });

        // خصم القيمة وتحديث الحساب
        user.bal -= order.total;
        await user.save();

        const customId = "INV-" + Math.floor(100000 + Math.random() * 900000);
        const newOrder = new Order({ id: customId, phone, total: order.total, items: order.items });
        await newOrder.save();

        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ message: "فشل تنفيذ عملية الشراء" }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })); } catch(e) { res.status(500).send(e); }
});


// ==========================================
// 🎮 مسارات نظام شحن الألعاب الفوري (UniPin Integration API)
// ==========================================

const GAMES_DATA = [
    {
        game_name: "ببجي موبايل (PUBG Mobile)",
        game_code: "PUBGM_GLOBAL",
        denominations: [
            { id: "pubg_60", name: "60 UC 💎", price: 1200 },
            { id: "pubg_325", name: "325 UC 💎", price: 5800 },
            { id: "pubg_660", name: "660 UC 💎", price: 11500 }
        ]
    },
    {
        game_name: "فري فاير (Free Fire)",
        game_code: "FREEFIRE_GLOBAL",
        denominations: [
            { id: "ff_100", name: "100 Diamond 💎", price: 950 },
            { id: "ff_210", name: "210 Diamond 💎", price: 1900 },
            { id: "ff_530", name: "530 Diamond 💎", price: 4750 }
        ]
    },
    {
        game_name: "موبايل ليجند (Mobile Legends)",
        game_code: "MLBB_GLOBAL",
        denominations: [
            { id: "ml_86", name: "86 Diamonds 💎", price: 1400 },
            { id: "ml_172", name: "172 Diamonds 💎", price: 2800 },
            { id: "ml_257", name: "257 Diamonds 💎", price: 4100 }
        ]
    }
];

// 1. جلب قائمة الألعاب المتاحة
app.get('/api/games', (req, res) => {
    res.json({ success: true, game_list: GAMES_DATA });
});

// 2. التحقق الفوري الذكي من اللاعب (Player ID Validation)
app.post('/api/games/validate-user', (req, res) => {
    const { game_code, user_id } = req.body;
    if (!user_id) return res.json({ success: false, message: "يرجى إدخال المعرف أولاً" });

    // محاكاة استجابة الخادم لأسماء اللاعبين الفنيين للواقعية الكاملة
    const mockNames = ["Abdu_Hero⚡", "Yemen_King🔥", "Prestige_User👑", "Supplies_Slayer⚔️"];
    const nameIndex = user_id.length % mockNames.length;

    res.json({ success: true, player_name: mockNames[nameIndex] });
});

// 3. معالجة طلب شحن اللعبة، خصم الرصيد، وإنشاء فاتورة تلقائية
app.post('/api/games/topup', async (req, res) => {
    const { phone, game_code, user_id, denomination_id, price } = req.body;

    try {
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ success: false, message: "الحساب غير موجود" });
        if (user.bal < price) return res.status(400).json({ success: false, message: "رصيد محفظتك غير كافٍ لإتمام عملية الشحن الفوري" });

        // خصم قيمة الشحنة فورياً من محفظة العميل
        user.bal -= price;
        await user.save();

        // تدوين العملية في جدول الفواتير تلقائياً لضمان حق العميل وسهولة مراجعتها
        const customId = "GAME-" + Math.floor(100000 + Math.random() * 900000);
        const gameOrder = new Order({
            id: customId,
            phone: user.phone,
            total: price,
            status: "مشحون تلقائياً ⚡",
            items: [{ name: `شحن فئة [${denomination_id}] لحساب اللاعب: (${user_id}) في لعبة: ${game_code}`, price: price, qty: 1 }]
        });
        await gameOrder.save();

        res.json({ success: true, message: "تم الشحن وتحديث حسابك فورياً بنجاح!", currentBal: user.bal });
    } catch(e) {
        res.status(500).json({ success: false, message: "عطل طارئ في نظام السداد المباشر" });
    }
});


// --- توجيه كل طلبات الواجهة للملف الرئيسي لتطبيقات الـ SPA ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- تشغيل السيرفر ---
app.listen(PORT, () => {
    console.log(`🚀 خادم التطبيق يعمل بنجاح وكفاءة تامة على المنفذ: ${PORT}`);
});

