const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. الاتصال بالقاعدة ---
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ متصل بسحابة أبو حسين (MongoDB)");
        await seedDatabase(); 
    }).catch(err => console.error("❌ خطأ اتصال:", err.message));

// --- 2. الهياكل (Schemas) ---
const userSchema = new mongoose.Schema({ name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 } });
const catSchema = new mongoose.Schema({ name: String, sub: String, img: String });
const productSchema = new mongoose.Schema({ name: String, price: Number, img: String, cat: String });
const adSchema = new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } });
const orderSchema = new mongoose.Schema({ id: String, phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة' }, date: { type: String, default: () => new Date().toLocaleString('ar-YE') } });

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', catSchema);
const Product = mongoose.model('Product', productSchema);
const Ad = mongoose.model('Ad', adSchema);
const Order = mongoose.model('Order', orderSchema);

// --- 3. الإعدادات ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 4. المسارات (API) ---

// الأقسام والمنتجات والإعلانات
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.get('/api/ads/active', async (req, res) => res.json(await Ad.findOne({ active: true })));

// المصادقة
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    if (await User.findOne({ phone })) return res.status(400).json({ message: "الرقم مسجل" });
    const user = new User({ name, phone, pass });
    await user.save();
    res.json({ success: true, user });
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ phone: req.body.phone, pass: req.body.pass });
    if (user) res.json({ success: true, user });
    else res.status(401).json({ message: "بيانات خاطئة" });
});

app.get('/api/auth/user/:phone', async (req, res) => {
    const user = await User.findOne({ phone: req.params.phone });
    res.json({ success: true, user });
});

// الطلبات
app.post('/api/orders/add', async (req, res) => {
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
});

app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

// تغذية البيانات
async function seedDatabase() {
    if (await Category.countDocuments() === 0) {
        await Category.insertMany([
            { name: "مواد غذائية", sub: "تموينات مختارة", img: "https://i.postimg.cc/q7M8VnHz/rice.jpg" },
            { name: "باقات ورصيد", sub: "شحن فوري", img: "https://i.postimg.cc/XvL4Q8w9/tea.jpg" }
        ]);
    }
    if (await Ad.countDocuments() === 0) await Ad.create({ videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" });
}

app.listen(PORT, () => console.log(`🚀 Store Server at ${PORT}`));
