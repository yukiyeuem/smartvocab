# Đặc tả v4: Web học từ vựng tiếng Anh (nhiều người dùng, admin duyệt truy cập)

> **Trạng thái:** dự thảo hợp nhất, cập nhật 13-10-2026. **Thay thế** v2 và v3 (v2/v3 chỉ còn giá trị tham khảo).
> Đây là nguồn duy nhất cho dev/QA. Mọi mâu thuẫn đã nêu khi review v3 được xử lý trong tài liệu này (xem mục 0.4).
> Tính năng, giới hạn gói và giá của Cloudflare/Google có thể thay đổi: kiểm tra lại trước khi triển khai (mục 21).

## Ký hiệu

| Ký hiệu | Ý nghĩa |
|---|---|
| **FR-xx-nn** | Yêu cầu chức năng (AU = đăng nhập, AD = admin, DK = bộ thẻ, IM = nhập, DC = tra từ, RD = bài đọc, ST = học, FC = flashcard, AI = tính năng AI, SEC = bảo mật) |
| **[Chốt]** | Bạn đã quyết định |
| **[Đề xuất]** | Đề xuất đã áp dụng, chờ bạn xác nhận |
| **[Mở]** | Chưa quyết định (mục 20) |

---

## 0. Bảng quyết định

### 0.1 Đã chốt

| # | Quyết định |
|---|---|
| 1 | Web **dùng cho nhiều người**; học trên **cả điện thoại và máy tính** (giao diện ưu tiên di động) |
| 2 | **Một tài khoản admin** quyết định ai được truy cập. Người chưa được duyệt không dùng được web |
| 3 | Đăng nhập bằng **email (Gmail) + mã OTP**, không mật khẩu |
| 4 | **Chỉ học tiếng Anh**, nghĩa tiếng Việt; giao diện tiếng Việt |
| 5 | Dùng **Google AI Studio (Gemini API), gói miễn phí** để tra nghĩa, tìm từ đồng nghĩa và tạo bài đọc quanh các từ đang học |
| 6 | Không có trả phí, không Premium, không paywall |

### 0.2 Đề xuất đã áp dụng (chờ xác nhận)

| # | Đề xuất |
|---|---|
| 1 | **Admin không đọc nội dung** bộ thẻ/bài đọc của người dùng; chỉ quản lý quyền truy cập và số liệu tổng. Truy cập nội dung (nếu cần) phải ghi nhật ký |
| 2 | **Không chia sẻ/công khai bộ thẻ** ở MVP; mọi dữ liệu riêng theo từng tài khoản |
| 3 | **Tra từ yêu cầu đăng nhập** (bảo vệ hạn mức AI dùng chung) |
| 4 | **Đọc/parse file nhập ở trình duyệt**, server chỉ kiểm tra và ghi dữ liệu đã chuẩn hoá |
| 5 | Chế độ **Test/Game, Nghe Chép đứng riêng chỉ là luyện tập** (ghi log, không đổi lịch ôn); chỉ **Học** và **Kết hợp** cập nhật SRS |
| 6 | Tách "Định nghĩa" thành **Nghĩa tiếng Việt** (bắt buộc) và **Định nghĩa tiếng Anh** (tuỳ chọn) |
| 7 | Bỏ **Hội thoại AI**; Speaking để giai đoạn cuối |
| 8 | Định hướng kỹ thuật: Next.js + Tailwind + Cloudflare Workers + D1 (cần proof of concept, mục 16) |

### 0.3 Còn mở

Xem mục 20.

### 0.4 Các mâu thuẫn của v3 đã xử lý

| Vấn đề ở v3 | Cách xử lý ở v4 |
|---|---|
| Độ ưu tiên chế độ học khác nhau giữa mục 5.2/12 và 14.8 | Một bảng ưu tiên duy nhất (mục 19) |
| Cảnh báo trùng theo thuật ngữ mâu thuẫn với việc lưu nhiều nghĩa | Khoá cảnh báo trùng là `(term_normalized, part_of_speech)`; chỉ cảnh báo, không chặn (FR-DK-12) |
| `user_card_state` không phân biệt hướng thẻ | Thêm `direction` vào khoá chính (mục 11, 14) |
| `card_links` lưu liên kết n² và dễ cũ | **Bỏ bảng `card_links`**; nhóm suy ra từ `group_name`, liên kết đồng nghĩa/trái nghĩa tính lúc đọc qua `term_normalized` (FR-DK-20) |
| Tên không thống nhất (`review_log`/`review_logs`, `user_card_state`/`user_card_progress`) | Chốt `review_logs`, `user_card_state` |
| Mã FR trùng nhau (FR-31 / FR-31a) | Đánh số lại theo nhóm |
| Bộ công khai gây phụ thuộc chéo (sửa/xoá ảnh hưởng người đang học) | Không có bộ công khai ở MVP |
| Giới hạn 5.000 dòng import vượt giới hạn D1 | Chunk theo giới hạn thực tế (mục 6, 16) |

---

## 1. Tổng quan và phạm vi

### 1.1 Mục tiêu

Một web flashcard giúp người học tiếng Anh **tạo, ôn và nhớ từ mới** nhờ lặp lại ngắt quãng, có AI hỗ trợ tra nghĩa và tạo bài đọc. Truy cập có kiểm soát bởi admin.

### 1.2 Trong phạm vi

| # | Tính năng | Ưu tiên |
|---|---|---|
| 1 | Đăng nhập OTP, yêu cầu truy cập, duyệt bởi admin, quản lý phiên | P0 |
| 2 | Cô lập dữ liệu theo tài khoản | P0 |
| 3 | Tạo/sửa/xoá bộ thẻ và thẻ; quan hệ giữa các từ | P0/P2 |
| 4 | Flashcard + SRS (chế độ Học), tiến độ, Undo | P0 |
| 5 | Tra từ (Gemini), tự điền thẻ | P1 |
| 6 | Nhập CSV và dán từ bảng; xuất CSV/JSON | P1 |
| 7 | Bài đọc từ các từ đang học | P2 |
| 8 | Chế độ Nghe Chép, Test/Game, Kết hợp, Ngữ pháp | P2 |
| 9 | Tìm kiếm, từ khó, thống kê | P1/P2 |
| 10 | Speaking, đồng bộ offline, nhập XLSX/DOCX | P3 |

### 1.3 Ngoài phạm vi (non-goals)

Thanh toán/Premium; bộ thẻ công khai, chia sẻ, khám phá; Hội thoại AI; Chrome Extension; Lớp học, Xếp hạng, mạng xã hội; ứng dụng di động gốc; mật khẩu; hỗ trợ ngôn ngữ khác ngoài tiếng Anh.

### 1.4 Chỉ số thành công (gợi ý)

Số người dùng hoạt động mỗi tuần; số thẻ ôn mỗi tuần; tỷ lệ hoàn thành phiên học; tỷ lệ trúng cache của Tra từ; số lỗi 429 từ nhà cung cấp AI mỗi ngày.

---

## 2. Nguyên tắc nền tảng

1. **Dữ liệu riêng theo tài khoản.** User A không đọc, sửa, xoá hay suy ra dữ liệu của User B; **kể cả admin** (đề xuất 0.2-1).
2. **Backend là ranh giới tin cậy.** Danh tính lấy từ session đã xác minh ở server; không tin `user_id`/`owner_id` do client gửi. Ẩn nút ở giao diện không thay thế kiểm tra quyền.
3. **Trạng thái tài khoản kiểm tra ở mọi request**, để khoá có hiệu lực ngay.
4. **Mặc định riêng tư và tối thiểu hoá dữ liệu** gửi cho bên thứ ba (Google, nhà cung cấp email).
5. **App dùng được khi không có AI.** Mọi tính năng AI có đường nhập tay thay thế.
6. **Mọi thứ có thể bị gọi trực tiếp:** Route Handler và Server Action đều là endpoint công khai về mặt kỹ thuật.

---

## 3. Tài khoản và đăng nhập

### 3.1 Vai trò và trạng thái

| Vai trò | Quyền |
|---|---|
| **admin** (đúng 1 tài khoản) | Duyệt/từ chối/mời/khoá/xoá tài khoản; xem số liệu tổng; xem nhật ký; bật/tắt AI toàn cục; chỉnh hạn mức |
| **user** | Dùng app với dữ liệu của chính mình |

