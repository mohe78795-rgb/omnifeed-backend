const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const app = express();

// إعدادات الوسائط (Middleware)
app.use(cors());
app.use(express.json());

// ==========================================
// 🗄️ إعداد موديلات قاعدة البيانات (MongoDB Schemas)
// ==========================================

// 1. موديل حسابات المستخدمين والمحفظة
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleDateString('ar-YE') }
});
const User = mongoose.model('User', userSchema);

// 2. موديل الأقسام العادية
const categorySchema = new mongoose.Schema({
    name: String,
    img: String,
    sub: String
});
const Category = mongoose.model('Category', categorySchema);

// 3. موديل المنتجات العادية للسلة
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    img: String,
    cat: String
});
const Product = mongoose.model('Product', productSchema);

// 4. موديل الطلبات والفواتير العامة وفواتير السداد الفوري
const orderSchema = new mongoose.Schema({
    phone: String,
    id: String,
    status: { type: String, default: "قيد الانتظار" },
    items: Array,
    total: Number,
    date: { type: String, default: () => new Date().toLocaleDateString('ar-YE') },
    paymentMethod: String,
    referenceId: String // كود تتبع العملية الخاص بميجا سنتر
});
const Order = mongoose.model('Order', orderSchema);

// 5. موديل الإعلانات
const adSchema = new mongoose.Schema({
    videoUrl: String
});
const Ad = mongoose.model('Ad', adSchema);

// 6. موديل صندوق الرسائل والدردشة الداخلي
const messageSchema = new mongoose.Schema({
    phone: String,
    title: String,
    body: String,
    date: { type: String, default: () => new Date().toLocaleDateString('ar-YE') }
});
const Message = mongoose.model('Message', messageSchema);


// ==========================================
// 🔑 إعدادات ربط منظومة ميجا سنتر الحقيقية
// ==========================================
const MEGA_USERNAME = "u_4082361957";
const MEGA_TOKEN = "trrC6caLfhvod3HPxTE5ND9Ld6wvdsa5jm1Nlq2GrNdD7";
const MEGA_API_URL = "https://megacenter-api.com/api/v1"; // تأكد من مطابقة الرابط مع مستندات ميجا سنتر الرسمية

// دالة توليد الـ Basic Auth Header المطلوبة في توثيق ميجا سنتر
function getMegaAuthHeader() {
    const credentials = Buffer.from(`${MEGA_USERNAME}:${MEGA_TOKEN}`).toString('base64');
    return `Basic ${credentials}`;
}


// ==========================================
// 🛣️ مسارات التطبيق (API Routes)
// ==========================================

// --- [ قسم الحماية والتوثيق والمزامنة ] ---

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        let existing = await User.findOne({ phone });
        if (existing) return res.status(400).json({ success: false, message: "رقم الهاتف مسجل مسبقاً" });
        
        let newUser = new User({ name, phone, pass, bal: 0 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch(e) { res.status(500).json({ success: false, message: "خطأ في التسجيل" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        let user = await User.findOne({ phone, pass });
        if (!user) return res.status(400).json({ success: false, message: "بيانات الدخول خاطئة" });
        res.json({ success: true, user });
    } catch(e) { res.status(500).json({ success: false, message: "خطأ في الخادم" }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        let user = await User.findOne({ phone: req.params.phone });
        if (user) res.json({ success: true, user });
        else res.status(404).json({ success: false });
    } catch(e) { res.status(500).json({ success: false }); }
});


// --- [ قسم المنتجات والأقسام والإعلانات ] ---

app.get('/api/categories', async (req, res) => {
    let cats = await Category.find({});
    res.json(cats);
});

app.get('/api/products', async (req, res) => {
    let prods = await Product.find({});
    res.json(prods);
});

app.get('/api/ads', async (req, res) => {
    let ads = await Ad.find({});
    res.json(ads);
});

app.get('/api/messages/:phone', async (req, res) => {
    let msgs = await Message.find({ phone: req.params.phone });
    res.json(msgs);
});


// --- [ قسم فواتير السلة العادية ] ---

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        let user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

        if (order.paymentMethod === "دفع محفظة") {
            if (user.bal < order.total) return res.status(400).json({ message: "رصيدك غير كافٍ" });
            user.bal -= order.total;
            await user.save();
        }

        let newOrder = new Order({
            phone,
            id: "ORDER-" + Math.floor(100000 + Math.random() * 900000),
            status: "مكتمل",
            items: order.items,
            total: order.total,
            paymentMethod: order.paymentMethod
        });
        await newOrder.save();
        res.json({ success: true, currentBal: user.bal });
    } catch(e) { res.status(500).json({ message: "خطأ في معالجة الفاتورة" }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    let orders = await Order.find({ phone: req.params.phone }).sort({ _id: -1 });
    res.json(orders);
});


// ==========================================
// ⚡ الربط الحقيقي والمؤتمت مع ميجا سنتر ⚡
// ==========================================

// 1. مسار جلب باقات وخدمات السداد الحية والمحدثة مباشرة من سيرفر ميجا سنتر
app.get('/api/games', async (req, res) => {
    try {
        const form = new FormData();
        form.append('trans', 'servicelist');

        const response = await axios.post(`${MEGA_API_URL}`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': getMegaAuthHeader()
            }
        });

        // إذا أرجعت المنظومة قائمة الخدمات بنجاح
        if (response.data && response.data.game_list) {
            return res.json({ success: true, game_list: response.data.game_list });
        } else {
            return res.status(400).json({ success: false, message: "فشل استرداد الخدمات من المزود" });
        }
    } catch (error) {
        console.error("MegaCenter Sync List Error:", error.message);
        return res.status(500).json({ success: false, message: "خادم ميجا سنتر تحت الصيانة الحالية" });
    }
});

