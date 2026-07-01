const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. إعدادات قاعدة البيانات السحابية ---
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ متصل بنجاح بـ MongoDB Atlas");
        await seedDatabase();
    })
    .catch(err => console.error("❌ فشل الاتصال بالقاعدة:", err.message));

// --- 2. تعريف هياكل البيانات (Schemas) ---

// هيكل المستخدمين
const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true, required: true },
    pass: String,
    bal: { type: Number, default: 0 }
});

// هيكل المنتجات
const productSchema = new mongoose.Schema({
    name: String, price: Number, img: String, cat: String
});

// هيكل الطلبات (الفواتير)
const orderSchema = new mongoose.Schema({
    id: String, phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});

// هيكل الإعلانات (الجديد)
const adSchema = new mongoose.Schema({
    videoUrl: { type: String, alias: 'رابط_الفيديو' },
    active: { type: Boolean, default: true, alias: 'نشط' }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Ad = mongoose.model('Ad', adSchema, 'إعلانات');

// --- 3. الإعدادات الأساسية ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 4. مسارات الإعلانات (Ads API) ---

app.get('/api/ads/active', async (req, res) => {
    try {
        const activeAd = await Ad.findOne({ active: true });
        res.json(activeAd || { videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- 5. مسارات المصادقة (Auth API) ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        const exists = await User.findOne({ phone });
        if (exists) return res.status(400).json({ message: "الرقم مسجل مسبقاً" });
        const newUser = new User({ name, phone, pass, bal: 0 });
        await newUser.save();
        res.json({ success: true, user: { name: newUser.name, phone: newUser.phone, bal: newUser.bal } });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        const user = await User.findOne({ phone, pass });
        if (user) res.json({ success: true, user: { name: user.name, phone: user.phone, bal: user.bal } });
        else res.status(401).json({ message: "خطأ في البيانات" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (user) res.json({ success: true, user: { name: user.name, phone: user.phone, bal: user.bal } });
        else res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- 6. مسارات المتجر والطلبات ---

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find()); } catch (e) { res.status(500).json([]); }
});

app.post('/api/orders/add', async (req, res) => {
    try {
        const { phone, order } = req.body;
        const user = await User.findOne({ phone });
        if (user && user.bal >= order.total) {
            user.bal -= order.total;
            await user.save();
            const serverId = "INV-" + Date.now().toString().slice(-6);
            const newOrder = new Order({ id: serverId, phone, items: order.items, total: order.total });
            await newOrder.save();
            res.json({ success: true, currentBal: user.bal, order: newOrder });
        } else res.status(400).json({ message: "رصيد غير كافٍ" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })); }
    catch (e) { res.status(500).json([]); }
});

// --- 7. دالة تغذية البيانات (Seeding) ---
async function seedDatabase() {
    // إدخال منتجات تجريبية
    if (await Product.countDocuments() === 0) {
        await Product.insertMany([
            { name: "أرز بسمتي 5 كيلو", price: 12000, cat: "مواد غذائية", img: "https://i.postimg.cc/q7M8VnHz/rice.jpg" },
            { name: "زيت طبخ 1.5 لتر", price: 4500, cat: "زيوت", img: "https://i.postimg.cc/vHdb8P9G/oil.jpg" }
        ]);
    }
    // إدخال إعلان تجريبي
    if (await Ad.countDocuments() === 0) {
        await Ad.create({ videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", active: true });
    }
}

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`));
