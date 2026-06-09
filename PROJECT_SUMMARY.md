# Tổng quan dự án (Project Overview)

**Autoscript** là một hệ thống ứng dụng web tự động hóa và quản lý dự án, kịch bản (script) gắn liền với video. Nó cho phép người dùng quản lý các dự án của mình với thông tin siêu dữ liệu (speaker, source, video meta), đồng thời ghi lại và đồng bộ các "logs" hoặc "scripts" (như tcin, tcout, tcswap, note) cho mỗi dự án.

Dựa trên cấu trúc và logic mã nguồn, chức năng chính của hệ thống bao gồm:
- **Hệ thống Profile (Netflix-style):** Cho phép đăng nhập bằng cách chọn người dùng và nhập mã PIN thay vì username/password truyền thống.
- **Quản lý dự án (Project Management):** Khởi tạo dự án mới thông qua việc tự động nhân bản (clone) một Google Sheet template.
- **Đồng bộ hóa dữ liệu (Data Syncing):** Các bản ghi (logs/scripts) của dự án được lưu trữ trên Cloudflare KV và đồng bộ 2 chiều với Google Sheets thông qua Google Apps Script.

---

# Kiến trúc & Công nghệ (Tech Stack & Architecture)

Hệ thống được thiết kế theo kiến trúc **Serverless** kết hợp **Jamstack**, sử dụng các công nghệ sau:

## 1. Front-end
- **Công nghệ:** Vanilla HTML, CSS, JavaScript (Không sử dụng Framework nặng như React/Vue).
- **Cấu trúc thư mục (`src`):**
  - Các trang chính: `login.html`, `project.html`, `app.html`, `setting.html`. Mỗi trang được đi kèm với file `.css` và `.js` tương ứng để quản lý UI và logic.
  - Thư mục `assets/` và `app/`: Chứa các tài nguyên dùng chung, CSS layout/design-system và các module JS xử lý state, API, playback, v.v.
  - Giao diện được thiết kế hiện đại, đáp ứng tốt với các tương tác hướng sự kiện.

## 2. Back-end / Serverless
- **Cloudflare Workers (`src/worker.js`):** Đóng vai trò là Backend API chính của hệ thống.
  - Xử lý xác thực người dùng (JWT Token, Cookies).
  - Định tuyến (Routing) giữa các trang SPA và phục vụ static assets qua Cloudflare Pages/Assets.
  - Cung cấp các RESTful API (`/api/login`, `/api/projects`, `/api/project-logs`, `/api/settings`, v.v.).
- **Cloudflare KV (`SETTINGS_KV`):** Đóng vai trò là cơ sở dữ liệu NoSQL lưu trữ thông tin cấu hình (`app_settings`), danh sách người dùng (`app_users`), mã PIN (`user_pin:*`), và siêu dữ liệu các dự án của từng người dùng (`user_projects:*`).
- **`local_server.js`:** Một Node.js script dùng để tạo môi trường dev ở local. Nó giả lập hành vi định tuyến của Cloudflare Worker và mock (giả lập) các response API để có thể phát triển Front-end mà không cần kết nối tới Cloudflare thực tế.

## 3. Third-party Integration
- **Google Apps Script (`apps-script/Code.gs`):** Đóng vai trò như một Database Controller thực thụ để thao tác với Google Drive/Sheets.
  - Worker sẽ gọi Web App URL của Apps Script để thực hiện các tác vụ nặng như: copy template Sheet để tạo Project mới, đổi tên Sheet, và đồng bộ/chèn log dữ liệu kịch bản trực tiếp vào các tab (ví dụ: `Full-show`) của file Google Sheet dự án.

---

# Luồng dữ liệu và Hoạt động (Data Flow & Logic)

1. **Xác thực (Authentication) tại `login.html`:**
   - Hệ thống tải danh sách users từ API (nằm trên Cloudflare KV).
   - Người dùng chọn profile và nhập mã PIN.
   - Frontend gửi POST request tới `/api/login` (do `worker.js` xử lý). Nếu hợp lệ, Worker ký một JWT Token bằng HMAC SHA-256 và trả về dưới dạng `Set-Cookie`.
   - Trình duyệt tự động chuyển hướng tới `/tcpscript/project`.

