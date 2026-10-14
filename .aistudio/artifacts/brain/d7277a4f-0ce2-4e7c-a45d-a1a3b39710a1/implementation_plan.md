# English Vocabulary Learning Web Application (Đặc tả v4)

Kế hoạch xây dựng hệ thống web học từ vựng tiếng Anh hoàn chỉnh theo Đặc tả v4: hỗ trợ đa người dùng với cơ chế Admin phê duyệt truy cập, xác thực email OTP bảo mật, thuật toán lặp lại ngắt quãng (SRS Anki 4 nút), các chế độ học đa dạng, tích hợp Gemini AI cho tra từ tự động và sinh bài đọc ngữ cảnh, cùng giao diện tối giản hiện đại (Clean Minimalist Blue) hỗ trợ đầy đủ Dark Mode.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Dựa trên phản hồi làm rõ từ bạn, hệ thống được thiết lập theo các định hướng chính sau:

- **Cơ chế OTP trong môi trường thử nghiệm**: Khi người dùng yêu cầu mã OTP đăng nhập, hệ thống sẽ mô phỏng gửi email đồng thời **hiển thị trực tiếp mã OTP 6 số qua banner thông báo tương tác (Toast notification)** để bạn và người trải nghiệm có thể đăng nhập tức thì mà không cần cấu hình SMTP phức tạp. Mã vẫn được băm và kiểm tra hạn ngạch/thời gian nghiêm ngặt trên backend.
- **Trạng thái kho dữ liệu ban đầu**: Hệ thống khởi tạo trạng thái sạch (empty state) theo đúng yêu cầu; kèm theo nút bấm tải file mẫu CSV chuẩn hóa và nút nhập nhanh (Import / Paste table) để người dùng tự do tạo kho từ vựng của riêng mình.
- **Tài khoản Admin mặc định**: Email của bạn (`huyhoangpham387@gmail.com`) được chỉ định làm `ADMIN_EMAIL` ban đầu. Khi đăng nhập lần đầu, tài khoản sẽ tự động mang vai trò `admin` để quản lý người dùng, duyệt yêu cầu truy cập, và kiểm soát cài đặt AI.
- **Phong cách thị giác**: Giao diện tối giản hiện đại (Modern Minimalist Blue) với hệ màu xanh dương tinh tế (`slate` + `sky/blue`), chuẩn WCAG AA, hỗ trợ Dark/Light mode liền mạch và tối ưu thao tác cảm ứng trên di động.

---

## 1. Overview & Core Concept

- **Mục tiêu sản phẩm**: Cung cấp nền tảng học từ vựng tiếng Anh cá nhân hóa, giúp người học ghi nhớ lâu bền thông qua thuật toán SRS khoa học kết hợp ngữ cảnh AI thông minh.
- **Đối tượng sử dụng**: Học viên tiếng Anh ở mọi trình độ (A1–C2), người tự học thi IELTS/TOEIC/THPTQG muốn xây dựng kho từ cá nhân và luyện tập hàng ngày trên cả điện thoại lẫn máy tính.
- **Giá trị cốt lõi**:
  - Quyền riêng tư dữ liệu: Dữ liệu bộ thẻ thuộc sở hữu riêng của từng tài khoản; Admin chỉ quản trị quyền truy cập và hạn mức, không đọc nội dung cá nhân của học viên.
  - SRS hiệu quả cao: Hệ thống hàng đợi tính toán theo múi giờ địa phương (`Asia/Ho_Chi_Minh`), hỗ trợ 4 nút đánh giá (Again, Hard, Good, Easy) cùng tính năng Hoàn tác (Undo).
  - Tích hợp AI thực dụng: Tự động điền nghĩa, phân loại từ, phiên âm IPA, từ đồng nghĩa/trái nghĩa và sinh bài đọc ngữ cảnh thực tế chứa chính xác các từ vựng đang học.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Khách vãng lai & Đăng nhập**:
   - Trang đăng nhập tinh gọn: Nhập email → Nhận mã OTP (kèm banner tiện lợi trong bản dev) → Nhập mã 6 số để vào bảng điều khiển.
   - Gửi yêu cầu truy cập: Nếu chưa có tài khoản, người dùng gửi biểu mẫu yêu cầu (Email, Tên hiển thị, Lời nhắn) → Trạng thái chuyển sang `pending` chờ Admin duyệt.
2. **Bảng điều khiển Admin**:
   - Quản lý danh sách tài khoản theo tab (`Chờ duyệt`, `Hoạt động`, `Đã từ chối`, `Bị khóa`).
   - Các thao tác 1 chạm: Mời người dùng mới, Duyệt, Từ chối, Khóa tài khoản, Xem thống kê sử dụng AI toàn hệ thống.
