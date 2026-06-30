const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// رابط MongoDB Atlas الخاص بك
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- Schemas ---
const userSchema = new mongoose.Schema({
    name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 }
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

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        const exists = await User.findOne({ phone });
        if (exists) return res.status(400).json({ message: "الرقم مسجل مسبقاً" });
        const user = new User({ name, phone, pass });
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

// --- Shop Routes ---
app.get('/api/products', async (req, res) => {
    const prods = await Product.find();
    res.json(prods);
});

app.post('/api/orders/add', async (req, res) => {
    try {
        const { phone, order } = req.body;
        const user = await User.findOne({ phone });

        if (user && user.bal >= order.total) {
            // توليد معرف طلب فريد في السيرفر
            const serverOrderId = "AH-" + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4).toUpperCase();
            
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

app.listen(PORT, () => console.log(`Server on ${PORT}`));