| Trạng thái | Ý nghĩa | Được nhận OTP / dùng API |
|---|---|:---:|
| `pending` | Đã gửi yêu cầu, chờ duyệt | Không |
| `active` | Được duyệt | Có |
| `rejected` | Bị từ chối | Không |
| `suspended` | Bị khoá | Không (mọi phiên bị huỷ) |

### 3.2 Hai đường vào hệ thống

**A. Admin mời trước:** admin nhập email → tạo tài khoản `active` → người đó đăng nhập bằng OTP.

**B. Gửi yêu cầu truy cập:** người dùng điền form (email, tên, lời nhắn) → `pending` → admin duyệt (`active`) hoặc từ chối (`rejected`) → email thông báo → người dùng đăng nhập bằng OTP.

### 3.3 Yêu cầu: yêu cầu truy cập và duyệt

| Mã | Yêu cầu |
|---|---|
| FR-AU-01 | Trang chủ cho khách chỉ có: đăng nhập, gửi yêu cầu truy cập, giới thiệu ngắn. Khách không thấy bất kỳ dữ liệu nào |
| FR-AU-02 | Form yêu cầu: email, tên hiển thị, lời nhắn (≤300 ký tự), có **Cloudflare Turnstile** (hoặc tương đương) chống tự động |
| FR-AU-03 | Giới hạn yêu cầu theo IP và email; trần số yêu cầu `pending` đồng thời; email đã có tài khoản không tạo bản ghi thứ hai |
| FR-AU-04 | Yêu cầu bị từ chối: chặn gửi lại trong 30 ngày **[Đề xuất]** |
| FR-AU-05 | Duyệt/từ chối gửi email thông báo cho người yêu cầu (nếu dịch vụ email sẵn sàng); admin có huy hiệu số yêu cầu chờ trong giao diện |

### 3.4 Yêu cầu: OTP

| Mã | Yêu cầu |
|---|---|
| FR-AU-10 | Trang đăng nhập: nhập email → "Gửi mã" → nhập mã 6 số |
| FR-AU-11 | **Chỉ gửi OTP khi email thuộc tài khoản `active`.** Mọi trường hợp khác vẫn trả về cùng một thông báo ("Nếu email đã được cấp quyền, mã sẽ được gửi") với cùng độ trễ đáp, để không dò được ai đã được duyệt và không biến hệ thống thành công cụ gửi email rác |
| FR-AU-12 | Sinh mã bằng bộ sinh ngẫu nhiên an toàn (`crypto.getRandomValues`); mã gồm 6 chữ số |
| FR-AU-13 | **Chỉ lưu bản băm** (HMAC với khoá bí mật của server), không lưu mã thô |
| FR-AU-14 | Hiệu lực 5-10 phút; dùng **một lần**; mã mới huỷ mã cũ |
| FR-AU-15 | Tối đa 5 lần nhập sai rồi huỷ mã; so sánh theo thời gian không đổi |
| FR-AU-16 | Gửi lại cách nhau ≥ 60 giây; giới hạn số mã theo email và theo IP mỗi giờ |
| FR-AU-17 | Không dùng link magic (link hay mở sang trình duyệt khác trên điện thoại và làm mất phiên); chỉ dùng mã nhập tay |

### 3.5 Yêu cầu: chuẩn hoá email (Gmail)

| Mã | Yêu cầu |
|---|---|
| FR-AU-20 | Lưu `email_canonical`: chữ thường; với `gmail.com`/`googlemail.com` bỏ dấu chấm trong phần tên và bỏ phần `+nhãn`. Dùng giá trị này để so khớp tài khoản (một hộp thư = một tài khoản); vẫn gửi email đến địa chỉ gốc người dùng nhập (`email_display`) |
| FR-AU-21 | Không cứng hoá chỉ `@gmail.com` trong mã; admin kiểm soát bằng việc duyệt/mời. (Đổi thành "chỉ Gmail" bằng một kiểm tra miền nếu bạn muốn) **[Mở]** |

### 3.6 Yêu cầu: phiên đăng nhập

| Mã | Yêu cầu |
|---|---|
| FR-AU-30 | Token ngẫu nhiên 256 bit; cookie `HttpOnly`, `Secure`, `SameSite`; **chỉ lưu bản băm** token trong CSDL |
| FR-AU-31 | Nhiều phiên cùng lúc (điện thoại + máy tính); trang "Phiên đăng nhập" liệt kê (thiết bị, thời điểm) và cho thu hồi |
| FR-AU-32 | Hết hạn trượt (đề xuất 30 ngày cho user, 7 ngày cho admin) và có trần tuyệt đối; xoay token sau khi đăng nhập |
| FR-AU-33 | Đăng xuất, đăng xuất khỏi mọi thiết bị |
| FR-AU-34 | Mỗi request kiểm tra: session hợp lệ, chưa thu hồi, **tài khoản còn `active`** |
| FR-AU-35 | Chống CSRF cho mọi Route Handler dùng cookie (kiểm tra `Origin` hoặc token); Server Action dùng cơ chế kiểm tra Origin mặc định của framework nhưng vẫn xác thực/phân quyền riêng |
| FR-AU-36 | Rate limit cho các endpoint xác thực và yêu cầu truy cập |

---

## 4. Quản trị (admin)

| Mã | Yêu cầu |
|---|---|
| FR-AD-01 | **Tạo admin đầu tiên:** đặt `ADMIN_EMAIL` trong secret; khi email đó đăng nhập OTP lần đầu và chưa có admin nào thì trở thành admin. Ràng buộc CSDL: tối đa một admin (chỉ mục duy nhất từng phần theo `role='admin'`) |
| FR-AD-02 | **Khôi phục khi mất quyền vào email admin:** quy trình tài liệu hoá (đổi `ADMIN_EMAIL` + script/migration chuyển vai trò), không có cửa sau trong ứng dụng |
| FR-AD-03 | Danh sách tài khoản theo trạng thái; thông tin hiển thị: email, tên, trạng thái, ngày tạo, lần đăng nhập cuối, số bộ thẻ/thẻ, dung lượng ước tính. **Không hiển thị nội dung bộ thẻ, bài đọc, nháp, lịch sử học hay tra từ** |
| FR-AD-04 | Hành động: mời, duyệt, từ chối, khoá, mở khoá, xoá tài khoản và toàn bộ dữ liệu |
| FR-AD-05 | **Khoá** huỷ ngay toàn bộ phiên của user đó |
| FR-AD-06 | Hành động nhạy cảm (xoá tài khoản) yêu cầu xác nhận lại bằng OTP gần đây của admin (trong 10 phút) **[Đề xuất]** |
| FR-AD-07 | Ghi **nhật ký kiểm toán** (`audit_log`) cho mọi hành động admin: ai, làm gì, với ai, khi nào; không ghi nội dung nhạy cảm |
| FR-AD-08 | Trang cài đặt ứng dụng: công tắc tắt AI toàn cục, ngân sách AI mỗi ngày, hạn mức mặc định theo user |
| FR-AD-09 | Trang theo dõi AI: mức dùng trong ngày so với ngân sách; số lỗi 429 (không hiển thị nội dung user nhập) |
| FR-AD-10 | Điều chỉnh hạn mức theo từng user (tuỳ chọn) |

---

## 5. Bộ thẻ và thẻ

### 5.1 Cấu trúc thẻ (thống nhất)

| Trường | Cột DB | Bắt buộc | Giới hạn | Ghi chú |
|---|---|:---:|---|---|
| Thuật ngữ | `term` | Có | 1-200 ký tự | Từ/cụm từ tiếng Anh |
| Nghĩa tiếng Việt | `meaning_vi` | Có | 1-1000 | **[Đề xuất]** thay cho "Định nghĩa" của v3 |
| Định nghĩa tiếng Anh | `definition_en` | Không | ≤1000 | **[Đề xuất]** giúp người học trung cấp trở lên |
| Phát âm | `phonetic` | Không | ≤100 | Ví dụ `/ækˈsɛpt/` |
| Loại từ | `part_of_speech` | Không | ≤30 | noun, verb, adj... |
| Từ đồng nghĩa | `synonyms_json` | Không | ≤20 từ, mỗi từ ≤100 | Nhập tay cách nhau `;`, lưu mảng JSON |
| Từ trái nghĩa | `antonyms_json` | Không | ≤20 từ, mỗi từ ≤100 | Như trên |
| Ví dụ | `example` | Không | ≤500 | Câu ví dụ |
| Nhóm | `group_name` | Không | ≤50 | Họ từ/cụm có liên hệ trong cùng bộ |

