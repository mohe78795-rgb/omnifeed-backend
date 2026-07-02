const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ تأمين قاعدة البيانات عبر متغيرات البيئة
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ خطأ: MONGO_URI غير معرف في متغيرات البيئة!");
    process.exit(1);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Securely Connected to MongoDB Atlas"))
    .catch(e => console.error("❌ Connection Failed:", e.message));

// --- هياكل البيانات (Schemas) ---
const userSchema = new mongoose.Schema({ name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 } });
const catSchema = new mongoose.Schema({ name: String, sub: String, img: String });
const productSchema = new mongoose.Schema({ name: String, price: Number, img: String, cat: String });
const orderSchema = new mongoose.Schema({ id: String, phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة' }, date: { type: String, default: () => new Date().toLocaleString('ar-YE') } });
const adSchema = new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } });

// 🆕 هياكل بيانات قسم شحن الألعاب (UniPin Mock Data Integration)
const gameSchema = new mongoose.Schema({
    game_code: { type: String, unique: true },
    game_name: String,
    game_status: { type: String, default: 'active' },
    denominations: [
        { id: String, name: String, price: Number } // فئات الشحن (مثل: 60 جوهرة بـ 150 ريال)
    ]
});

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', catSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Ad = mongoose.model('Ad', adSchema);
const Game = mongoose.model('Game', gameSchema); // 🆕 موديل الألعاب

app.use(cors()); app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));

// --- مسارات الـ API (الخدمات السابقة المستقرة) ---
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.get('/api/ads/active', async (req, res) => res.json(await Ad.findOne({ active: true })));
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        if (await User.findOne({ phone })) return res.status(400).json({ message: "الرقم مسجل" });
        const user = new User({ name, phone, pass }); await user.save();
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ phone: req.body.phone, pass: req.body.pass });
    if (user) res.json({ success: true, user }); else res.status(401).json({ message: "بيانات خاطئة" });
});
app.get('/api/auth/user/:phone', async (req, res) => res.json({ success: true, user: await User.findOne({ phone: req.params.phone }) }));
app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body; const user = await User.findOne({ phone });
    if (user && user.bal >= order.total) {
        user.bal -= order.total; await user.save();
        const serverId = "INV-" + Date.now().toString().slice(-6);
        const newOrder = new Order({ id: serverId, phone, items: order.items, total: order.total });
        await newOrder.save(); res.json({ success: true, currentBal: user.bal, order: newOrder });
    } else res.status(400).json({ message: "رصيد غير كافٍ" });
});
app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

// =======================================================
// 🆕 مسارات الـ API الخاصة بقسم شحن الألعاب (UniPin Integration)
// =======================================================

// 1. مسار جلب قائمة الألعاب المتاحة وفئاتها السعرية
app.get('/api/games', async (req, res) => {
    try {
        // البيانات محاكاة محلياً لتفادي حظر الشبكات والـ Cloudflare
        const gamesData = [
            {
                game_code: "PUBGM_GLOBAL",
                game_name: "PUBG Mobile UC",
                game_status: "active",
                denominations: [
                    { id: "uc_60", name: "60 UC", price: 150 },
                    { id: "uc_325", name: "325 UC", price: 750 },
                    { id: "uc_660", name: "660 UC", price: 1500 }
                ]
            },
            {
                game_code: "MLBB_GLOBAL",
                game_name: "Mobile Legends Diamonds",
                game_status: "active",
                denominations: [
                    { id: "dm_86", name: "86 Diamonds", price: 200 },
                    { id: "dm_172", name: "172 Diamonds", price: 400 }
                ]
            },
            {
                game_code: "FREEFIRE_GLOBAL",
                game_name: "Free Fire Diamonds",
                game_status: "active",
                denominations: [
                    { id: "ff_100", name: "100 Diamonds", price: 220 },
                    { id: "ff_210", name: "210 Diamonds", price: 440 }
                ]
            }
        ];
        res.json({ success: true, game_list: gamesData });
    } catch (e) { res.status(500).json({ success: false, message: "فشل استدعاء الألعاب" }); }
});

// 2. مسار التحقق من حساب اللاعب داخل اللعبة (User ID Validation)
app.post('/api/games/validate-user', async (req, res) => {
    const { game_code, user_id, zone_id } = req.body;
    
    // محاكاة التحقق من الاسم: إذا أرسل أي ID، نعطيه اسم وهمي كاستجابة فورية ذكية
    if (user_id) {
        return res.json({
            success: true,
            player_name: `Hero_Player_${user_id.slice(-4)}`,
            message: "تم التحقق من الحساب بنجاح"
        });
    }
    res.status(400).json({ success: false, message: "معرف اللاعب غير صحيح" });
});

// 3. مسار معالجة عملية الشحن الفعلي وخصم الرصيد من المحفظة
app.post('/api/games/topup', async (req, res) => {
    try {
        const { phone, game_code, user_id, zone_id, denomination_id, price } = req.body;
        
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
        
        // التحقق من كفاية الرصيد بالمحفظة
        if (user.bal < price) {
            return res.status(400).json({ message: "رصيد محفظتك غير كافٍ لإتمام عملية الشحن" });
        }
        
        // خصم المبلغ وحفظ البيانات الجديدة للمحفظة
        user.bal -= price;
        await user.save();
        
        // إنشاء فاتورة فريدة وتخزين عملية الشحن داخل الـ Orders لتظهر في سجل المستخدم
        const orderId = "GAME-" + Date.now().toString().slice(-6);
        const gameOrderItem = {
            name: `شحن ألعاب: ${game_code}`,
            detail: `المعرف: ${user_id} | الفئة: ${denomination_id}`,
            price: price,
            qty: 1
        };
        
        const newOrder = new Order({
            id: orderId,
            phone: phone,
            items: [gameOrderItem],
            total: price,
            status: 'تم الشحن بنجاح' // بما أنه معتمد على الماكيت، يتم تأكيده فوراً
        });
        await newOrder.save();
        
        res.json({
            success: true,
            message: "تم الشحن وخصم الرصيد من المحفظة بنجاح 🚀",
            currentBal: user.bal,
            order: newOrder
        });
        
    } catch (e) {
        res.status(500).json({ success: false, message: "حدث خطأ أثناء معالجة عملية الشحن" });
    }
});

app.listen(PORT, () => console.log(`🚀 Secure Server running on port ${PORT}`));

