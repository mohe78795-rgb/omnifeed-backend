import http.server
import json
import os
import sys
import random
from datetime import datetime

# الإعدادات الأساسية
PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'db.json')
USERS_PATH = os.path.join(BASE_DIR, 'users.json')
ORDERS_PATH = os.path.join(BASE_DIR, 'orders.json')

# التأكد من وجود الملفات الأساسية وهيكلتها
def init_files():
    if not os.path.exists(USERS_PATH):
        with open(USERS_PATH, 'w', encoding='utf-8') as f:
            json.dump({"active_users": []}, f, ensure_ascii=False, indent=2)
    if not os.path.exists(ORDERS_PATH):
        with open(ORDERS_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)

init_files()

class SmartHandler(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def load_json(self, path):
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {"active_users": []} if "users" in path else []
        except:
            return {"active_users": []} if "users" in path else []

    def save_json(self, path, data):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    # --- معالجة طلبات الجلب (GET) ---
    def do_GET(self):
        if self.path == '/api/products' or self.path == '/db.json':
            data = self.load_json(DB_PATH)
            self.send_json(data)
        elif self.path == '/api/users':
            data = self.load_json(USERS_PATH)
            self.send_json(data)
        elif self.path == '/api/orders':
            data = self.load_json(ORDERS_PATH)
            self.send_json(data)
        else:
            return super().do_GET()

    # --- معالجة طلبات الإرسال والتعديل (POST) ---
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            req_data = json.loads(post_data.decode('utf-8'))
        except:
            req_data = {}

        # 1. مسارات المستخدمين
        if self.path == '/api/sync-user':
            uuid = req_data.get('uuid')
            name = req_data.get('name')
            region = req_data.get('region', 'غير محدد')
            users_db = self.load_json(USERS_PATH)
            log_time = datetime.now().strftime("%Y/%m/%d - %H:%M:%S")

            user = None
            if uuid:
                user = next((u for u in users_db['active_users'] if str(u['uuid']) == str(uuid)), None)

            if not user:
                if not name: return self.send_json({"error": "الاسم مطلوب"}, 400)
                new_id = str(random.randint(100000, 999999))
                user = {"uuid": new_id, "name": name, "region": region, "balance": 0, "last_seen": log_time}
                users_db['active_users'].append(user)
                print(f"✨ عميل جديد: {name} (ID: {new_id})")
            else:
                user['last_seen'] = log_time
                if name: user['name'] = name
                if region: user['region'] = region

            self.save_json(USERS_PATH, users_db)
            self.send_json({"user": user})

        elif self.path == '/api/users/update-balance':
            uuid = str(req_data.get('uuid'))
            new_bal = req_data.get('balance')
            users_db = self.load_json(USERS_PATH)
            success = False
            for u in users_db['active_users']:
                if str(u['uuid']) == uuid:
                    u['balance'] = new_bal
                    success = True
                    break
            if success: self.save_json(USERS_PATH, users_db)
            self.send_json({"success": success})

        elif self.path.startswith('/api/users/delete/'):
            uuid = self.path.split('/')[-1]
            users_db = self.load_json(USERS_PATH)
            users_db['active_users'] = [u for u in users_db['active_users'] if str(u['uuid']) != str(uuid)]
            self.save_json(USERS_PATH, users_db)
            self.send_json({"success": True})

        # 2. مسارات المنتجات
        elif self.path == '/api/products':
            products = self.load_json(DB_PATH)
            req_data['id'] = int(datetime.now().timestamp())
            products.insert(0, req_data)
            self.save_json(DB_PATH, products)
            self.send_json({"success": True})

        elif self.path.startswith('/api/products/delete/'):
            p_id = self.path.split('/')[-1]
            products = self.load_json(DB_PATH)
            products = [p for p in products if str(p.get('id')) != str(p_id)]
            self.save_json(DB_PATH, products)
            self.send_json({"success": True})

        # 3. مسار الطلبات (إضافة طلب جديد)
        elif self.path == '/api/orders':
            uuid = str(req_data.get('uuid'))
            total = req_data.get('totalAmount', 0)
            pay_method = req_data.get('paymentMethod')
            
            # توليد ID فريد للطلب (توقيت بالثواني + رقم عشوائي)
            order_id = str(int(datetime.now().timestamp())) + str(random.randint(10, 99))
            req_data['orderId'] = order_id
            req_data['status'] = "received"
            req_data['time'] = datetime.now().strftime("%Y/%m/%d - %H:%M:%S")

            users_db = self.load_json(USERS_PATH)
            user = next((u for u in users_db['active_users'] if str(u['uuid']) == uuid), None)

            new_balance = None
            if pay_method == 'balance':
                if not user or user['balance'] < total:
                    return self.send_json({"success": False, "message": "رصيدك غير كافٍ"}, 400)
                user['balance'] -= total
                new_balance = user['balance']
                self.save_json(USERS_PATH, users_db)

            orders = self.load_json(ORDERS_PATH)
            orders.append(req_data)
            self.save_json(ORDERS_PATH, orders)
            
            print(f"\n📦 طلب جديد #{order_id} | العميل: {req_data.get('clientName')}")
            if req_data.get('location'):
                print(f"📍 الموقع: https://www.google.com/maps/search/?api=1&query={req_data['location']['lat']},{req_data['location']['lng']}")
            
            self.send_json({"success": True, "orderId": order_id, "newBalance": new_balance})

        # 4. مسار تحديث حالة الطلب (المسار الجديد)
        elif self.path == '/api/orders/update-status':
            order_id = str(req_data.get('orderId'))
            new_status = req_data.get('status')
            orders = self.load_json(ORDERS_PATH)
            
            success = False
            for o in orders:
                if str(o.get('orderId')) == order_id:
                    o['status'] = new_status
                    success = True
                    break
            
            if success:
                self.save_json(ORDERS_PATH, orders)
                print(f"✅ تم تحديث حالة الطلب #{order_id} إلى: {new_status}")
            
            self.send_json({"success": success})

# تشغيل السيرفر
print(f"🚀 السيرفر (بايثون) جاهز للعمل")
print(f"📡 المنفذ: {PORT}")
print(f"🛠️ تم تفعيل ميزة تحديث حالة الطلبات")
try:
    http.server.HTTPServer(('0.0.0.0', PORT), SmartHandler).serve_forever()
except KeyboardInterrupt:
    print("\n🛑 تم إيقاف السيرفر.")
    sys.exit(0)