2. **Quản lý dự án tại `project.html`:**
   - Màn hình fetch các dự án của user bằng GET `/api/projects`.
   - Khi tạo dự án mới: `worker.js` tiếp nhận, sau đó gọi **Google Apps Script** URL kèm theo thông số (`action=createProject`). Apps Script nhân bản Google Sheet gốc, trả về `spreadsheetId`.
   - Worker lưu metadata của project mới kèm `spreadsheetId` vào Cloudflare KV và trả về kết quả cho Frontend.

3. **Chi tiết thao tác tại `app.html`:**
   - Khi vào chi tiết 1 dự án (`/app/<project-id>`), Frontend giao tiếp thông qua các file module JS (`api.js`, `state.js`, `playback.js`...).
   - Log và kịch bản (script) được lấy từ Cloudflare KV (thông qua GET `/api/project-logs`).
   - Khi người dùng chỉnh sửa, lưu, hoặc cần đồng bộ lên cloud, Frontend gửi PUT `/api/project-logs`. Worker sẽ lưu cache tại KV và có logic trigger Apps Script để cập nhật dữ liệu hàng loạt (`action=syncLogs`) hoặc chèn thêm (`action=appendLog`) vào Google Sheet tương ứng.

---

# Dependencies & Cấu hình

File `package.json` định nghĩa các thông tin về thư viện và script công cụ:
- **`type: "module"`:** Sử dụng ES Modules.
- **DevDependencies:** 
  - `wrangler` (^4.96.0): Công cụ CLI chính thức của Cloudflare dùng để phát triển, test nội bộ, và deploy ứng dụng Serverless lên mạng lưới Cloudflare.
- **Scripts chính:**
  - `sync:public`: Chạy kịch bản `scripts/build-public.js` để chuẩn bị các file tĩnh.
  - `deploy`: Kết hợp quá trình build thư mục `public` và chạy lệnh `wrangler deploy` để đẩy code lên server.
- **File `wrangler.jsonc`:** Cấu hình định tuyến asset directory (`./public`) tới biến `ASSETS`, file khởi chạy chính (`src/worker.js`), URL prefix (`/tcpscript/*`), và định danh KV Namespace (`SETTINGS_KV`).

---

# Hướng dẫn Deploy & Chạy dự án

## Chạy dự án ở Local (Phát triển giao diện)
Để thiết kế và chỉnh sửa giao diện mà không ảnh hưởng tới dữ liệu thật, sử dụng môi trường giả lập:
1. Mở terminal, chạy lệnh:
   ```bash
   node local_server.js
   ```
2. Server sẽ khởi chạy tại `http://127.0.0.1:3000`.
3. Truy cập địa chỉ `http://127.0.0.1:3000/tcpscript/` trên trình duyệt. Lập trình viên có thể sử dụng màn hình đăng nhập giả lập (với các mock APIs) để kiểm thử tính năng UI.

## Quy trình Deploy lên Cloudflare
Hệ thống cung cấp sẵn các script triển khai nhanh (`Deploy_Cloudflare.bat` cho Windows và `Deploy_Cloudflare.sh` cho macOS/Linux).
1. Yêu cầu môi trường đã cài đặt Node.js và npm.
2. Chạy file thực thi:
   - Trên macOS/Linux: `./Deploy_Cloudflare.sh`
   - Trên Windows: `Deploy_Cloudflare.bat`
3. **Luồng Deploy:**
   - Script tự động kiểm tra xem `wrangler` CLI có tồn tại chưa, nếu chưa sẽ chạy `npm install`.
   - Xác thực danh tính qua tài khoản Cloudflare (`npx wrangler whoami`). Nếu chưa đăng nhập, người dùng sẽ cần chạy `npx wrangler login`.
   - Thực thi `npm run deploy`. Lệnh này tiến hành "sync" các file code từ `src` vào thư mục `public` theo cấu trúc cần thiết, sau đó gọi `wrangler deploy` đọc cấu hình từ `wrangler.jsonc` để cập nhật Worker và Assets lên hạ tầng của Cloudflare.
   - Script cũng hỗ trợ các cờ như `--dry-run` để giả lập deploy xem có gặp lỗi cấu hình hay không.