3. **Quản lý Bộ thẻ & Nhập liệu**:
   - Tạo bộ thẻ mới với Tiêu đề, Mô tả, Chủ đề.
   - Thêm thẻ thủ công hoặc dùng nút **✨ Điền tự động** (gọi Gemini AI tra từ).
   - Nhập liệu thông minh: Hỗ trợ kéo thả file CSV hoặc Dán trực tiếp từ bảng Excel/Word (phân cách Tab), tự động ánh xạ cột, xem trước và chỉnh sửa lỗi ngay trên bảng.
4. **Không gian Học tập & Ôn tập (Study Space)**:
   - **Chế độ Học (Flashcard SRS)**: Mặt trước hiện Thuật ngữ, Loại từ, Phiên âm, nút nghe phát âm; lật thẻ xem Nghĩa tiếng Việt, Định nghĩa tiếng Anh, Ví dụ, Từ liên quan; 4 nút chấm nhớ (Again, Hard, Good, Easy) với phím tắt `1/2/3/4`, `Space/Enter`, và nút `Undo`.
   - **Chế độ Nghe Chép (Dictation)**: Nghe phát âm và gõ lại thuật ngữ tiếng Anh, có chế độ gợi ý chữ cái đầu và nghe chậm.
   - **Chế độ Trắc nghiệm & Ghép cặp (Quiz/Game)**: Luyện tập nhanh với các phương án gây nhiễu lấy ưu tiên từ chính các từ liên quan trong bộ.
   - **Chế độ Bài đọc AI (Contextual Reading)**: Chọn 5–8 từ đang học để Gemini sinh đoạn văn bài đọc sinh động (A2–C1), click vào từ mục tiêu xem ngay giải nghĩa, trả lời các câu hỏi đọc hiểu 3–5 câu.

### Visual Identity & Theme

- **Màu sắc chủ đạo**:
  - Background Light: `#f8fafc` (Slate 50), thẻ nền `#ffffff`, viền mảnh `border-slate-200`.
  - Background Dark: `#090d16` (Deep Navy Slate), thẻ nền `#0f172a`, viền `border-slate-800`.
  - Primary Accent: `#2563eb` (Royal Blue) và `#0284c7` (Sky Blue) tạo cảm giác tin cậy, sắc nét, tập trung cao độ khi học.
  - Feedback Accents: Again (`#ef4444` Rose Red), Hard (`#f59e0b` Amber), Good (`#10b981` Emerald), Easy (`#3b82f6` Blue).
- **Typography**: Phông chữ Sans-serif hiện đại (Inter / Roboto) tối ưu cho việc hiển thị song ngữ Anh - Việt và phiên âm IPA quốc tế.
- **Kỷ luật giao diện (Anti-Slop Discipline)**: Không lạm dụng huy hiệu màu lòe loẹt hay card lồng card dày đặc; hiển thị thông tin dạng văn bản thanh thoát với ký tự phân tách tinh tế (`·`), phím tắt trực quan, tương thích hoàn hảo cảm ứng di động.

---

## 3. Key Product Decisions & Trade-Offs

- **Kiến trúc Full-Stack Node.js / Express + React (Vite)**:
  - *Lựa chọn*: Tận dụng máy chủ Express chạy song hành trên port 3000 với cơ chế API proxy nội bộ và Vite middleware.
  - *Lợi ích*: Xử lý xác thực session an toàn, mã hóa HMAC cho OTP, lưu trữ dữ liệu bền vững (JSON DB với ACID transactions & atomic file writes), bảo vệ `GEMINI_API_KEY` hoàn toàn ở phía server không để lộ ra client.
- **Khoanh vùng quyền riêng tư & Bảo mật**:
  - Mọi thao tác truy vấn CSDL đều bắt buộc gắn chặt với `user_id` trích xuất từ phiên cookie `HttpOnly` đã được xác thực ở server.
  - Admin tuyệt đối không có API đọc lén nội dung thẻ/bộ thẻ/bài đọc của học viên, đúng nguyên tắc đặc tả 0.2-1.
- **Chiến lược Cache & Quản lý hạn ngạch AI**:
  - Dùng bảng cache từ điển `dictionary_cache` chia sẻ theo thuật ngữ chuẩn hóa `(term_normalized)` để tiết kiệm token và tăng tốc độ phản hồi (<200ms khi trúng cache).
  - Tích hợp kiểm tra đồng ý (AI Consent Modal) trước lần gọi đầu tiên và công tắc bật/tắt AI cho từng người dùng cũng như toàn hệ thống.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / BROWSER UI                             │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ Auth & OTP Modal │  │ Decks & Cards Mgmt  │  │ Multi-Mode Study  │  │