**Trường kỹ thuật:** `term_normalized` (chữ thường, NFC, bỏ khoảng trắng thừa; có chỉ mục), `field_sources_json` (nguồn từng trường: `manual`/`ai`/`dict`), `position`.

Bộ thẻ gồm: tiêu đề (1-100), mô tả (≤500), **chủ đề** (≤100, mô tả điểm chung của các từ).

### 5.2 Yêu cầu: tạo/sửa bộ thẻ

| Mã | Yêu cầu |
|---|---|
| FR-DK-01 | Đường vào: **+ Tạo Bộ thẻ** ở thanh bên; hoặc "tạo bộ mới" từ Tra từ |
| FR-DK-02 | Thanh hành động: **Nhập**, **Hủy** (hỏi xác nhận nếu có thay đổi), **Tạo** (nút chính). Không có công tắc công khai |
| FR-DK-03 | Thông tin chung: Tiêu đề (bắt buộc), Mô tả, Chủ đề |
| FR-DK-04 | Mỗi thẻ đánh số; Thuật ngữ và Nghĩa tiếng Việt ở hàng trên; các trường còn lại ở khu vực mở rộng |
| FR-DK-05 | Nút **✨ Điền tự động** ở ô Thuật ngữ gọi Tra từ (FR-DC) và điền các ô **còn trống**; không ghi đè nội dung đã nhập; chỉ hiển thị khi AI bật cho user |
| FR-DK-06 | **Gợi ý: Bật/Tắt:** khi bật, hiện gợi ý điền sau khi dừng gõ Thuật ngữ (dùng cache trước, tôn trọng hạn mức) |
| FR-DK-07 | Xoá thẻ (hoàn tác trong vài giây); di chuyển lên/xuống; **+ Thêm thẻ** |
| FR-DK-08 | **Tự lưu nháp cục bộ** (IndexedDB, theo `user_id`) sau ~5 giây không gõ; khi mở lại hỏi "Tiếp tục bản nháp?"; **Xóa Bản Nháp** có xác nhận. Đăng xuất hoặc đổi tài khoản trên cùng thiết bị không hiển thị nháp của tài khoản trước |
| FR-DK-09 | **Tạo** ghi bộ thẻ và toàn bộ thẻ trong **một giao dịch** (batch của D1); thành công mới xoá nháp |
| FR-DK-10 | Thứ tự thẻ trong form là `position` |
| FR-DK-11 | Hợp lệ: ≥1 thẻ có Thuật ngữ và Nghĩa tiếng Việt; thẻ lỗi được tô đỏ và cuộn tới thẻ lỗi đầu tiên |
| FR-DK-12 | **Cảnh báo trùng** khi `(term_normalized, part_of_speech)` đã có trong bộ; cho chọn "Vẫn thêm" hoặc "Bỏ qua"; không chặn |
| FR-DK-13 | Tối đa 5.000 thẻ/bộ và 200 bộ/người dùng (cấu hình được) |
| FR-DK-14 | Từ đồng nghĩa/trái nghĩa: tách theo `;`, cắt khoảng trắng, bỏ rỗng và trùng, lưu mảng JSON hợp lệ |
| FR-DK-15 | Văn bản chuẩn hoá Unicode NFC; hiển thị luôn escape (không render HTML từ nội dung người dùng) |
| FR-DK-16 | Sửa/xoá bộ thẻ và thẻ: chỉ chủ sở hữu (kiểm tra `user_id` ở server) |
| FR-DK-17 | Xoá bộ thẻ xoá thẻ, trạng thái SRS và log liên quan **của chính người đó** |

### 5.3 Yêu cầu: quan hệ giữa các từ

| Mã | Yêu cầu |
|---|---|
| FR-DK-18 | Trường **Chủ đề** (bộ) mô tả điểm chung của các từ |
| FR-DK-19 | Các thẻ cùng `group_name` trong một bộ coi là một cụm quan hệ (ví dụ họ từ accept/acceptance/acceptable); **tính lúc đọc**, không lưu liên kết |
| FR-DK-20 | **Liên kết đồng nghĩa/trái nghĩa** tính lúc đọc: từ trong `synonyms_json`/`antonyms_json` của thẻ A trùng `term_normalized` của thẻ B trong cùng bộ thì A ↔ B được coi là liên quan. Không có bảng liên kết nên không bị cũ khi sửa/xoá |
| FR-DK-21 | Mặt sau flashcard hiện **Từ liên quan trong bộ** (cùng nhóm hoặc liên kết đồng/trái nghĩa) |
| FR-DK-22 | Danh sách thẻ của bộ lọc/nhóm theo `group_name` |
| FR-DK-23 | Trắc nghiệm ưu tiên **đáp án nhiễu từ từ liên quan** rồi mới lấy ngẫu nhiên |

---

## 6. Nhập dữ liệu và xuất

### 6.1 Phạm vi theo giai đoạn

| Giai đoạn | Hỗ trợ |
|---|---|
| P1 | **Nhập CSV** và **Dán từ bảng** (copy từ Excel/Word, phân cách Tab); xuất CSV/JSON |
| P3 | XLSX, DOCX (chỉ khi parse ở trình duyệt chạy ổn) |

### 6.2 Luồng

```
[Nhập] → Chọn file hoặc Dán → Phân tích (TRONG TRÌNH DUYỆT) → Ghép cột → Xem trước & kiểm tra
       → Xác nhận → Thẻ được thêm vào form (chưa lưu) → Người dùng bấm "Tạo"
```

### 6.3 Mẫu cột

| Cột | Bắt buộc | Tên chấp nhận (không phân biệt hoa/thường) |
|---|:---:|---|
| Thuật ngữ | Có | Thuật ngữ, Term, Từ, Word |
| Nghĩa tiếng Việt | Có | Nghĩa, Nghĩa tiếng Việt, Meaning, Định nghĩa |
| Định nghĩa tiếng Anh | Không | Definition, Định nghĩa tiếng Anh |
| Phát âm | Không | Phát âm, Phonetic, IPA |
| Loại từ | Không | Loại từ, POS |
| Từ đồng nghĩa | Không | Từ đồng nghĩa, Synonyms |
| Từ trái nghĩa | Không | Từ trái nghĩa, Antonyms |
| Ví dụ | Không | Ví dụ, Example |
| Nhóm | Không | Nhóm, Group |

```csv
Thuật ngữ,Nghĩa tiếng Việt,Phát âm,Loại từ,Từ đồng nghĩa,Từ trái nghĩa,Ví dụ,Nhóm
accept,chấp nhận,/ækˈsɛpt/,verb,receive;agree,reject,She accepted the offer.,accept
acceptable,có thể chấp nhận được,/ækˈsɛptəbl/,adj,satisfactory;adequate,unacceptable,The result is acceptable.,accept
```

### 6.4 Yêu cầu

