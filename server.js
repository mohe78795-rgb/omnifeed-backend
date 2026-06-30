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
        console.log("✅ متصل بـ MongoDB Atlas");
        // تشغيل دالة إدخال البيانات بمجرد الاتصال
        await seedDatabase(); 
    })
    .catch(err => console.error("❌ فشل الاتصال:", err.message));

// --- 2. تعريف الهياكل ---
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    img: String,
    cat: String
});
const Product = mongoose.model('Product', productSchema);

// --- 3. بيانات المنتجات (الصور والأسعار) ---
const initialProducts = [
    { name: "أرز بسمتي 5 كيلو", price: 12000, cat: "مواد غذائية", img: "https://i.postimg.cc/q7M8VnHz/rice.jpg" },
    { name: "زيت طبخ 1.5 لتر", price: 4500, cat: "زيوت", img: "https://i.postimg.cc/vHdb8P9G/oil.jpg" },
    { name: "حليب نيدو 900 جرام", price: 18500, cat: "ألبان", img: "https://i.postimg.cc/mD8XmYxk/nido.jpg" },
    { name: "سكر ناعم 2 كيلو", price: 3200, cat: "مواد غذائية", img: "https://i.postimg.cc/J0m0j7yD/sugar.jpg" },
    { name: "شاي الكبوس - كرتون", price: 2800, cat: "مشروبات", img: "https://i.postimg.cc/XvL4Q8w9/tea.jpg" },
    { name: "دقيق السعيد 10 كيلو", price: 8500, cat: "مواد غذائية", img: "https://i.postimg.cc/fRFGZpYm/flour.jpg" },
    { name: "مياه معدنية (شدة)", price: 1500, cat: "مشروبات", img: "https://i.postimg.cc/6pD2W8v0/water.jpg" },
    { name: "صلصة طماطم (ربطة)", price: 3800, cat: "معلبات", img: "https://i.postimg.cc/85zM6mPZ/tomato.jpg" },
    { name: "كرتون تونة (6 حبات)", price: 6500, cat: "معلبات", img: "https://i.postimg.cc/Y9S9S6Lg/tuna.jpg" },
    { name: "بيض طازج (طبق)", price: 4200, cat: "ألبان", img: "https://i.postimg.cc/7LYBvM0B/eggs.jpg" }
];

// --- 4. دالة الرفع التلقائي للقاعدة ---
async function seedDatabase() {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            console.log("⏳ قاعدة البيانات فارغة، جاري رفع المنتجات والصور...");
            await Product.insertMany(initialProducts);
            console.log("✅ تم رفع 10 منتجات بنجاح إلى MongoDB Atlas");
        } else {
            console.log(`ℹ️ يوجد بالفعل ${count} منتج في القاعدة، لن يتم التكرار.`);
        }
    } catch (err) {
        console.error("❌ خطأ أثناء رفع المنتجات:", err.message);
    }
}

// --- الإعدادات والمسارات الأخرى ---
app.use(cors());
app.use(express.json());

app.get('/api/products', async (req, res) => {
    try {
        const prods = await Product.find();
        res.json(prods);
    } catch (e) { res.status(500).json([]); }
});

// ... (باقي مسارات Signup و Login و Orders كما هي في الكود السابق)

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ: ${PORT}`));
