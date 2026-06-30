const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- بيانات الاتصال بقاعدة البيانات ---
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ تم الاتصال بنجاح بقاعدة بيانات MongoDB Atlas"))
    .catch(err => console.error("❌ فشل الاتصال بالقاعدة:", err));

// --- تعريف الجداول (Models) ---

// 1. جدول المستخدمين
const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true, required: true },
    pass: String,
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});

// 2. جدول المنتجات
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    img: String,
    cat: String,
    stock: { type: Number, default: 10 }
});

// 3. جدول الطلبات
const orderSchema = new mongoose.Schema({
    id: String,
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'تم الاستلام' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// --- الإعدادات الوسيطة ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// المسارات البرمجية (API Routes)
// ==========================================

// 1. تسجيل مستخدم جديد (Signup)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        
        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "رقم الهاتف مسجل مسبقاً" });
        }

        const newUser = new User({ name, phone, pass, bal: 0 });
        await newUser.save();

        res.json({ success: true, user: newUser });
    } catch (e) {
        res.status(500).json({ success: false, message: "خطأ في الخادم أثناء التسجيل" });
    }
});

// 2. تسجيل الدخول (Login)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        const user = await User.findOne({ phone, pass });

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: "رقم الهاتف أو كلمة المرور غير صحيحة" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "خطأ في الاتصال بالسيرفر" });
    }
});

// 3. مزامنة بيانات المستخدم (Sync/Balance)
app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false });
        }
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 4. جلب المنتجات (Products)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (e) {
        res.status(500).json([]);
    }
});

// 5. إضافة طلب جديد وخصم الرصيد (Process Order)
app.post('/api/orders/add', async (req, res) => {
    try {
        const { phone, order } = req.body;
        const user = await User.findOne({ phone });

        if (user && user.bal >= order.total) {
            // خصم الرصيد وحفظ المستخدم
            user.bal -= order.total;
            await user.save();

            // حفظ الطلب في قاعدة البيانات
            const newOrder = new Order({
                id: order.id,
                phone: phone,
                items: order.items,
                total: order.total,
                status: order.status || 'تم الاستلام'
            });
            await newOrder.save();

            res.json({ success: true, currentBal: user.bal });
        } else {
            res.status(400).json({ success: false, message: "رصيد غير كافٍ لإتمام العملية" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "فشل في معالجة الطلب" });
    }
});

// 6. إضافة منتج (خاص بلوحة التحكم فقط)
app.post('/api/products/add', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ: ${PORT}`);
});