| Mã | Yêu cầu |
|---|---|
| FR-IM-01 | Chọn file bằng nút hoặc kéo thả; kiểm tra phần mở rộng, loại MIME và kích thước (≤2MB ở MVP) |
| FR-IM-02 | CSV: UTF-8 (có/không BOM); tự nhận dấu phân cách `,` `;` Tab; hỗ trợ dấu nháy kép và xuống dòng trong ô; mã hoá lạ (Windows-1258/1252) thì cảnh báo kiểm tra dấu tiếng Việt |
| FR-IM-03 | Dán từ bảng: nhận văn bản phân cách Tab, mỗi dòng một thẻ, dòng đầu có thể là tiêu đề |
| FR-IM-04 | Ghép cột tự động theo bảng 6.3, chỉnh bằng danh sách thả xuống; không có tiêu đề nhận dạng được thì hỏi và ghép theo thứ tự cột mẫu |
| FR-IM-05 | Xem trước dạng bảng: tick/bỏ từng dòng, đếm hợp lệ/lỗi/trùng; dòng lỗi tô đỏ kèm lý do và **sửa được ngay trong bảng** |
| FR-IM-06 | Dòng trùng (trong file hoặc với thẻ trong form) bị đánh dấu "Trùng" và mặc định bỏ chọn |
| FR-IM-07 | Chuẩn hoá giống FR-DK-14, FR-DK-15 |
| FR-IM-08 | Tuỳ chọn **Thêm vào cuối** hoặc **Thay thế toàn bộ thẻ trong form** (có xác nhận) |
| FR-IM-09 | **Giới hạn MVP: 1.000 dòng/lần nhập**; khi lưu, client chia thành các lô (ví dụ 200 dòng/lần gọi) để không vượt giới hạn D1 (mục 16.3). Con số cuối cùng chốt sau khi đo ở PoC |
| FR-IM-10 | Báo cáo sau nhập: "Đã thêm X thẻ, bỏ qua Y dòng lỗi, Z dòng trùng"; nút **Tải danh sách dòng lỗi** (CSV) |
| FR-IM-11 | Server **không tin dữ liệu đã parse từ client**: validate lại toàn bộ (schema, độ dài, số lượng) |
| FR-IM-12 | **Xuất** bộ thẻ hoặc toàn bộ dữ liệu của tài khoản ra CSV/JSON; khi xuất CSV, ô bắt đầu bằng `=`, `+`, `-`, `@` thêm tiền tố `'` để tránh CSV injection |

---

## 7. Tra từ (có AI)

### 7.1 Đường vào

Nút **Tra từ** (nổi bật ở thanh bên); nút **✨ Điền tự động** ở màn Tạo bộ thẻ gọi cùng dịch vụ. **Cần đăng nhập và AI đang bật cho người dùng.**

### 7.2 Dữ liệu trả về (lược đồ)

```json
{
  "term": "accept",
  "lemma": "accept",
  "senses": [{
    "pos": "verb",
    "meaning_vi": "chấp nhận",
    "definition_en": "to receive something willingly",
    "examples": ["She accepted the offer."],
    "synonyms": [{"word": "receive", "note_vi": "trung tính"}],
    "antonyms": ["reject"]
  }]
}
```

### 7.3 Yêu cầu

| Mã | Yêu cầu |
|---|---|
| FR-DC-01 | Panel: ô nhập từ; không có chọn ngôn ngữ (cố định Anh→Việt) |
| FR-DC-02 | Gọi nhà cung cấp AI **từ server**, dùng chế độ structured output (JSON schema) và **validate lại** ở server |
| FR-DC-03 | Kết quả nhóm theo nghĩa/loại từ; người dùng **chọn nghĩa nào sẽ lưu** (có thể nhiều) |
| FR-DC-04 | Đồng nghĩa/trái nghĩa tính **theo từng nghĩa và cùng loại từ** |
| FR-DC-05 | Trả về `lemma`; cảnh báo trùng dùng dạng chuẩn (ví dụ "accepted" ↔ "accept") |
| FR-DC-06 | **Lưu vào bộ thẻ:** chọn bộ có sẵn hoặc tạo mới; thẻ điền sẵn các trường có dữ liệu; mỗi trường ghi nguồn trong `field_sources_json` |
| FR-DC-07 | Hiển thị nhãn **"AI gợi ý, kiểm tra lại"**; người dùng sửa được trước khi lưu |
| FR-DC-08 | **IPA và audio không phụ thuộc hoàn toàn vào LLM** vì có thể sai: lấy từ nguồn từ điển nếu có (**[Mở]** chọn nguồn và giấy phép); không có thì để trống hoặc đánh dấu "chưa xác minh" |
| FR-DC-09 | **Cache dùng chung** theo `(term_normalized, prompt_version, model)` (nội dung từ điển không chứa dữ liệu cá nhân); trúng cache **không tính hạn mức**; đổi `prompt_version` để làm mới |
| FR-DC-10 | Từ không có kết quả/lỗi AI: thông báo, gợi ý từ gần đúng nếu có, nút **Tạo thẻ thủ công** với Thuật ngữ điền sẵn |
| FR-DC-11 | Giới hạn đầu vào: thuật ngữ ≤60 ký tự để gửi AI; ký tự lạ bị lọc |
| FR-DC-12 | Âm thanh: ưu tiên audio từ nguồn từ điển; dự phòng Web Speech Synthesis của trình duyệt; không có giọng thì ẩn nút loa |

---

## 8. Bài đọc quanh các từ đang học

| Mã | Yêu cầu |
|---|---|
| FR-RD-01 | Đầu vào: chọn từ (từ **thẻ đến hạn / thẻ mới / thẻ hay quên** hoặc chọn tay), cấp độ (A2-C1), chủ đề tuỳ chọn, độ dài 150-300 từ |
| FR-RD-02 | Số từ mục tiêu **5-8 từ mỗi bài**; vượt thì cảnh báo hoặc chia thành nhiều bài |
| FR-RD-03 | Đầu ra JSON: `title`, `passage` (đánh dấu từ mục tiêu), `used_forms [{lemma, form}]`, `questions [{q, options, answer_index}]` (3-5 câu) |
| FR-RD-04 | Server **kiểm tra** mỗi `form` trong `used_forms` xuất hiện trong `passage`; thiếu thì thử lại 1 lần, vẫn thiếu thì báo "bài chưa dùng đủ từ" và hiển thị phần đã có |
| FR-RD-05 | Hiển thị bài: từ mục tiêu được tô nổi; **bấm vào từ** xem nghĩa lấy từ **chính thẻ của người dùng** (không gọi AI) |
| FR-RD-06 | Bài đọc **không tự đổi lịch SRS**; chỉ ghi log `mode='reading'`. Người dùng có thể tự chấm từ sau khi đọc **[Đề xuất]** |
| FR-RD-07 | Lưu bài đọc theo tài khoản; giữ tối đa 50 bài gần nhất (cấu hình được); xoá được |
| FR-RD-08 | Trả lời câu hỏi và hiện đáp án/giải thích sau khi nộp |
| FR-RD-09 | Chỉ hiển thị dạng văn bản đã escape; không render HTML từ đầu ra AI |
| FR-RD-10 | Chịu hạn mức riêng và chặt hơn Tra từ (FR-AI-05) |

---

## 9. Trang bộ thẻ và các chế độ học

### 9.1 Trang bộ thẻ

| Khu vực | Nội dung |
|---|---|
| Đầu trang | Tiêu đề, mô tả, chủ đề, số thẻ, nút **Sửa**, **Xoá**, **Xuất** |
| Lưới chế độ học | Ô bấm cho từng chế độ; **Kết hợp** có nhãn **Đề xuất** |
| Tiến độ | Số thẻ mới / đang học / đã thuộc / đến hạn hôm nay |
| Danh sách thẻ | Tìm kiếm, lọc theo nhóm, đánh dấu từ khó, tạm hoãn, sửa nhanh |

### 9.2 Chế độ học

| Chế độ | Mô tả | Dữ liệu tối thiểu | Cập nhật SRS | Ưu tiên |
|---|---|---|:---:|---|
| **Học** | Flashcard theo lịch SRS (mục 10, 11) | 1 thẻ | Có | P0 |
| **Kết hợp** (Đề xuất) | Trộn nhiều dạng bài theo mức quen của thẻ | ≥4 thẻ | Có (xem 9.3) | P2 |
| **Test/Game** | Trắc nghiệm, đúng/sai, điền từ, ghép cặp | ≥4 thẻ cho trắc nghiệm | Không (luyện tập, chỉ ghi log) | P2 |
| **Nghe Chép** | Nghe phát âm rồi gõ lại | 1 thẻ + giọng đọc/audio | Không (luyện tập) | P2 |
| **Ngữ pháp** | Điền chỗ trống từ câu ví dụ; chọn đúng loại từ | Thẻ có Ví dụ | Không | P2 |
| **Đọc hiểu** | = tính năng **Bài đọc** (mục 8) | ≥3 thẻ | Không | P2 |
| **Speaking** | Đọc to từ/câu, chấm bằng nhận diện giọng nói của trình duyệt | 1 thẻ | Không | P3 |

### 9.3 Yêu cầu

