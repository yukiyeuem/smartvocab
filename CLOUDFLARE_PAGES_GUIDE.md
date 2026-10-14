# Hướng Dẫn Triển Khai SmartVocab.io Lên Cloudflare Pages + Cloudflare D1

Dự án **SmartVocab.io** đã được cấu hình tối ưu 100% để chạy nguyên bản (Native) trên nền tảng **Cloudflare Pages** kết hợp cùng cơ sở dữ liệu **Cloudflare D1** (Serverless SQLite phân tán toàn cầu) và **Google Gemini AI**.

---

## 1. Cấu trúc đã được thiết lập sẵn trong mã nguồn

1. **`wrangler.toml`**: Đã cấu hình kết nối database binding `DB` -> `smartvocab-db` và thư mục build tĩnh `dist`.
2. **`public/_routes.json`**: Cấu hình định tuyến thông minh. Chỉ có `/api/*` được chuyển tiếp vào Serverless Function, toàn bộ file giao diện (HTML/CSS/JS) được cache và phân phối qua mạng lưới CDN toàn cầu của Cloudflare với tốc độ mili-giây.
3. **`functions/api/[[route]].ts`**: Toàn bộ hệ thống API backend (xác thực OTP qua cookie an toàn, quản lý bộ thẻ, thuật toán ôn tập lặp lại ngắt quãng SM-2, AI tra từ vựng và tạo bài đọc) chạy trực tiếp trên Cloudflare Pages Functions và truy vấn trực tiếp vào D1.
4. **`d1-schema.sql`**: Tệp kịch bản khởi tạo sẵn toàn bộ các bảng dữ liệu (`users`, `sessions`, `decks`, `cards`, `user_card_state`, `review_logs`, `dictionary_cache`, v.v.). Ngoài ra, hệ thống cũng có cơ chế tự động khởi tạo bảng nếu phát hiện database mới.

---

## 2. Các bước triển khai chi tiết lên Cloudflare Pages (Hoàn toàn Miễn phí)

### Bước 1: Tạo cơ sở dữ liệu Cloudflare D1
Bạn có 2 cách cực kỳ nhanh:

#### Cách A: Dùng giao diện web Cloudflare Dashboard (Khuyên dùng)
1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com).
2. Vào mục **Storage & Databases** > **D1 SQL Database**.
3. Bấm **Create database**, đặt tên là `smartvocab-db`.
4. Bấm vào database vừa tạo, chọn tab **Console**, mở file `d1-schema.sql` trong dự án, copy toàn bộ nội dung và dán vào rồi bấm **Execute** để tạo các bảng.

#### Cách B: Dùng câu lệnh Wrangler (qua Terminal)
```bash
# Đăng nhập vào Cloudflare
npx wrangler login

# Tạo database D1
npx wrangler d1 create smartvocab-db

# Chạy file schema để tạo bảng
npx wrangler d1 execute smartvocab-db --file=./d1-schema.sql
```
*(Wrangler sẽ cấp cho bạn một `database_id`, bạn có thể dán vào file `wrangler.toml` nếu cần).*

---

### Bước 2: Đưa mã nguồn lên GitHub
1. Khởi tạo Git repo và push toàn bộ dự án lên tài khoản GitHub của bạn (ở chế độ Private hoặc Public tùy chọn):
```bash
git init
git add .
git commit -m "feat: configure cloudflare pages with native d1"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/smartvocab.git
git push -u origin main
```

---

### Bước 3: Tạo dự án Cloudflare Pages
1. Trên Cloudflare Dashboard, vào **Workers & Pages** > **Overview** > bấm **Create application** > chọn tab **Pages** > **Connect to Git**.
2. Chọn kho lưu trữ GitHub của bạn.
3. Cài đặt thông số build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (để trống)
4. Bấm **Save and Deploy**.

---

### Bước 4: Liên kết Database D1 & Thiết lập Biến Môi Trường (Quan trọng nhất)
Sau khi tạo dự án xong:
1. Vào dự án Pages của bạn > chọn tab **Settings**:
2. **Liên kết D1 (D1 Database Bindings)**:
   - Chọn mục **Functions** ở menu bên trái.
   - Cuộn xuống phần **D1 database bindings** > bấm **Add binding**.
   - **Variable name**: Nhập chính xác là `DB` (chữ in hoa).
   - **D1 database**: Chọn database `smartvocab-db` đã tạo ở Bước 1.
3. **Thêm biến môi trường ẩn (Environment Variables)**:
   - Chọn mục **Environment variables** ở menu bên trái.
   - Bấm **Add variables**:
     - `GEMINI_API_KEY`: Dán khóa API Google Gemini của bạn vào đây (sẽ được ẩn và mã hóa bảo mật 100% trên máy chủ Cloudflare).
     - `ADMIN_EMAIL`: `huyhoangpham387@gmail.com`
4. Vào tab **Deployments** > bấm vào dấu 3 chấm `...` của lần deploy gần nhất > chọn **Retry deployment** (để Pages nạp các biến môi trường và liên kết D1 vừa thiết lập).

---

## 3. Hoàn tất & Trải nghiệm
- Cloudflare Pages sẽ cung cấp cho bạn một tên miền miễn phí dạng: `https://smartvocab-xxx.pages.dev`.
- Bạn có thể liên kết thêm tên miền riêng miễn phí (hoặc tên miền `.io` như `smartvocab.io` sau này) trong mục **Custom domains** của Cloudflare Pages chỉ bằng vài cú click chuột với chứng chỉ SSL/TLS miễn phí trọn đời.