│  │ (Direct OTP view)│  │ (CSV/Paste Import)  │  │ (SRS, Quiz, Read) │  │
│  └─────────┬────────┘  └──────────┬──────────┘  └─────────┬─────────┘  │
│            │                      │                       │            │
│            ▼                      ▼                       ▼            │
│     React 19 + Tailwind v4 + Lucide Icons + Motion (Responsive/Dark)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Fetch (Cookie Session)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS BACKEND SERVER                          │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ Auth & Session Guard  │ │ Decks & Cards DAL    │ │ Study Engine  │  │
│  │ (HMAC OTP, RateLimit) │ │ (Isolated by UserId) │ │ (Anki SRS)    │  │
│  └──────────┬────────────┘ └──────────┬───────────┘ └───────┬───────┘  │
│             │                         │                     │          │
│             ▼                         ▼                     ▼          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ AiProvider Service (@google/genai SDK, gemini-3.8-flash, Cache)  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Data Storage Engine (Users, Decks, Cards, SRS State, Logs, Cache) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Key Tables

1. `users`: Quản lý danh tính, email chuẩn hóa (`email_canonical`), vai trò (`admin`, `user`), trạng thái (`active`, `pending`, `rejected`, `suspended`), múi giờ.
2. `login_otps`: Lưu bản băm HMAC của mã OTP, thời hạn hiệu lực (10 phút), số lần thử.
3. `sessions`: Quản lý phiên làm việc đa thiết bị với cookie bảo mật.
4. `decks` & `cards`: Lưu trữ danh sách bộ thẻ và thẻ học (thuật ngữ, nghĩa Việt, định nghĩa Anh, IPA, loại từ, từ đồng nghĩa/trái nghĩa dạng JSON, ví dụ, nhóm từ liên quan `group_name`).
5. `user_card_state`: Trạng thái thuật toán SRS độc lập theo từng hướng (`en_vi` và `vi_en`): `ease_factor`, `interval_days`, `repetitions`, `lapses`, `due_at`.
6. `review_logs`: Nhật ký ôn tập chi tiết hỗ trợ tính năng Hoàn tác (Undo).
7. `dictionary_cache` & `ai_usage`: Cache tra từ và thống kê quota Gemini.

### Kế hoạch các bước thực hiện tiếp theo

1. **Bước 1: Backend Foundation & Data Layer**:
   - Thiết lập server Express với các route API bảo mật (`/api/auth/*`, `/api/decks/*`, `/api/study/*`, `/api/dictionary/*`, `/api/admin/*`).
   - Cài đặt hệ thống lưu trữ dữ liệu bền vững chuẩn hóa theo mô hình Đặc tả v4.
   - Tích hợp lớp `AiProvider` với `@google/genai` (model `gemini-3.8-flash`) và bộ nhớ cache.
2. **Bước 2: Hệ thống Xác thực, Duyệt Admin & Quản lý Phiên**:
   - Xây dựng luồng đăng nhập OTP (với banner hiển thị mã trực tiếp trong môi trường sandbox).
   - Biểu mẫu gửi yêu cầu truy cập và giao diện Admin điều khiển phê duyệt/từ chối/mời tài khoản.
3. **Bước 3: Quản lý Bộ thẻ & Công cụ Nhập/Xuất Dữ liệu**:
   - Giao diện tạo/sửa bộ thẻ, tự động gợi ý và tra từ AI.
   - Trình phân tích CSV và Dán bảng từ Excel trực tiếp trong trình duyệt kèm xem trước và sửa lỗi.
4. **Bước 4: Trải nghiệm Học tập Toàn diện**:
   - Chế độ Flashcard SRS chuẩn Anki (4 nút đánh giá, phím tắt, Undo, lật thẻ mượt mà).
   - Chế độ Nghe Chép chính xác với giọng đọc Web Speech.
   - Chế độ Trắc nghiệm & Ghép cặp phản xạ.
   - Chế độ Bài đọc AI sinh động, tô sáng từ vựng và câu hỏi trắc nghiệm ngữ cảnh.
5. **Bước 5: Thẩm định & Tối ưu hóa**:
   - Kiểm thử cô lập dữ liệu người dùng, kiểm tra các phím tắt, kiểm tra giao diện di động và biên dịch kiểm tra tính toàn vẹn.