| Mã | Yêu cầu |
|---|---|
| FR-ST-01 | Chế độ không đủ điều kiện dữ liệu hiển thị mờ kèm lý do khi rê/chạm |
| FR-ST-02 | **Học:** hàng đợi = thẻ đến hạn trước, rồi thẻ mới (mặc định 10 thẻ mới/ngày, tối đa 100 lượt ôn/ngày; cấu hình được); xem mục 11 |
| FR-ST-03 | **Nghe Chép:** phát âm (nghe lại, chế độ chậm), gõ lại; so khớp không phân biệt hoa/thường, bỏ khoảng trắng thừa, NFC; hiện đáp án và nghĩa; có "Hiện gợi ý" (chữ cái đầu) và "Bỏ qua" |
| FR-ST-04 | **Test/Game:** trắc nghiệm 4 đáp án (nhiễu ưu tiên từ từ liên quan; bộ <4 thẻ giảm số lựa chọn); đúng/sai; điền từ; ghép cặp có đồng hồ. Kết thúc: điểm, danh sách thẻ sai, "Học lại thẻ sai" |
| FR-ST-05 | **Kết hợp:** thẻ mới → flashcard; đang học → trắc nghiệm; khá quen → điền từ hoặc nghe chép; đã thuộc đến hạn → flashcard chấm mức nhớ. **Quy đổi điểm sang SRS:** trả lời đúng ngay lần đầu → Good; sai → Again; flashcard dùng 4 nút như thường |
| FR-ST-06 | **Ngữ pháp:** che thuật ngữ trong câu ví dụ để điền/chọn; thẻ không có ví dụ bị bỏ qua; không thẻ nào có ví dụ thì khoá kèm hướng dẫn "Thêm câu ví dụ" |
| FR-ST-07 | Mọi lượt trả lời được ghi `review_logs` (kể cả chế độ không đổi SRS) |
| FR-ST-08 | Mất mạng giữa phiên: giữ kết quả cục bộ, gửi lại khi có mạng với cùng `review_id`, không trùng bản ghi |
| FR-ST-09 | Nút **Thoát** bất kỳ lúc nào; tiến độ đã chấm được giữ |
| FR-ST-10 | Phím tắt ở mọi chế độ (mục 10.3) |

---

## 10. Flashcard

### 10.1 Giao diện

Thẻ lớn giữa màn hình; dưới thẻ có dòng nhắc phím tắt (chỉ hiển thị trên máy tính).