// 2. مسار معالجة طلب السداد الفوري الآمن (خصم الرصيد المحلي والشراء الفوري)
app.post('/api/games/topup', async (req, res) => {
    const { phone, price, serviceId, serviceName, user_id } = req.body;

    if (!phone || !price || !serviceId || !user_id) {
        return res.status(400).json({ success: false, message: "المعطيات المرسلة غير مكتملة" });
    }

    try {
        // التحقق من حساب العميل ورصيده محلياً لحمايتك ماليًا
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ success: false, message: "حساب العميل غير متوفر" });
        if (Number(user.bal) < Number(price)) return res.status(400).json({ success: false, message: "عذراً، رصيد محفظتك غير كافٍ" });

        // توليد Reference ID فريد للعملية لمنع التكرار والتعليق
        const referenceId = crypto.randomBytes(6).toString('hex').toUpperCase();

        // تجهيز البيانات كـ Form Data بناءً على شروط مستندات ميجا سنتر
        const form = new FormData();
        form.append('trans', 'neworder');
        form.append('serviceid', String(serviceId));
        form.append('userid', String(user_id));
        form.append('referenceid', referenceId);

        // خصم الرصيد مؤقتاً لحماية حسابك من النقرات المتكررة للزر
        user.bal -= Number(price);
        await user.save();

        // إرسال طلب الشراء الحقيقي الفوري إلى سيرفر ميجا سنتر المعتمد
        const response = await axios.post(`${MEGA_API_URL}`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': getMegaAuthHeader()
            }
        });

        const megaData = response.data;

        // في حال نجاح الطلب من سيرفرهم (True)
        if (megaData && (megaData.success === true || megaData.status === "true")) {
            
            // تسجيل الفاتورة في قاعدة بياناتك كعملية ناجحة ومكتملة فورياً
            const trackingId = "MEGA-" + Math.floor(100000 + Math.random() * 900000);
            const newOrder = new Order({
                phone,
                id: trackingId,
                status: "مكتمل فوري ✅",
                items: [{ name: serviceName, qty: 1 }],
                total: price,
                paymentMethod: "دفع محفظة",
                referenceId: referenceId
            });
            await newOrder.save();

            return res.json({
                success: true,
                orderId: trackingId,
                currentBal: user.bal
            });

        } else {
            // في حال فشل الطلب أو رفضه من ميجا سنتر (مثال: الـ ID غير صحيح أو باقة متوقفة)
            // نرجع الرصيد المخصوم تلقائياً إلى محفظة الزبون
            user.bal += Number(price);
            await user.save();

            return res.status(400).json({
                success: false,
                message: megaData.error_message || "رفضت المنظومة الشحن، يرجى التحقق من الرقم أو الـ ID"
            });
        }

    } catch (error) {
        console.error("MegaCenter API Server Topup Error:", error.message);
        // ملاحظة أمنية: في حال حدوث خطأ شبكة مفاجئ (Catch Error)، لا يتم استرجاع الرصيد آلياً 
        // لحمايتك من خسارة الرصيد في حال نفذت ميجا سنتر الطلب ولم يصلك الرد، وتراجع يدوياً.
        return res.status(500).json({ 
            success: false, 
            message: "العملية معلقة بالشبكة، يرجى مراجعة الإدارة للتأكد من حالة الشحن" 
        });
    }
});


// ==========================================
// 🚀 بدء تشغيل السيرفر والربط بقاعدة البيانات
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "ضع_رابط_قاعدة_بياناتك_هنا";
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("📊 Connected successfully to MongoDB");
        app.listen(PORT, () => console.log(`⚡ Server layout active on port ${PORT}`));
    })
    .catch(err => console.error("❌ MongoDB connection error:", err));
