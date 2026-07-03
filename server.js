const express = require('express');                                              
const mongoose = require('mongoose');                                            
const cors = require('cors');
const path = require('path');                                                                                                                                     
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;                                           

// --- الإعدادات الأساسية والروابط المشتركة (Middlewares) ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. الاتصال بقاعدة بيانات MongoDB ---
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

// 1. موديل المستخدمين (المحفظة الرقمية) مع تاريخ الانضمام
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
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

// 3. موديل أقسام المتجر (الفئات) متوافق مع الوصف الفرعي sub
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: { type: String, default: "" },
    img: { type: String, required: true }
});
const Category = mongoose.model('Category', CategorySchema);

// 4. موديل الفواتير وسجل العمليات متوافق مع المصفوفات والحالات
const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true },
    phone: { type: String, required: true },
    total: { type: Number, required: true },
    status: { type: String, default: "قيد المراجعة" },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) },
    items: { type: Array, required: true }
});
const Order = mongoose.model('Order', OrderSchema);

// 5. موديل الإعلانات المطور ليعمل كـ فيديوهات متحركة حية ومباشرة
const AdSchema = new mongoose.Schema({
    videoUrl: { type: String, required: true },
    active: { type: Boolean, default: true }
});
const Ad = mongoose.model('Ad', AdSchema);


// ==========================================
// 🔐 مسارات واجهة المتجر والعملاء (Public API)
// ==========================================

// تسجيل مستخدم جديد
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.status(400).json({ success: false, message: "رقم الهاتف مسجل مسبقاً" });

        const newUser = new User({ name, phone, pass, bal: 5000 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false, message: "حدث خطأ في خادم التسجيل" }); }
});

// تسجيل الدخول للمتجر
app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (!user) return res.status(400).json({ success: false, message: "بيانات الدخول خاطئة" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

// مزامنة رصيد العميل حياً
app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (!user) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

// جلب أقسام المتجر
app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find({})); } catch(e) { res.status(500).send(e); }
});

// جلب جميع المنتجات
app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({})); } catch(e) { res.status(500).send(e); }
});

// جلب الفيديوهات الإعلانية النشطة
app.get('/api/ads', async (req, res) => { 
    try { res.json(await Ad.find({ active: true })); } catch(e) { res.status(500).send(e); }
});

// تنفيذ عملية شراء وسحب فوري من رصيد المحفظة
app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < order.total) return res.status(400).json({ message: "رصيد المحفظة غير كافٍ لإتمام الشراء" });

        user.bal -= order.total;
        await user.save();

        const customId = "INV-" + Math.floor(100000 + Math.random() * 900000);
        const newOrder = new Order({ id: customId, phone, total: order.total, items: order.items });
        await newOrder.save();

        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ message: "فشل تنفيذ عملية الشراء" }); }
});

// سجل طلبات المشتري
app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })); } catch(e) { res.status(500).send(e); }
});


// ==========================================
// 🎮 مسارات نظام شحن الألعاب الفوري (UniPin API)
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
    }
];

app.get('/api/games', (req, res) => {
    res.json({ success: true, game_list: GAMES_DATA });
});

app.post('/api/games/validate-user', (req, res) => {
    const { game_code, user_id } = req.body;
    if (!user_id) return res.json({ success: false, message: "يرجى إدخال المعرف أولاً" });
    const mockNames = ["Abdu_Hero⚡", "Yemen_King🔥", "Prestige_User👑", "Supplies_Slayer⚔️"];
    const nameIndex = user_id.length % mockNames.length;
    res.json({ success: true, player_name: mockNames[nameIndex] });
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, game_code, user_id, denomination_id, price } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ success: false, message: "الحساب غير موجود" });
        if (user.bal < price) return res.status(400).json({ success: false, message: "رصيد محفظتك غير كافٍ" });

        user.bal -= price;
        await user.save();

        const customId = "GAME-" + Math.floor(100000 + Math.random() * 900000);
        const gameOrder = new Order({
            id: customId,
            phone: user.phone,
            total: price,
            status: "مشحون تلقائياً ⚡",
            items: [{ name: `شحن فئة [${denomination_id}] لحساب اللاعب: (${user_id}) في لعبة: ${game_code}`, price: price, qty: 1 }]
        });
        await gameOrder.save();

        res.json({ success: true, message: "تم الشحن بنجاح!", currentBal: user.bal });
    } catch(e) { res.status(500).json({ success: false, message: "عطل طارئ" }); }
});


// ==========================================
// 👑 مسارات لوحة تحكم الإدارة المركزية (Admin API)
// ==========================================

const ADMIN_SECRET_KEY = "123456"; // 👈 رمز الأدمن السري لفتح جميع البيانات

// 1. جلب وتحديث كل بيانات اللوحة دفعة واحدة للتحكم والفلترة لقاعدة البيانات
app.post('/api/admin/dashboard', async (req, res) => {
    const { adminPass } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false, message: "الرمز السري خطأ!" });
    try {
        const orders = await Order.find({}).sort({ _id: -1 });
        const users = await User.find({}).sort({ _id: -1 });
        const categories = await Category.find({});
        const ads = await Ad.find({}).sort({ _id: -1 });
        res.json({ success: true, data: { orders, users, categories, ads } });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2. تحديث وشحن رصيد مستخدم فوري في الـ MongoDB
app.post('/api/admin/user/update-balance', async (req, res) => {
    const { adminPass, phone, newBalance } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await User.findOneAndUpdate({ phone }, { bal: Number(newBalance) });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. إضافة منتج جديد
app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Product({ name, price: Number(price), img, cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. إضافة قسم جديد بالاسم والصورة والوصف الفرعي
app.post('/api/admin/category/add', async (req, res) => {
    const { adminPass, name, sub, img } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Category({ name, sub, img }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. إضافة فيديو إعلاني جديد مع حالة النشاط
app.post('/api/admin/ad/add', async (req, res) => {
    const { adminPass, videoUrl, active } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Ad({ videoUrl, active: active ?? true }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 6. تحديث حالة الفواتير (توصيل / إلغاء)
app.post('/api/admin/order/update-status', async (req, res) => {
    const { adminPass, id, status } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Order.findOneAndUpdate({ id }, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});


// ==========================================
// 🌐 توجيه وإدارة مسارات المتصفح والـ SPA
// ==========================================

// فتح واجهة لوحة التحكم المركزية عند طلب /admin مباشرة
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// فتح واجهة المتجر الرئيسية لأي مسار عميل آخر غير معروف
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- تشغيل السيرفر وانطلاقه ---
app.listen(PORT, () => {
    console.log(`🚀 خادم التطبيق يعمل بنجاح وكفاءة تامة على المنفذ: ${PORT}`);
});