| Mặt | Nội dung |
|---|---|
| **Mặt trước** | Thuật ngữ (chữ lớn), *loại từ*, */phát âm/*. Ẩn dòng chưa có dữ liệu |
| **Mặt sau** | Nghĩa tiếng Việt, định nghĩa tiếng Anh, ví dụ, từ đồng/trái nghĩa, **Từ liên quan trong bộ** |

### 10.2 Điều khiển

| Điều khiển | Chức năng |
|---|---|
| Cài đặt (góc trên-trái) | Hướng thẻ, xáo trộn, chỉ thẻ đến hạn/tất cả, số thẻ mới/ngày, tự phát âm |
| Loa | Nghe phát âm |
| Công tắc | **Tự phát âm** khi hiện thẻ mới |
| Micro | Ẩn cho đến giai đoạn Speaking (P3) |
| **Undo** | Hoàn tác lượt chấm gần nhất |
| Đánh dấu từ khó / Tạm hoãn | Cờ thẻ khó; tạm hoãn thẻ khỏi hàng đợi |

### 10.3 Phím tắt (máy tính)

| Phím | Hành động |
|---|---|
| **←** / **→** | Thẻ trước / tiếp theo (không đổi SRS) |
| **Space** hoặc **Enter** | Lật thẻ |
| **1 / 2 / 3 / 4** | Chấm Again / Hard / Good / Easy (sau khi lật) |
| **U** | Hoàn tác |

Trên điện thoại: chạm để lật, vuốt để chuyển, nút chấm lớn ở cạnh dưới.

### 10.4 Yêu cầu

| Mã | Yêu cầu |
|---|---|
| FR-FC-01 | Hiện mặt trước, thanh tiến độ (ví dụ 7/40) |
| FR-FC-02 | Lật bằng Space/Enter hoặc chạm; hiệu ứng ngắn |
| FR-FC-03 | Sau khi lật ở chế độ Học: 4 nút chấm; chấm xong tự sang thẻ kế tiếp |
| FR-FC-04 | **Undo:** khôi phục trạng thái SRS trước lượt chấm gần nhất (dùng `prev_state_json` trong log), xoá bản ghi log tương ứng, quay lại thẻ đó |
| FR-FC-05 | Thẻ **Again** quay lại hàng đợi sau vài thẻ (3-5) trong cùng phiên |
| FR-FC-06 | Hết hàng đợi: tổng kết (số thẻ, tỷ lệ nhớ, thời gian, số thẻ đến hạn ngày mai) |
| FR-FC-07 | Nút loa ẩn nếu không có audio/giọng |
| FR-FC-08 | **Hướng thẻ** `en_vi` (mặc định) hoặc `vi_en` (nhớ chủ động); mỗi hướng có lịch SRS riêng |
| FR-FC-09 | Giao diện thích ứng điện thoại: vùng bấm đủ lớn, không cuộn ngang |

---

## 11. Lặp lại ngắt quãng (SRS)

Biến thể **kiểu Anki** (4 nút), không phải SM-2 gốc. Các tham số (hệ số, trần, giới hạn) là **cấu hình**, không hard-code.

### 11.1 Dữ liệu mỗi (người dùng, thẻ, hướng)

`ease_factor` (khởi tạo 2.5; min 1.3; max 3.0), `interval_days`, `repetitions` (số lần ôn thành công liên tiếp), `lapses`, `due_at`, `last_reviewed_at`, `suspended`.

### 11.2 Quy tắc cập nhật

| Đánh giá | Quy tắc |
|---|---|
| **Again** | `repetitions = 0`; `lapses += 1`; `ease = max(1.3, ease − 0.20)`; `interval = 1`; thẻ quay lại hàng đợi phiên |
| **Hard** | `repetitions == 0` → `interval = 1`; ngược lại `interval = max(1, round(interval × 1.2))`; `ease = max(1.3, ease − 0.15)`; `repetitions += 1` |
| **Good** | `repetitions == 0` → `interval = 1`; `== 1` → `6`; ngược lại `round(interval × ease)`; `repetitions += 1` |
| **Easy** | `repetitions == 0` → `4`; `== 1` → `10`; ngược lại `round(interval × ease × 1.3)`; `ease = min(3.0, ease + 0.15)`; `repetitions += 1` |

- `interval` tối thiểu 1 ngày, tối đa 365 ngày **[Đề xuất]**.
- `due_at` = **0:00 (giờ địa phương của người dùng) của ngày đến hạn**, đổi sang UTC để lưu. Hàng đợi lấy các thẻ có `due_at ≤ cuối ngày hôm nay (giờ địa phương)`.
- **Thẻ hay quên (leech):** `lapses ≥ 8` thì gắn cờ và gợi ý sửa/hoãn thẻ.
- **Thẻ mới/ngày** và **lượt ôn tối đa/ngày** là cài đặt của người dùng (mặc định 10 và 100). Khi nghỉ vài ngày, chỉ đưa tối đa số lượt ôn/ngày vào hàng đợi, phần còn lại để dành.

### 11.3 Nguồn dữ liệu chính và xử lý trễ

- **Server là nguồn chính**; giao diện cập nhật lạc quan rồi hoàn lại nếu API lỗi.
- Mỗi lượt có `review_id` do client tạo (UUID) → ghi log **idempotent**.
- Lượt ôn đến muộn (từ thiết bị offline): nếu `reviewed_at` **mới hơn** `last_reviewed_at` của thẻ thì áp dụng lên trạng thái; nếu cũ hơn chỉ ghi log và đánh dấu `late`. (Chính sách phức tạp hơn để P3.)
- "Hôm nay" tính theo `users.timezone`; mặc định `Asia/Ho_Chi_Minh`, người dùng đổi được.

---

## 12. AI: quy tắc chung

| Mã | Yêu cầu |
|---|---|
| FR-AI-01 | **Thông báo và xin đồng ý** trước lần dùng AI đầu tiên; lưu thời điểm đồng ý. Gợi ý nội dung: *"Tính năng này gửi từ bạn nhập tới Google Gemini để tạo nghĩa/bài đọc. Với gói miễn phí, Google có thể dùng nội dung này để cải thiện sản phẩm. Đừng nhập thông tin cá nhân."* |
| FR-AI-02 | Người dùng **tắt/bật AI**; tắt thì ẩn mọi nút AI, phần còn lại không đổi; mặc định **tắt** cho đến khi đồng ý |
| FR-AI-03 | **Chỉ gửi** thuật ngữ, cấp độ, chủ đề (và danh sách từ cho bài đọc). Không gửi email, tên, ID, ghi chú tự do |
| FR-AI-04 | Cache dùng chung cho Tra từ (FR-DC-09) |
| FR-AI-05 | **Hạn mức theo user và theo ngày**, tách riêng Tra từ và Bài đọc, cấu hình được; vượt hạn mức hiện thông báo rõ. Con số lấy từ giới hạn thực tế của model bạn chọn trong AI Studio, chia cho số người dùng dự kiến với biên an toàn |
| FR-AI-06 | **Ngân sách toàn app mỗi ngày**; **ngắt mạch** (tạm dừng vài phút) khi lỗi 429/`RESOURCE_EXHAUSTED` lặp lại; **công tắc tắt AI** cho admin |
| FR-AI-07 | Lớp **`AiProvider`** (`lookup()`, `generateReading()`) tách khỏi nghiệp vụ; tên model và `prompt_version` nằm trong cấu hình; ưu tiên **ghim phiên bản model** ổn định (tránh alias `latest` và bản preview) |
| FR-AI-08 | Trang admin hiển thị mức dùng so với ngân sách (không hiển thị nội dung người dùng) |
| FR-AI-09 | **Chống prompt injection:** đầu vào người dùng là dữ liệu, bao trong phân cách rõ; giới hạn độ dài (thuật ngữ ≤60 ký tự, ≤20 từ/lượt); ép JSON schema; không bao giờ render HTML từ đầu ra AI |
| FR-AI-10 | Xử lý phản hồi bị chặn/trống/sai schema bằng thông báo thân thiện và nhập tay |
| FR-AI-11 | Chống bấm đúp: khoá nút khi đang gọi; server loại trùng theo `(user, hash yêu cầu)` trong vài giây |
| FR-AI-12 | Đặt timeout rõ ràng; cho thử lại; hiển thị trạng thái đang tạo |
| FR-AI-13 | Nhật ký chỉ lưu metadata (model, số token, độ trễ, trạng thái), không lưu nội dung prompt |
| FR-AI-14 | Ghi số token mỗi lượt vào `ai_usage` để dự báo nếu sau này nâng cấp |

---

## 13. Bảo mật

| Mã | Yêu cầu |
|---|---|
| FR-SEC-01 | Mọi truy cập dữ liệu cá nhân yêu cầu session hợp lệ; `user_id` lấy từ session, không từ body/query/header client |
| FR-SEC-02 | **Mọi truy vấn dữ liệu người dùng có điều kiện `user_id`** lấy từ session; thẻ kiểm tra qua `cards.user_id` (và khớp `deck.user_id`) |
| FR-SEC-03 | Biết hoặc đoán ID bộ thẻ/thẻ/bài đọc của người khác vẫn không truy cập được; trả `404` thống nhất cho tài nguyên không thuộc quyền |
| FR-SEC-04 | **Admin không có endpoint đọc nội dung** bộ thẻ/bài đọc/nháp/log học của người dùng |
| FR-SEC-05 | Lớp truy cập dữ liệu (DAL) tập trung; giao diện/route không tự viết SQL; **luôn dùng tham số ràng buộc** (prepared statement); cấm kiểu `SELECT * FROM x WHERE id = ?` rồi tin giao diện |
| FR-SEC-06 | Validate đầu vào bằng schema ở server (Zod hoặc tương đương) dù client đã validate |
| FR-SEC-07 | Chống XSS: không dùng `dangerouslySetInnerHTML` cho nội dung người dùng/AI; thêm Content-Security-Policy |
| FR-SEC-08 | CSRF, cookie an toàn, rate limit (FR-AU-35, FR-AU-36) |
| FR-SEC-09 | Không cache dùng chung dữ liệu cá nhân: phản hồi riêng đặt `Cache-Control: private, no-store`; cache key (nếu có) gắn với user; không đưa dữ liệu riêng vào HTML dựng sẵn, metadata, thông báo lỗi hay analytics |
| FR-SEC-10 | Secret chỉ ở biến môi trường/secret của Workers: `ADMIN_EMAIL`, khoá HMAC cho OTP, khoá email, khoá Turnstile, `GEMINI_API_KEY`; không commit; nếu lộ phải thu hồi/tạo lại |
| FR-SEC-11 | Nhật ký ứng dụng không chứa token, mã OTP, nội dung nháp hay nội dung AI |
| FR-SEC-12 | **Quyền của người dùng:** xuất dữ liệu (FR-IM-12), tự xoá tài khoản và dữ liệu, trang chính sách riêng tư nêu rõ bên xử lý: nhà cung cấp email và Google (AI). Kiểm tra các quy định bảo vệ dữ liệu cá nhân hiện hành khi mở cho nhiều người |
| FR-SEC-13 | Phản hồi `request-otp` giống nhau (nội dung và thời gian) cho email được duyệt và không được duyệt |

---

## 14. Mô hình dữ liệu (D1/SQLite)

> Quy ước: `id` kiểu TEXT (UUID/ULID); thời gian lưu **UTC** (epoch ms); JSON lưu trong TEXT và kiểm tra khi đọc/ghi. Kiểm tra hành vi khoá ngoại (ràng buộc, `ON DELETE CASCADE`) trên D1 trong proof of concept.

```sql
users(
  id, email_canonical UNIQUE NOT NULL, email_display NOT NULL, display_name,
  role CHECK(role IN ('admin','user')) DEFAULT 'user',
  status CHECK(status IN ('pending','active','rejected','suspended')) NOT NULL,
  timezone DEFAULT 'Asia/Ho_Chi_Minh',
  request_note, requested_at, decided_at, decided_by,
  created_at, last_login_at
)
-- tối đa một admin:
-- CREATE UNIQUE INDEX one_admin ON users(role) WHERE role = 'admin';

login_otps(id, email_canonical, code_hash, expires_at, attempts, consumed_at,
           created_at, requested_ip_hash)

sessions(token_hash PRIMARY KEY, user_id REFERENCES users ON DELETE CASCADE,
         created_at, last_seen_at, expires_at, absolute_expires_at,
         user_agent, revoked_at)

audit_log(id, actor_id, action, target_user_id, meta_json, created_at)

user_settings(user_id PRIMARY KEY REFERENCES users ON DELETE CASCADE,
              new_cards_per_day DEFAULT 10, max_reviews_per_day DEFAULT 100,
              card_direction DEFAULT 'en_vi', auto_pronounce DEFAULT 0,
              ai_enabled DEFAULT 0, ai_consent_at, updated_at)

app_settings(key PRIMARY KEY, value)   -- ai_kill_switch, ai_daily_budget, quota mặc định...

decks(id, user_id REFERENCES users ON DELETE CASCADE, title, description, topic,
      created_at, updated_at, archived_at)

cards(id, deck_id REFERENCES decks ON DELETE CASCADE,
      user_id,               -- bằng decks.user_id (phi chuẩn hoá để kiểm tra chủ sở hữu nhanh)
      position,
      term, term_normalized, meaning_vi, definition_en, phonetic, part_of_speech,
      synonyms_json, antonyms_json, example, group_name,
      field_sources_json, flagged_hard DEFAULT 0,
      created_at, updated_at)

user_card_state(user_id, card_id REFERENCES cards ON DELETE CASCADE,
                direction CHECK(direction IN ('en_vi','vi_en')),
                ease_factor DEFAULT 2.5, interval_days DEFAULT 0, repetitions DEFAULT 0,
                lapses DEFAULT 0, due_at, last_reviewed_at, suspended DEFAULT 0,
                PRIMARY KEY (user_id, card_id, direction))

review_logs(review_id PRIMARY KEY,      -- UUID do client tạo (idempotency)
            user_id, card_id, direction, rating, mode, duration_ms,
            reviewed_at, received_at, prev_state_json, late DEFAULT 0)

dictionary_cache(cache_key PRIMARY KEY, payload_json, model, prompt_version,
                 created_at, expires_at)   -- dữ liệu từ điển chung, không có dữ liệu cá nhân

reading_passages(id, user_id, title, passage, level, topic,
                 target_card_ids_json, questions_json, model, prompt_version, created_at)

ai_usage(user_id, day, kind, count, tokens_in, tokens_out,
         PRIMARY KEY (user_id, day, kind))  -- day theo UTC

rate_limits(key PRIMARY KEY, window_start, count)  -- hoặc dùng cơ chế rate limit của Workers
```

**Chỉ mục:** `decks(user_id, updated_at)`, `cards(deck_id, position)`, `cards(deck_id, term_normalized)`, `cards(user_id, term_normalized)`, `user_card_state(user_id, due_at)`, `review_logs(user_id, reviewed_at)`, `sessions(user_id)`, `login_otps(email_canonical, created_at)`, `reading_passages(user_id, created_at)`.

---

## 15. API

```
# Xác thực & phiên
POST   /auth/request-otp          {email}                 (phản hồi chung)
POST   /auth/verify-otp           {email, code}
POST   /auth/logout
POST   /auth/logout-all
POST   /access-requests           {email, name, note, turnstile_token}
GET    /me
PATCH  /me/settings
GET    /me/sessions
DELETE /me/sessions/{id}
DELETE /me                        (tự xoá tài khoản; yêu cầu xác nhận)
GET    /me/export                 (JSON toàn bộ dữ liệu của chính mình)

# Admin (chỉ role=admin)
GET    /admin/users?status=
POST   /admin/users/invite        {email}
POST   /admin/users/{id}/approve
POST   /admin/users/{id}/reject
POST   /admin/users/{id}/suspend
POST   /admin/users/{id}/reactivate
DELETE /admin/users/{id}          (cần OTP xác nhận lại)
GET    /admin/audit
GET    /admin/settings
PATCH  /admin/settings            (công tắc AI, ngân sách, hạn mức)
GET    /admin/ai/usage

# Bộ thẻ & thẻ (luôn theo session user)
POST   /decks                     (bộ + thẻ, một giao dịch)
GET    /decks?q=
GET    /decks/{id}
PATCH  /decks/{id}
DELETE /decks/{id}
POST   /decks/{id}/cards          (thêm 1 thẻ hoặc lô ≤ giới hạn)
PATCH  /decks/{id}/cards/{cardId}
DELETE /decks/{id}/cards/{cardId}
PATCH  /decks/{id}/cards/reorder
GET    /decks/{id}/export?format=csv|json
GET    /decks/{id}/progress

# Nhập (parse ở client; server chỉ validate + ghi)
POST   /decks/{id}/cards/import   (lô dòng đã chuẩn hoá)
GET    /import/template?format=csv

# Học
GET    /study/queue?deck_id=&mode=&limit=
POST   /study/reviews             (mảng {review_id, card_id, direction, rating, mode, duration_ms, reviewed_at})
POST   /study/undo                {review_id}
GET    /stats/overview
GET    /stats/hard-words

# AI
POST   /dictionary/lookup         {term}
POST   /reading/generate          {card_ids|auto, level, topic?, length}
GET    /reading
GET    /reading/{id}
DELETE /reading/{id}
```

---

## 16. Kiến trúc và môi trường

### 16.1 Định hướng

| Lớp | Lựa chọn |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS; **ưu tiên giao diện di động**, có thể thêm PWA cài được (P2) |
| Backend | Route Handlers/Server Actions trên Cloudflare Workers; mọi endpoint tự xác thực và phân quyền |
| CSDL | Cloudflare D1, chỉ truy cập từ server |
| AI | Gemini API qua lớp `AiProvider`, gọi từ server |
| Email | Dịch vụ gửi email giao dịch **[Mở]**, kèm tên miền riêng có SPF/DKIM/DMARC để OTP không vào thư rác |
| Chống bot | Cloudflare Turnstile cho form yêu cầu truy cập |
| Validation | Zod (hoặc tương đương) ở ranh giới API |
| Quản lý gói | npm + `package-lock.json`; `npx` chỉ để chạy công cụ (Wrangler...) |

### 16.2 Runtime Cloudflare cho Next.js

Tại thời điểm viết, Cloudflare khuyến nghị **vinext** cho ứng dụng Next.js mới trên Workers, trong khi **OpenNext** vẫn được hỗ trợ và theo mô tả của vinext thì trưởng thành hơn, phủ nhiều API Next.js hơn. Vì vậy, **bắt buộc làm proof of concept (giai đoạn 0)** gồm: trang server-rendered, Route Handler đọc/ghi D1, session cookie, gửi email OTP, gọi Gemini, migration, build/deploy. Có sẵn phương án lùi sang OpenNext nếu vinext thiếu tính năng cần.

### 16.3 Giới hạn D1 cần tôn trọng (kiểm tra lại trước khi chốt)

- Tối đa **100 tham số ràng buộc mỗi truy vấn**.
- Số truy vấn mỗi lần Worker chạy: **50 (gói miễn phí) / 1000 (gói trả phí)**.
- Hệ quả: không chèn hàng nghìn thẻ bằng nhiều `INSERT` rời. Dùng chèn nhiều dòng trong từng lô nhỏ, hoặc truyền **một tham số JSON** rồi `INSERT ... SELECT ... FROM json_each(?)`, kèm giới hạn kích thước chuỗi. Đo ở proof of concept để chốt kích thước lô (FR-IM-09).
- Giới hạn dung lượng CSDL và thời gian Time Travel tuỳ gói; đo và kiểm tra tài liệu mới nhất.

### 16.4 Git, môi trường, sao lưu

- Commit: `package.json`, `package-lock.json`, `migrations/`, test, cấu hình lint/format, `.dev.vars.example` (không có secret thật). **Không commit** `.env`, `.dev.vars`, token, khoá. Lộ secret thì thu hồi, chỉ xoá khỏi commit là chưa đủ.
- Nhánh `feature/...` → pull request vào `main`; CI chạy lint, typecheck, unit test, build; chỉ triển khai production từ bản đã qua kiểm tra.
- **Ba môi trường** (local, staging, production) với binding D1 riêng; không thử migration trực tiếp lên production.
- Schema thay đổi **chỉ bằng migration** có phiên bản, lưu trong repo.
- Sao lưu: **Time Travel** của D1 (kiểm tra thời gian lưu giữ theo gói và định kỳ thử khôi phục) cộng **xuất JSON của người dùng** (FR-IM-12/`/me/export`) và một bản sao độc lập định kỳ của CSDL ở nơi bảo vệ, không công khai, không đưa lên Git.

### 16.5 Cấu trúc thư mục gợi ý

```text
src/
  app/                # route và page Next.js
  components/         # UI dùng chung
  features/           # decks, cards, study, dictionary, reading, admin
  lib/
    auth/             # OTP, session, chuẩn hoá email
    ai/               # AiProvider, prompt, schema, hạn mức
    db/               # binding D1
    dal/              # truy vấn có kiểm tra quyền
    validation/       # schema đầu vào
  types/
migrations/
tests/
```

---

## 17. Yêu cầu phi chức năng và xử lý lỗi

| Hạng mục | Yêu cầu |
|---|---|
| Hiệu năng | Hàng đợi học < 500ms; chấm thẻ phản hồi tức thì (lạc quan); Tra từ trúng cache < 800ms |
| Khả dụng | Responsive điện thoại; bàn phím đầy đủ trên máy tính; trạng thái tải (skeleton), rỗng, lỗi có nút thử lại |
| Quốc tế hoá | Chuỗi giao diện trong file ngôn ngữ (bắt đầu tiếng Việt); Unicode đúng |
| Toàn vẹn dữ liệu | Tạo bộ thẻ một giao dịch; log ôn tập bất biến và idempotent |
| Thời gian | Lưu UTC; "hôm nay" theo `users.timezone` |
| Quan sát | Log lỗi có cấu trúc, không chứa dữ liệu nhạy cảm; theo dõi tỷ lệ 429 và lỗi gửi email |

| Tình huống | Hành vi |
|---|---|
| AI hết hạn mức/lỗi | Thông báo rõ, cho nhập tay; ngắt mạch tạm thời |
| Email OTP không tới | Cho gửi lại sau 60 giây; hướng dẫn kiểm tra thư rác |
| Mất mạng khi học | Lưu cục bộ, đồng bộ sau |
| Tài khoản bị khoá khi đang dùng | Request kế tiếp bị từ chối, chuyển về trang đăng nhập kèm thông báo |
| File nhập sai/lỗi dòng | Không dừng cả file; liệt kê dòng lỗi |
| Trình duyệt không có giọng đọc | Ẩn nút loa/chế độ Nghe Chép kèm giải thích |
| Bộ thẻ rỗng | Gợi ý "Thêm thẻ đầu tiên", nút Thêm/Nhập/Tra từ |

---

## 18. Kiểm thử và tiêu chí nghiệm thu

### 18.1 Loại kiểm thử

- **Unit:** SRS (từng đánh giá, biên ease, múi giờ, qua nửa đêm), chuẩn hoá dữ liệu, chuẩn hoá email Gmail, sinh/băm/kiểm tra OTP.
- **Integration:** CRUD bộ thẻ/thẻ, phân quyền, import theo lô, idempotency của `review_logs`.
- **Bộ test truy cập chéo tự động (IDOR/BOLA):** chạy **cho mọi endpoint** với User A/User B.
- **E2E (Playwright):** đăng nhập OTP (có hộp thư giả lập), luồng học và phím tắt, nhập CSV/dán bảng.
- **AI:** mock Gemini; JSON sai định dạng, thiếu trường, trống; hết hạn mức; 429; chuỗi kiểu "ignore previous instructions"; bài đọc thiếu từ mục tiêu.

### 18.2 Tiêu chí nghiệm thu chính

**Đăng nhập và duyệt**
- Email `pending`/`rejected`/`suspended` không nhận OTP và không gọi được API.
- Phản hồi `request-otp` giống hệt (nội dung và thời gian) cho email được duyệt và không được duyệt.
- OTP: hết hạn, dùng lần hai, nhập sai quá 5 lần, gửi lại quá nhanh đều bị từ chối.
- `johndoe@gmail.com`, `john.doe@gmail.com`, `john.doe+x@gmail.com` ra cùng một tài khoản.
- Khoá tài khoản làm các phiên đang mở bị từ chối ngay ở request kế tiếp.
- Chỉ có một admin; không có API nào cho admin đọc nội dung bộ thẻ của user.
- Xoá tài khoản xoá toàn bộ dữ liệu của người đó và không ảnh hưởng ai khác.

**Cô lập dữ liệu**
- User B dùng ID của User A (bộ thẻ, thẻ, bài đọc) qua giao diện và gọi API trực tiếp → không nhận được nội dung, không thay đổi được dữ liệu.
- User B gửi `user_id` của A trong request → bị bỏ qua hoặc từ chối.
- Đăng xuất hoặc hết phiên → mọi endpoint riêng từ chối; đăng nhập B trên cùng trình duyệt không thấy dữ liệu/nháp của A.

**Bộ thẻ, nhập, học**
- Tạo bộ thiếu tiêu đề hoặc không có thẻ hợp lệ: không lưu, tô đỏ ô thiếu.
- "receive; agree; take" lưu thành 3 phần tử.
- CSV UTF-8 có dấu tiếng Việt hiển thị đúng; dán 100 dòng từ Excel nhập đúng; file vượt giới hạn bị từ chối rõ ràng.
- Chấm **Good** lần đầu: đến hạn ngày mai; lần hai: sau 6 ngày; **Again** đưa thẻ về lại hàng đợi phiên và tăng `lapses`.
- **Undo** khôi phục đúng trạng thái SRS trước đó.
- Hai hướng thẻ (`en_vi`, `vi_en`) có lịch ôn độc lập.
- Mất mạng giữa phiên: kết quả được đồng bộ lại, không trùng bản ghi.

**AI**
- Chưa đồng ý/đã tắt AI: không có request tới nhà cung cấp AI.
- Trúng cache không trừ hạn mức; vượt hạn mức hiện thông báo; ngắt mạch hoạt động khi 429 lặp lại.
- Bài đọc thiếu từ mục tiêu được thử lại hoặc cảnh báo; nội dung AI luôn hiển thị dạng văn bản đã escape.

---

## 19. Lộ trình triển khai

| Giai đoạn | Phạm vi | Điều kiện chuyển giai đoạn |
|---|---|---|
| **0. Xác minh kỹ thuật** | PoC: vinext (hoặc OpenNext) + D1 + session cookie + gửi email OTP + gọi Gemini + migration + CI | Build/deploy thành công; binding D1, gửi email và gọi AI hoạt động; đo kích thước lô ghi D1 |
| **1. Truy cập an toàn** (P0) | Đăng nhập OTP, yêu cầu truy cập, admin duyệt/mời/khoá, phiên, cô lập dữ liệu, CRUD bộ thẻ/thẻ, test IDOR | Bộ test User A/User B và test OTP đạt; admin không đọc được nội dung |
| **2. Học lõi** (P0) | Flashcard, SRS, Undo, giới hạn thẻ mới/ôn, tiến độ, hai hướng thẻ, responsive, phím tắt | Unit test SRS và integration test tiến độ đạt; dùng tốt trên điện thoại |
| **3. Nạp dữ liệu + AI** (P1) | Tra từ (Gemini + cache + hạn mức + đồng ý), tự điền, nhập CSV/dán bảng, xuất, tìm kiếm, từ khó | Lỗi AI không chặn tạo thẻ; ngắt mạch và hạn mức hoạt động; import không ghi sai tài khoản |
| **4. Học sâu** (P2) | Bài đọc, quan hệ giữa các từ, Nghe Chép, Test/Game, Kết hợp, Ngữ pháp, PWA | Kiểm thử hiệu năng với bộ thẻ lớn; tỷ lệ trúng cache và mức dùng AI nằm trong ngân sách |
| **5. Mở rộng** (P3) | Speaking, nhập XLSX/DOCX, đồng bộ offline nâng cao | Đánh giá riêng từng tính năng về chi phí, quyền riêng tư và tương thích |

---

## 20. Quyết định còn mở

| # | Câu hỏi | Gợi ý mặc định |
|---|---|---|
| 1 | Có cho **chia sẻ bộ thẻ** giữa các tài khoản được duyệt (hoặc admin tạo bộ thẻ chung)? | Không ở MVP; nếu có, dùng **sao chép** về bộ riêng, tiến độ gắn với bản sao |
| 2 | **Admin có đọc được nội dung** của user không? | Không (đề xuất 0.2-1) |
| 3 | Dịch vụ **gửi email** OTP và tên miền | Chọn dịch vụ có gói miễn phí đủ dùng; kiểm tra hạn mức và cấu hình SPF/DKIM/DMARC |
| 4 | **Nguồn IPA/audio** | Nguồn từ điển có giấy phép phù hợp; TTS trình duyệt làm dự phòng |
| 5 | Có **chỉ cho phép `@gmail.com`**? | Không cứng hoá; admin kiểm soát bằng duyệt/mời |
| 6 | **Hạn mức AI cụ thể** mỗi user/ngày | Tính từ giới hạn thực tế của model đã chọn |
| 7 | Có cần **bộ thẻ mẫu theo cấp độ** (A1-C2, TOEIC/IELTS) cho người dùng mới? | Có, từ nguồn có giấy phép mở hoặc tự biên soạn (kiểm tra giấy phép) |
| 8 | Chốt **runtime** (vinext hay OpenNext) | Theo kết quả PoC giai đoạn 0 |
| 9 | Tách **Định nghĩa** thành nghĩa Việt + định nghĩa Anh | Có (đề xuất 0.2-6) |

---

## 21. Tài liệu tham khảo kỹ thuật (kiểm tra lại trước khi triển khai)

- Cloudflare: Next.js trên Workers (vinext): https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare: OpenNext adapter: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- Cloudflare D1: https://developers.cloudflare.com/d1/ ; Migrations: https://developers.cloudflare.com/d1/reference/migrations/ ; Time Travel: https://developers.cloudflare.com/d1/reference/time-travel/ ; Limits: https://developers.cloudflare.com/d1/platform/limits/
- Next.js Authentication: https://nextjs.org/docs/app/guides/authentication
- Gemini API: giá https://ai.google.dev/gemini-api/docs/pricing ; điều khoản https://ai.google.dev/gemini-api/terms
