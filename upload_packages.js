const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const MdarahimPackage = mongoose.model('MdarahimPackage', new mongoose.Schema({
    name: { type: String, required: true },
    offerId: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    type: { type: String },
    internetType: { type: String },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'mdarahimpackages');

async function run() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ خطأ: MONGO_URI غير معرف في ملف .env");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ متصل بقاعدة البيانات test...");

        const filePath = '/storage/emulated/0/بيانات الباقات/باقات يمن موبايل.json';
        
        if (!fs.existsSync(filePath)) {
            console.error("❌ الملف غير موجود! تحقق من منح Termux صلاحية الوصول للذاكرة.");
            process.exit(1);
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);

        const packagesToInsert = [];

        if (data.networks_list && Array.isArray(data.networks_list)) {
            data.networks_list.forEach(net => {
                net.Folders.forEach(folder => {
                    folder.SubFolders.forEach(sub => {
                        sub.Packages.forEach(pkg => {
                            packagesToInsert.push({
                                name: pkg.PackageName_AR,
                                offerId: pkg.ServiceApiID,
                                price: pkg.Price,
                                type: pkg.PaymentType,
                                internetType: folder.FolderName_AR
                            });
                        });
                    });
                });
            });
        }

        if (packagesToInsert.length === 0) {
            console.log("⚠️ لم يتم العثور على أي باقات داخل الملف.");
            process.exit(0);
        }

        // مسح الباقات القديمة وإدخال الجديدة
        await MdarahimPackage.deleteMany({});
        await MdarahimPackage.insertMany(packagesToInsert);

        console.log(`🎉 تم بنجاح رَفْع (${packagesToInsert.length}) باقة إلى مجموعة mdarahimpackages داخل test!`);
        process.exit(0);
    } catch (err) {
        console.error("❌ حدث خطأ أثناء العملية:", err.message);
        process.exit(1);
    }
}

run();
