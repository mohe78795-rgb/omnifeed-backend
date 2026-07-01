const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- بيانات الاتصال بقاعدة البيانات ---
const MONGO_URI = "mongodb://mohe78795_db_user:737465252@ac-3prk1zf-shard-00-00.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-01.qr9q8iv.mongodb.net:27017,ac-3prk1zf-shard-00-02.qr9q8iv.mongodb.net:27017/?ssl=true&replicaSet=atlas-kaid64-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ متصل بنجاح بـ MongoDB Atlas");
        await seedDatabase();
    })
    .catch(err => console.error("❌ فشل الاتصال بالقاعدة:", err.message));

// --- 2. تعريف الجداول (Schemas) مع الـ Aliases لربط العربي بالإنجليزي ---

const userSchema = new mongoose.Schema({
    name: { type: String, alias: 'اسم' },
    phone: { type: String, unique: true, required: true, alias: 'هاتف' },
    pass: { type: String, alias: 'يمر' },
    bal: { type: Number, default: 0, alias: 'بال' } // هنا تم ربط بال السحابي بـ bal
});

const productSchema = new mongoose.Schema({
    name: { type: String, alias: 'اسم' },
    price: { type: Number, alias: 'سعر' },
    img: { type: String, alias: 'صورة' },
    cat: { type: String, alias: 'قطة' }
});

const orderSchema = new mongoose.Schema({
    id: { type: String, alias: 'معرف' },
    phone: { type: String, alias: 'هاتف' },
    items: { type: Array, alias: 'العناصر' },
    total: { type: Number, alias: 'الاجمالي' },
    status: { type: String, default: 'قيد المراجعة', alias: 'الحالة' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }), alias: 'تاريخ الطلب' }
});

// هنا السر الفعلي: ربط الموديل بالمجلد العربي الموجود في السحابي حالياً
const User = mongoose.model('User', userSchema, 'المستخدمون');
const Product = mongoose.model('Product', productSchema, 'منتجات');
const Order = mongoose.model('Order', orderSchema, 'طلبات');

// --- الإعدادات ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- مسارات المصادقة ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        const exists = await User.findOne({ phone });
        if (exists) return res.status(400).json({ message: "الرقم مسجل مسبقاً" });
        const user = new User({ name, phone, pass, bal: 0 });
        await user.save();
        res.json({ success: true, user: { name: user.name, phone: user.phone, bal: user.bal } });
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

// --- مسارات المتجر والطلبات ---

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
            
            const invoiceId = "INV-" + Date.now().toString().slice(-6);
            const newOrder = new Order({ id: invoiceId, phone, items: order.items, total: order.total });
            await newOrder.save();
            
            res.json({ success: true, currentBal: user.bal, order: newOrder });
        } else res.status(400).json({ message: "رصيد غير كافٍ" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })); } 
    catch (e) { res.status(500).json([]); }
});

// دالة تغذية البيانات الأولية
async function seedDatabase() {
    if (await Product.countDocuments() === 0) {
        const prods = [
            { name: "أرز بسمتي 5 كيلو", price: 12500, cat: "مواد غذائية", img: "https://i.postimg.cc/q7M8VnHz/rice.jpg" },
            { name: "زيت طبخ 1.5 لتر", price: 4800, cat: "زيوت", img: "https://i.postimg.cc/vHdb8P9G/oil.jpg" },
            { name: "حليب نيدو 900 جرام", price: 18500, cat: "ألبان", img: "https://i.postimg.cc/mD8XmYxk/nido.jpg" }
        ];
        await Product.insertMany(prods);
    }
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
