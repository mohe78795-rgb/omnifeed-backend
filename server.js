const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- إعدادات قاعدة البيانات ---
// الرابط الخاص بك (تم التأكد من استخدامه بالكامل مع إعدادات الـ SSL)
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ تم الاتصال بنجاح بقاعدة بيانات MongoDB Atlas"))
    .catch(err => {
        console.error("❌ فشل الاتصال الأولي بالقاعدة:");
        console.error("السبب:", err.message);
    });

// مراقبة أخطاء الاتصال أثناء التشغيل
mongoose.connection.on('error', err => {
    console.error('⚠️ خطأ في اتصال المونجو أثناء العمل:', err);
});

// --- تعريف هياكل البيانات ---
const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true, required: true },
    pass: String,
    bal: { type: Number, default: 0 }
});

const productSchema = new mongoose.Schema({
    name: String, price: Number, img: String, cat: String
});

const orderSchema = new mongoose.Schema({
    id: String, phone: String, items: Array, total: Number, status: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// المسار المحدث: Signup مع نظام Logs دقيق
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        console.log("------------------------------------------");
        console.log("📥 محاولة تسجيل جديدة للرقم:", phone);

        // 1. التحقق من وجود المستخدم
        const exists = await User.findOne({ phone });
        if (exists) {
            console.log("⚠️ الرقم مسجل مسبقاً في القاعدة");
            return res.status(400).json({ message: "الرقم مسجل مسبقاً" });
        }

        // 2. محاولة الحفظ في قاعدة البيانات
        const user = new User({ name, phone, pass });
        await user.save();
        
        console.log("✅ تم حفظ المستخدم بنجاح في MongoDB Atlas:", user.name);
        console.log("------------------------------------------");
        res.json({ success: true, user });

    } catch (e) { 
        // طباعة تفاصيل الخطأ كاملة للمطور
        console.log("❌ [ERROR SIGNUP]");
        console.error("الرسالة:", e.message);
        console.error("التفاصيل التقنية (Full Error):", e);
        console.log("------------------------------------------");

        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ في السيرفر أثناء الحفظ",
            error: e.message 
        }); 
    }
});

// --- بقية المسارات (Login, Products, Orders) ---

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        const user = await User.findOne({ phone, pass });
        if (user) res.json({ success: true, user });
        else res.status(401).json({ message: "خطأ في الهاتف أو كلمة المرور" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (user) res.json({ success: true, user });
        else res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const prods = await Product.find();
        res.json(prods);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/orders/add', async (req, res) => {
    try {
        const { phone, order } = req.body;
        const user = await User.findOne({ phone });
        if (user && user.bal >= order.total) {
            const serverOrderId = "AH-" + Date.now().toString().slice(-6);
            user.bal -= order.total;
            await user.save();
            const newOrder = new Order({
                id: serverOrderId, phone, items: order.items, total: order.total, status: 'تم الاستلام'
            });
            await newOrder.save();
            res.json({ success: true, currentBal: user.bal, order: newOrder });
        } else {
            res.status(400).json({ message: "رصيد غير كافٍ" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => {
    console.log(`
🚀 ============================================
🚀 سيرفر تموينات أبو حسين يعمل بنجاح
🚀 المنفذ: ${PORT}
🚀 متصل بقاعدة بيانات MongoDB Atlas
🚀 ============================================
    `);
});
