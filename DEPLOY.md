# راهنمای کامل راه‌اندازی پنل SSH روی سرور شخصی

این راهنما مراحل کامل نصب پنل، راه‌اندازی دیتابیس SQLite، کانفیگ Nginx و مدیریت پروسه با PM2 را پوشش می‌دهد.

## پیش‌نیازها
- سیستم عامل: Ubuntu 20.04 یا 22.04 (یا هر توزیع لینوکس دیگر)
- دسترسی Root یا Sudo
- یک دامنه (اختیاری، اما برای SSL توصیه می‌شود)

---

## مرحله ۱: نصب Node.js و Git

ابتدا پکیج‌های سیستم را آپدیت کرده و Node.js را نصب کنید.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git build-essential -y

# نصب Node.js نسخه 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# بررسی نصب
node -v
npm -v
```

---

## مرحله ۲: کلون کردن پروژه و نصب وابستگی‌ها

پروژه را روی سرور دریافت کنید. فرض می‌کنیم پروژه در گیتهاب است یا فایل‌ها را آپلود کرده‌اید.

```bash
# رفتن به دایرکتوری مناسب
cd /var/www

# اگر پروژه روی گیت است:
# git clone https://github.com/username/ssh-panel.git
# یا فایل‌ها را آپلود کنید و وارد پوشه شوید
mkdir ssh-panel
cd ssh-panel
# (فایل‌ها را در اینجا کپی کنید)

# نصب پکیج‌ها
npm install
```

---

## مرحله ۳: بیلد کردن پروژه

از آنجایی که این یک پروژه React است، باید کدهای Frontend کامپایل شوند.

```bash
npm run build
```

بعد از این دستور، پوشه `dist` ایجاد می‌شود که حاوی فایل‌های استاتیک سایت است.

---

## مرحله ۴: راه‌اندازی دیتابیس و تست سرور

سرور Express ما به طور خودکار فایل دیتابیس SQLite را در مسیر `server/data/panel.sqlite` ایجاد می‌کند.

برای تست اولیه:
```bash
npm start
```
اگر پیام `Server is running on port 3000` و `Connected to SQLite` را دیدید، همه چیز درست است. با `Ctrl+C` خارج شوید.

---

## مرحله ۵: مدیریت پروسه با PM2

برای اینکه برنامه همیشه در پس‌زمینه اجرا شود و در صورت کرش کردن دوباره اجرا شود، از PM2 استفاده می‌کنیم.

```bash
# نصب PM2
sudo npm install -g pm2

# اجرای برنامه
pm2 start server/index.js --name "ssh-panel"

# ذخیره وضعیت برای اجرا پس از ریستارت سرور
pm2 startup
pm2 save
```

---

## مرحله ۶: نصب و کانفیگ Nginx (Reverse Proxy)

وب‌سرور Nginx درخواست‌های کاربر را از پورت 80/443 می‌گیرد و به پورت 3000 (اپلیکیشن ما) می‌فرستد.

```bash
# نصب Nginx
sudo apt install nginx -y
```

**ساخت فایل کانفیگ:**
یک فایل جدید در مسیر `/etc/nginx/sites-available/ssh-panel` بسازید:

```bash
sudo nano /etc/nginx/sites-available/ssh-panel
```

محتوای زیر را در آن قرار دهید (به جای `your-domain.com` دامنه یا IP سرور خود را بنویسید):

```nginx
server {
    listen 80;
    server_name your-domain.com; # یا IP سرور مثلا: 192.168.1.100

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**فعال‌سازی سایت:**

```bash
# ایجاد لینک سمبولیک
sudo ln -s /etc/nginx/sites-available/ssh-panel /etc/nginx/sites-enabled/

# بررسی صحت کانفیگ
sudo nginx -t

# حذف کانفیگ پیش‌فرض (اختیاری)
sudo rm /etc/nginx/sites-enabled/default

# ریستارت Nginx
sudo systemctl restart nginx
```

---

## مرحله ۷: فعال‌سازی SSL (HTTPS) رایگان

اگر دامنه دارید، حتما SSL را فعال کنید.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```
دستورالعمل‌ها را دنبال کنید تا SSL نصب شود.

---

## پایان

تبریک! پنل شما اکنون در آدرس `http://your-domain.com` (یا HTTPS) در دسترس است.
- نام کاربری پیش‌فرض: `admin`
- رمز عبور پیش‌فرض: `admin123`

اطلاعات در فایل `/var/www/ssh-panel/server/data/panel.sqlite` ذخیره می‌شوند. برای بکاپ گرفتن کافیست این فایل را کپی کنید.
