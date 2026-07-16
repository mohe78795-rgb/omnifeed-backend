const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";

async function exportAllRemainingData() {
    try {
        console.log("⏳ جاري الاتصال بالقاعدة السحابية [test] لسحب بقية الملفات...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ متصل بنجاح!\n");

        const db = mongoose.connection.db;

        // قائمة بالمجموعات الإضافية المطلوب سحبها
        const collectionsToExport = [
            { name: 'messages', file: 'messages.json' },
            { name: 'transactions', file: 'transactions.json' },
            { name: 'appsettings', file: 'appsettings.json' },
            { name: 'devicetokens', file: 'devicetokens.json' },
            { name: 'categories', file: 'categories.json' },
            { name: 'games', file: 'games.json' },
            // المجموعات المكتوبة باللغة العربية للاحتياط
            { name: 'منتجات', file: 'products_ar.json' },
            { name: 'المستخدمون', file: 'users_ar.json' },
            { name: 'طلبات', file: 'orders_ar.json' },
            { name: 'إعلانات', file: 'ads_ar.json' }
        ];

        for (const col of collectionsToExport) {
            console.log(`📦 جاري سحب المجموعة [ ${col.name} ]...`);
            const data = await db.collection(col.name).find({}).toArray();
            fs.writeFileSync(col.file, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`✅ تم حفظ ${data.length} سجل في ملف: ${col.file}`);
        }

        console.log("\n🎉 اكتمل سحب كافة الملفات والمجموعات الأخرى بنجاح تام!");

    } catch (error) {
        console.error("❌ حدث خطأ أثناء سحب البيانات المتبقية:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 تم إغلاق الاتصال.");
    }
}

exportAllRemainingData();
