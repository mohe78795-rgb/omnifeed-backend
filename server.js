const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ Critical Error: MONGO_URI is not defined!");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ Securely Connected to MongoDB Atlas");
        await seedDatabase();
    }).catch(e => console.error("❌ DB Connection Failed:", e.message));

// --- Schemas ---
const userSchema = new mongoose.Schema({ name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 } });
const catSchema = new mongoose.Schema({ name: String, sub: String, img: String });
const productSchema = new mongoose.Schema({ name: String, price: Number, img: String, cat: String });
const adSchema = new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } });
const orderSchema = new mongoose.Schema({ 
    id: String, phone: String, items: Array, total: Number, status: { type: String, default: 'تم الاستلام' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', catSchema);
const Product = mongoose.model('Product', productSchema);
const Ad = mongoose.model('Ad', adSchema);
const Order = mongoose.model('Order', orderSchema);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ تأمين 1: حذف pass من استجابة التسجيل
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        if (await User.findOne({ phone })) return res.status(400).json({ message: "الرقم مسجل مسبقاً" });
        const user = new User({ name, phone, pass }); await user.save();
        res.json({ success: true, user: { name: user.name, phone: user.phone, bal: user.bal } });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ✅ تأمين 2: حذف pass من استجابة الدخول
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ phone: req.body.phone, pass: req.body.pass });
    if (user) res.json({ success: true, user: { name: user.name, phone: user.phone, bal: user.bal } });
    else res.status(401).json({ message: "بيانات الدخول خاطئة" });
});

// ✅ تأمين 3: حذف pass من استجابة المزامنة
app.post('/api/auth/sync', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        const user = await User.findOne({ phone, pass });
        if (user) res.json({ success: true, user: { name: user.name, phone: user.phone, bal: user.bal } });
        else res.status(403).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.get('/api/ads/active', async (req, res) => res.json(await Ad.findOne({ active: true })));

// ✅ تأمين 4: فرض التحقق من الـ pass قبل تنفيذ أي عملية خصم مالي
app.post('/api/orders/add', async (req, res) => {
    try {
        const { phone, pass, order } = req.body;
        const user = await User.findOne({ phone, pass }); // التحقق من الهوية الفعلي

        if (user && user.bal >= order.total) {
            user.bal -= order.total;
            await user.save();
            const serverId = "INV-" + Date.now().toString().slice(-6);
            const newOrder = new Order({ id: serverId, phone, items: order.items, total: order.total });
            await newOrder.save();
            res.json({ success: true, currentBal: user.bal, order: newOrder });
        } else {
            res.status(400).json({ message: "فشل التحقق الأمني أو الرصيد غير كافٍ" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

async function seedDatabase() {
    if (await Category.countDocuments() === 0) {
        await Category.insertMany([
            { name: "مواد غذائية", sub: "تموينات مختارة", img: "https://i.postimg.cc/q7M8VnHz/rice.jpg" },
            { name: "باقات ورصيد", sub: "شحن فوري", img: "https://i.postimg.cc/XvL4Q8w9/tea.jpg" }
        ]);
    }
}
// ==========================================
// 👑 مسارات لوحة التحكم الخاصة بالمدير (Admin)
// ==========================================

// 1. جلب الإحصائيات العامة والبيانات بالكامل
app.post('/api/admin/dashboard', async (req, res) => {
    const { adminPass } = req.body;
    if (adminPass !== "OMNI_ADMIN_2026") return res.status(401).json({ message: "غير مصرح لك!" });

    try {
        const users = await User.find().sort({ name: 1 });
        const orders = await Order.find().sort({ _id: -1 });
        const categories = await Category.find();
        const products = await Product.find();
        const ad = await Ad.findOne({ active: true });

        res.json({ success: true, data: { users, orders, categories, products, ad } });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2. تعديل/شحن رصيد مستخدم
app.post('/api/admin/user/update-balance', async (req, res) => {
    const { adminPass, phone, newBalance } = req.body;
    if (adminPass !== "OMNI_ADMIN_2026") return res.status(401).json({ message: "غير مصرح لك!" });

    try {
        const user = await User.findOneAndUpdate({ phone }, { bal: Number(newBalance) }, { new: true });
        if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. إضافة منتج جديد
app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== "OMNI_ADMIN_2026") return res.status(401).json({ message: "غير مصرح لك!" });

    try {
        const newProduct = new Product({ name, price: Number(price), img, cat });
        await newProduct.save();
        res.json({ success: true, product: newProduct });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. حذف منتج
app.post('/api/admin/product/delete', async (req, res) => {
    const { adminPass, id } = req.body;
    if (adminPass !== "OMNI_ADMIN_2026") return res.status(401).json({ message: "غير مصرح لك!" });

    try {
        await Product.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. تعديل حالة الفاتورة (مثلاً: تم التوصيل، قيد المعالجة)
app.post('/api/admin/order/update-status', async (req, res) => {
    const { adminPass, id, status } = req.body;
    if (adminPass !== "OMNI_ADMIN_2026") return res.status(401).json({ message: "غير مصرح لك!" });

    try {
        await Order.findOneAndUpdate({ id }, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.listen(PORT, () => console.log(`🚀 Final Fortress Engine at ${PORT}`));
