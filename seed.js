const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";

const packageSchema = new mongoose.Schema({}, { strict: false });
const MdarahimPackage = mongoose.model('MdarahimPackage', packageSchema, 'mdarahimpackages');

async function uploadPackages() {
  try {
    console.log("جاري الاتصال بقاعدة البيانات...");
    await mongoose.connect(MONGO_URI);
    console.log("تم الاتصال بنجاح!");

    // مسح الباقات القديمة
    await MdarahimPackage.deleteMany({});
    console.log("تم مسح الباقات القديمة...");

    const rawData = fs.readFileSync('./packages.json', 'utf-8');
    const packages = JSON.parse(rawData);

    const result = await MdarahimPackage.insertMany(packages);
    console.log(`تم رفع ${result.length} باقة بنجاح إلى mdarahimpackages!`);

    process.exit(0);
  } catch (error) {
    console.error("حدث خطأ أثناء الرفع:", error.message);
    process.exit(1);
  }
}

uploadPackages();
