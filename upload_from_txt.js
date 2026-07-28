const fs = require('fs');
const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";
const filePath = "/sdcard/Download/ai_studio_code (4).txt";

const packageSchema = new mongoose.Schema({}, { strict: false });
const MdarahimPackage = mongoose.model('MdarahimPackage', packageSchema, 'mdarahimpackages');

async function processAndUpload() {
  try {
    console.log("1. جاري الاتصال بقاعدة البيانات MongoDB Atlas...");
    await mongoose.connect(MONGO_URI);
    console.log("2. تم الاتصال بنجاح!");

    if (!fs.existsSync(filePath)) {
      console.error(`❌ الملف غير موجود في المسار: ${filePath}`);
      process.exit(1);
    }

    console.log("3. جاري قراءة الملف النصي وتجهيز البيانات...");
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const packages = JSON.parse(rawData);
    console.log(`تم العثور على ${packages.length} باقة داخل الملف.`);

    console.log("4. جاري تنظيف المجموعة القديمة في Atlas...");
    await MdarahimPackage.deleteMany({});
    console.log("تم المسح بنجاح.");

    console.log("5. جاري رفع الباقات الجديدة...");
    const result = await MdarahimPackage.insertMany(packages);
    console.log(`\n🎉 تم بنجاح رفع ${result.length} باقة لكافة الشبكات إلى قاعدة البيانات!`);

    // حفظ نسخة محلية احتياطية في packages.json
    fs.writeFileSync('./packages.json', JSON.stringify(packages, null, 2));
    console.log("💾 تم تحديث ملف packages.json المحلي أيضاً.");

    process.exit(0);
  } catch (error) {
    console.error("❌ حدث خطأ أثناء العملية:", error.message);
    process.exit(1);
  }
}

processAndUpload();
