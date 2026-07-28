const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";

const packageSchema = new mongoose.Schema({}, { strict: false });
const MdarahimPackage = mongoose.model('MdarahimPackage', packageSchema, 'mdarahimpackages');

async function uploadPackages() {
  try {
    console.log("1. بدء محاولة الاتصال بـ MongoDB Atlas...");
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("2. تم الاتصال بنجاح!");

    console.log("3. جاري مسح المجموعة القديمة mdarahimpackages...");
    const deleteRes = await MdarahimPackage.deleteMany({});
    console.log(`تم مسح ${deleteRes.deletedCount} مستند من قاعدة البيانات.`);

    console.log("4. جاري قراءة ملف packages.json...");
    const rawData = fs.readFileSync('./packages.json', 'utf-8');
    const packages = JSON.parse(rawData);
    console.log(`تم قراءة ${packages.length} باقة من الملف المحلي.`);

    console.log("5. جاري إدراج الباقات الجديدة...");
    const result = await MdarahimPackage.insertMany(packages);
    console.log(`✅ تم رفع ${result.length} باقة بنجاح إلى Atlas!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ حدث خطأ:");
    console.error(error);
    process.exit(1);
  }
}

uploadPackages();
