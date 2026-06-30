const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ضروري لتشغيل المسارات

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. إعدادات قاعدة البيانات السحابية ---
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("------------------------------------------");
        console.log("✅ تم الاتصال بـ MongoDB Atlas");
        await seedDatabase(); // تغذية القاعدة بالمنتجات إذا كانت فارغة
        console.log("------------------------------------------");
    })
    .catch(err => console.error("❌ فشل الاتصال بالقاعدة:", err.message));

// --- 2. تعريف هياكل البيانات (Schemas) ---
const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true, required: true },
    pass: String,
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
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

// --- 3. الإعدادات الأساسية (الترتيب مهم جداً) ---
app.use(cors());
app.use(express.json());

// ✅ الحل: تشغيل المجلد الساكن لفتح الواجهة (index.html)
app.use(express.static(path.join(__dirname, 'public')));

// --- 4. دالة تغذية المنتجات التلقائية ---
async function seedDatabase() {
    const initialProducts = [
        { name: "أرز بسمتي 5 كيلو", price: 12000, cat: "مواد غذائية", img: "https://i.postimg.cc/q7M8VnHz/rice.jpg" },
        { name: "زيت طبخ 1.5 لتر", price: 4500, cat: "زيوت", img: "https://i.postimg.cc/vHdb8P9G/oil.jpg" },
        { name: "حليب نيدو 900 جرام", price: 18500, cat: "ألبان", img: "https://i.postimg.cc/mD8XmYxk/nido.jpg" },
        { name: "سكر ناعم 2 كيلو", price: 3200, cat: "مواد غذائية", img: "https://i.postimg.cc/J0m0j7yD/sugar.jpg" },
        { name: "شاي الكبوس - كرتون", price: 2800, cat: "مشروبات", img: "https://i.postimg.cc/XvL4Q8w9/tea.jpg" }
    ];
    const count = await Product.countDocuments();
    if (count === 0) {
        await Product.insertMany(initialProducts);
        console.log("📦 تم إدخال المنتجات الأولية للقاعدة بنجاح");
    }
}

// --- 5. مسارات API (Auth & Logic) ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        const exists = await User.findOne({ phone });
        if (exists) return res.status(400).json({ message: "الرقم مسجل مسبقاً" });
        const user = new User({ name, phone, pass, bal: 0 });
        await user.save();
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        const user = await User.findOne({ phone, pass });
        if (user) res.json({ success: true, user });
        else res.status(401).json({ message: "خطأ في البيانات" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        res.json({ success: true, user });
    } catch (e) { res.status(404).json({ success: false }); }
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
            const serverId = "AH-" + Date.now().toString().slice(-6);
            user.bal -= order.total;
            await user.save();
            const newOrder = new Order({ id: serverId, phone, items: order.items, total: order.total, status: 'تم الاستلام' });
            await newOrder.save();
            res.json({ success: true, currentBal: user.bal, order: newOrder });
        } else res.status(400).json({ message: "رصيد غير كافٍ" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- تشغيل السيرفر ---
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
});
