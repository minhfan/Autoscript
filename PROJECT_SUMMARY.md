# PROJECT SUMMARY — TCP Autoscript v3.0

> **Vai trò phân tích:** System Architect & Senior Developer  
> **Phiên bản dự án:** 3.0.0  
> **Ngày phân tích:** 2026-06-11  
> **Mô tả ngắn gọn (package.json):** *Video Logging Tool*

---

## 1. Tổng quan dự án (Project Overview)

### Bài toán được giải quyết

**TCP Autoscript** là một công cụ chuyên nghiệp dành cho các **video editor và post-production teams** để ghi nhật ký timecode (timecode logging) khi xem lại footage. Thay vì ghi chú thủ công trên giấy hoặc bảng tính riêng lẻ, tool này cho phép:

- **Ghi nhật ký timecode** (TC IN / TC OUT / TC SWAP) ngay trên trình phát video tích hợp
- **Phân loại hành động** cho từng đoạn cắt: `DELETE`, `SWAP`, `POP-UP`, `QUESTION`, `QUOTE`, `NOTE`, `OTHERS`
- **Đồng bộ tự động** toàn bộ log lên Google Sheets theo thời gian thực
- **Quản lý đa dự án** — mỗi dự án tương ứng một Google Spreadsheet riêng được nhân bản từ template
- **Phân quyền multi-user** theo phong cách Netflix (chọn profile → nhập PIN 4 số)

### Chức năng chính

| Tính năng | Mô tả |
|-----------|-------|
| **Login / Profile System** | Netflix-style: chọn avatar → nhập PIN 4 số; lần đầu đăng nhập tự đặt PIN mới |
| **Project Management** | Tạo / sửa / xóa project; mỗi project là một Google Sheet nhân bản từ template |
| **Video Logging (app.html)** | Trình phát video tích hợp với thanh timeline, toolbar TC, bảng log có undo/redo |
| **Multi-tab Sheet** | Hỗ trợ nhiều sheet tab (Full-show, Cutdown…) trong cùng một project |
| **Google Sheets Sync** | Đồng bộ log lên Google Sheets với rich-text (bold, italic, strikethrough) |
| **Settings (Admin only)** | Cấu hình Google Apps Script URL, Template ID, Drive Folder ID |
| **Keyboard Shortcuts** | Tùy chỉnh phím tắt per-user cho các thao tác logging |
| **SRT Import** | Import phụ đề SRT để điền sẵn nội dung script vào log |

---

## 2. Kiến trúc & Công nghệ (Tech Stack & Architecture)

### Sơ đồ kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGƯỜI DÙNG (Browser)                     │
│  login.html  →  project.html  →  app.html  │  setting.html      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP + Cookie (JWT-HMAC)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER  (src/worker.js)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth/Routing│  │  REST API    │  │  Google Sheets Proxy │  │
│  │  (JWT-HMAC)  │  │  /api/*      │  │  /api/google-sheets  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                           │                      │              │
│              ┌────────────┘                      │              │
│              ▼                                   ▼              │
│  ┌───────────────────────┐      ┌────────────────────────────┐  │
│  │  Cloudflare KV Store  │      │  Google Apps Script        │  │
│  │  (SETTINGS_KV)        │      │  Web App (Code.gs)         │  │
│  │  - app_users          │      │  - createProject (clone)   │  │
│  │  - user_pin:<name>    │      │  - syncLogs (write sheet)  │  │
│  │  - user_projects:<n>  │      │  - appendLog               │  │
│  │  - project_logs:<...> │      │  - getTabs / updateInfo    │  │
│  │  - user_actions:<n>   │      └────────────────────────────┘  │
│  │  - app_settings       │                      │              │
│  └───────────────────────┘                      ▼              │
│              │                     ┌────────────────────────┐  │
│              │                     │  Google Drive & Sheets  │  │
│              └────────────────────►│  (Spreadsheets per     │  │
│                                    │   project)              │  │
│                                    └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │
                    static assets
                          ▼
                 ┌────────────────┐
                 │  public/ dir   │
                 │  (ASSETS KV)   │
                 └────────────────┘
```

---

### 2.1 Front-end — Phân tích cấu trúc `src/`

Dự án sử dụng **Vanilla HTML + CSS + JavaScript thuần** (không framework), được tổ chức theo dạng Multi-Page Application (MPA). Quá trình build sẽ **inline** CSS và JS vào HTML để tạo file monolith trong thư mục `public/`.

#### Cấu trúc thư mục `src/`

```
src/
├── login.html / login.css / login.js        ← Trang xác thực Netflix-style
├── project.html / project.css / project.js  ← Dashboard quản lý dự án
├── setting.html / setting.css / setting.js  ← Trang cài đặt (Admin only)
├── app.html                                 ← Shell SPA cho màn hình logging
├── worker.js                                ← Cloudflare Worker (backend)
│
├── js/
│   ├── app.js       ← Monolith JS cho app.html (build artifact)
│   └── timecode.js  ← Timecode utility (parse HH:MM:SS:ff)
│
└── assets/app/
    ├── js/                    ← Modules cho app.html (source modular)
    │   ├── constants.js       ← Action types, colors, storage keys
    │   ├── state.js           ← Global mutable state declarations
    │   ├── api.js             ← Cloudflare KV & Google Sheets API calls
    │   ├── init.js            ← App initialization, event listeners
    │   ├── renderer.js        ← DOM rendering engine (table, toolbar…)
    │   ├── playback.js        ← Video player controls & timecode sync
    │   ├── tabs.js            ← Sheet tab switching & cache management
    │   ├── toolbar.js         ← TC input toolbar, action dropdown
    │   ├── timeline.js        ← Visual timeline overlay on video
    │   ├── modals.js          ← Modal dialogs (message, confirm, edit)
    │   ├── shortcuts.js       ← Keyboard shortcut manager
    │   ├── storage.js         ← localStorage helpers
    │   ├── timecode.js        ← Timecode conversion utilities
    │   └── srt_parser.js      ← SRT subtitle import parser
    │
    └── styles/                ← CSS modules cho app.html
        ├── design-system.css  ← CSS variables, color tokens
        ├── layout.css         ← Grid layout, panels, resizable areas
        ├── table.css          ← Log table styles
        ├── timeline.css       ← Timeline overlay styles
        └── modals.css         ← Modal dialog styles
```

#### Phân tích từng màn hình

| File | Chức năng |
|------|-----------|
| `login.html` + `login.js` | Profile picker (Netflix-style grid), PIN lock screen 4 ô, animation shake khi sai PIN |
| `project.html` + `project.js` | Dashboard dự án: danh sách card, lọc trạng thái (ongoing/not_started/done), tạo/sửa/xóa project |
| `app.html` + `src/assets/app/js/*` | Màn hình logging chính: video player, timeline, bảng TC log, toolbar, sync Google Sheets |
| `setting.html` + `setting.js` | Admin panel: cấu hình Google Apps Script URL, Template ID, quản lý users & PIN |

---

### 2.2 Back-end / Serverless — `src/worker.js` & `local_server.js`

#### `src/worker.js` — Cloudflare Worker (Production Backend)

**Cloudflare Worker** đóng vai trò là API gateway và router duy nhất của ứng dụng, chạy hoàn toàn ở Edge, không cần server truyền thống.

**Tiền tố URL:** Tất cả routes đều đi qua prefix `/tcpscript`

| Route | Method | Quyền | Mô tả |
|-------|--------|-------|-------|
| `/api/users/profiles` | GET | Public | Lấy danh sách profile để hiển thị |
| `/api/login` | POST | Public | Xác thực username + PIN, trả JWT |
| `/api/users` | GET/POST/DELETE | Admin only | Quản lý user (CRUD) |
| `/api/projects` | GET/POST/PUT/DELETE | Authenticated | CRUD dự án của user |
| `/api/projects/meta` | GET | Authenticated | Lấy metadata một project theo ID/slug |
| `/api/projects/video-meta` | PUT | Authenticated | Lưu metadata video file của project |
| `/api/project-logs` | GET/PUT | Authenticated | Đọc/ghi log theo projectId + tab |
| `/api/settings` | GET/POST | GET: Auth; POST: Admin | Cài đặt ứng dụng toàn cục |
| `/api/google-sheets` | GET/POST | Authenticated | Proxy tới Google Apps Script |
| `/api/actions` | GET/PUT | Authenticated | Custom action list per-user |
| `/login`, `/project`, `/setting` | GET | Public/Protected | Phục vụ static HTML |
| `/app/:projectSlug` | GET | Authenticated | Phục vụ app.html với project validation |

**Hệ thống xác thực:**
- **Thuật toán:** HMAC-SHA256 (Web Crypto API), token tự tạo dạng `hex(msg).hex(signature)`
- **Payload:** `username:expiry_timestamp`, hết hạn sau **30 ngày**
- **Vận chuyển:** Cookie `HttpOnly`-like (`autoscript_session_token`) + `Authorization: Bearer <token>` header
- **Phân quyền:** `Admin` user được quyền truy cập thêm `/api/settings` (POST) và `/api/users`

**Cloudflare KV namespace `SETTINGS_KV` — Schema dữ liệu:**

```
app_users                           → [{ username, hasPin }]
user_pin:<username>                 → "1234" (plain string)
user_projects:<username>            → [{ id, name, slug, url, status, speaker, source, link, createdAt, videoMeta }]
project_logs:<username>:<id>:<tab>  → [{ action, tcin, tcout, tcswap, script, note }]
user_actions:<username>             → ["DELETE", "POP-UP", ...]
app_settings                        → { googleSheetsWebAppUrl, googleTemplateId, googleDriveFolderId }
```

#### `local_server.js` — Local Development Server

Node.js HTTP server thuần (không dùng Express) để phát triển local mà không cần Cloudflare:
- Phục vụ static files từ `src/` và `public/`
- **Mock các API** (`/api/users/profiles`, `/api/login`, `/api/projects`) với data giả
- Mô phỏng routing logic của Cloudflare Worker (clean URLs, prefix `/tcpscript`)
- Lắng nghe tại `http://127.0.0.1:3000`

#### `wrangler.jsonc` — Cấu hình Cloudflare

```jsonc
{
  "name": "autoscript",
  "main": "src/worker.js",          // Entry point cho Cloudflare Worker
  "compatibility_date": "2026-06-02",
  "assets": {
    "directory": "./public",         // Thư mục static files
    "binding": "ASSETS",
    "run_worker_first": [            // Routes được xử lý bởi Worker trước (không serve static)
      "/tcpscript/api*",
      "/tcpscript/login*",
      "/tcpscript/app*",
      ...
    ]
  },
  "kv_namespaces": [
    { "binding": "SETTINGS_KV", "id": "dd5dc60c58a74a4f88684641ca495836" }
  ]
}
```

---

### 2.3 Third-party Integration — `apps-script/Code.gs`

**Google Apps Script (GAS)** được deploy riêng biệt như một **Web App** trên tài khoản Google của chủ dự án. Đây là lớp trung gian duy nhất có quyền đọc/ghi Google Drive & Sheets.

**Lý do cần GAS thay vì Google Sheets API trực tiếp:**
> Cloudflare Worker không thể giữ OAuth2 credentials của người dùng. GAS Web App chạy dưới quyền của chủ sở hữu script, cho phép thao tác Drive/Sheets mà không cần user auth phức tạp.

**Các action được hỗ trợ (qua query param `?action=`):**

| Action (GET) | Mô tả |
|--------------|-------|
| `createProject` | Nhân bản template Spreadsheet, set sharing, điền speaker/source vào ô B1/B2, di chuyển vào Drive folder |
| `updateInfo` | Đổi tên Spreadsheet và cập nhật metadata (speaker, source) trên sheet "Full-show" |
| `getProjectInfo` | Đọc speaker (B1) và source (B2) từ sheet "Full-show" |
| `getTabs` | Trả về danh sách tên các sheet tab trong Spreadsheet |

| Action (POST body `action`) | Mô tả |
|-----------------------------|-------|
| `syncLogs` | Xóa dữ liệu từ dòng 5 trở xuống và ghi toàn bộ log mới (với RichText formatting) |
| `appendLog` | Chèn thêm log đơn lẻ vào tab chỉ định (dùng cho Cutdown) |

**RichText Rendering:** GAS có hàm `buildRichTextFromHtml()` chuyển đổi HTML tags (`<b>`, `<i>`, `<strike>`, `<br>`) thành `RichTextValue` của Google Sheets, giữ nguyên định dạng khi đồng bộ.

---

## 3. Luồng dữ liệu và Hoạt động (Data Flow & Logic)

### 3.1 Luồng Đăng nhập (login.html → project.html)

```
[Browser] login.html tải xong
     │
     ▼
login.js: fetch GET /tcpscript/api/users/profiles
     │  ← [Worker] đọc KV: app_users
     │  → Trả về [{username, hasPin}, ...]
     │
     ▼
Render danh sách profile cards (Netflix-style grid)
     │
     ▼ [User chọn một profile]
     │
Hiển thị PIN screen (4 ô nhập số)
     │
     ▼ [User nhập đủ 4 số → tự động submit]
     │
login.js: fetch POST /tcpscript/api/login
          body: { username, pin }
     │  ← [Worker] kiểm tra KV: user_pin:<username>
     │     Nếu chưa có PIN → lưu PIN mới (first-time)
     │     Nếu có PIN → so sánh
     │  → Trả về { success, token, username }
     │
     ▼
Lưu token vào localStorage + Cookie
Pre-cache settings (googleSheetsWebAppUrl, templateId)
     │
     ▼
window.location.href = '/tcpscript/project'
```

### 3.2 Luồng Quản lý Dự án (project.html)

```
[project.html tải]
     │
project.js: fetch GET /tcpscript/api/projects (với Bearer token)
     │  ← [Worker] xác thực JWT → đọc KV: user_projects:<username>
     │  → Trả về mảng projects[]
     │
     ▼
Render danh sách project cards (lọc theo status)
     │
     ├─ [Tạo project mới]
     │       │
     │       ▼
     │  fetch POST /tcpscript/api/projects { name, status, speaker, source, link }
     │       │
     │       ▼
     │  [Worker] gọi Google Apps Script Web App:
     │       ?action=createProject&name=...&templateId=...&folderId=...
     │       │
     │       ▼ [GAS] Nhân bản template Spreadsheet, set permissions
     │       │
     │       ▼
     │  [Worker] lưu project mới vào KV: user_projects:<username>
     │  → Trả về project metadata (id = spreadsheetId, url, slug)
     │
     └─ [Mở project → app.html]
             │
             ▼
     Điều hướng: /tcpscript/app/<project-slug>
```

### 3.3 Luồng Logging Chính (app.html)

```
[app.html tải — Worker xác thực slug → phục vụ file]
     │
init.js: resolveCurrentSpreadsheetMeta()
     │  fetch GET /tcpscript/api/projects/meta?id=<slug>
     │  → Đọc currentSpreadsheetId, currentSpreadsheetName, videoMeta
     │
     ▼
loadSheetTabsFromGoogle()
     │  fetch GET /tcpscript/api/google-sheets?action=getTabs&id=<spreadsheetId>
     │  → [Worker Proxy → GAS] Trả về danh sách tab names
     │
     ▼
loadProjectLogsFromKV()
     │  fetch GET /tcpscript/api/project-logs?id=<id>&tab=Full-show
     │  → Đọc logs từ KV: project_logs:<username>:<id>:<tab>
     │
     ▼
Render bảng log (renderer.js) + Timeline (timeline.js)
     │
[User kéo video file → HTML5 File API]
     │  playback.js xử lý video element
     │  persistProjectVideoMeta() → PUT /tcpscript/api/projects/video-meta
     │
[User đánh dấu TC IN/OUT/SWAP]
     │  toolbar.js ghi vào activeInSec, activeOutSec, activeSwapSec (state.js)
     │
[User nhấn Log / Shortcut]
     │  Thêm log entry vào mảng logs[] (state.js)
     │  renderer.js re-render bảng
     │  Debounce timer → saveProjectLogsToKV()
     │      PUT /tcpscript/api/project-logs { projectId, sheetTab, logs[] }
     │
[User nhấn "Sync Sheet"]
     │  syncToGoogleSheets()
     │      POST /tcpscript/api/google-sheets
     │         { action:'syncLogs', sheetId, tab, values[][] }
     │      → [Worker Proxy → GAS doPost()]
     │      → GAS ghi lên Google Sheets với RichText formatting
```

### 3.4 Giao tiếp Front-end ↔ Backend

Tất cả API calls từ front-end đều:
1. Gửi qua đường dẫn `/tcpscript/api/*` (cùng origin → không bị CORS)
2. Đính kèm `Authorization: Bearer <token>` header (token lấy từ `localStorage`)
3. Worker nhận request → xác thực JWT → xử lý → trả `application/json`

**State Management:** `state.js` khai báo tất cả biến global mutable. Các module khác (`api.js`, `renderer.js`, `toolbar.js`...) đọc/ghi trực tiếp vào các biến này (không có reactive framework). Build process (build-app-source.js) concatenate tất cả module JS thành một file duy nhất trước khi nhúng vào HTML.

---

## 4. Dependencies & Cấu hình

### `package.json`

```json
{
  "name": "autoscript",
  "version": "3.0.0",
  "description": "Video Logging Tool",
  "type": "module",
  "devDependencies": {
    "wrangler": "^4.96.0"
  }
}
```

| Dependency | Phiên bản | Mục đích |
|------------|-----------|----------|
| `wrangler` | ^4.96.0 | Cloudflare Workers CLI: deploy, dev server, KV management |

> **Lưu ý:** Dự án không có production dependencies. Toàn bộ front-end là Vanilla JS, không dùng npm packages ở runtime.

### Các npm scripts

| Script | Lệnh | Mô tả |
|--------|------|-------|
| `sync:app-source` | `node scripts/build-app-source.js` | Rebuild file `src/js/app.js` từ các module trong `src/assets/app/js/` |
| `verify:refactor` | `node scripts/verify-refactor.js` | Kiểm tra tính đầy đủ của quá trình refactor module |
| `sync:public` | `node scripts/build-public.js` | Build tất cả HTML pages vào `public/` (inline CSS + JS) |
| `deploy` | `sync:public && wrangler deploy` | Build rồi deploy lên Cloudflare |
| `deploy:dry-run` | `sync:public && wrangler deploy --dry-run` | Build và kiểm tra cấu hình mà không deploy thật |

### Fonts & External Resources

- **Google Fonts:** `Outfit` (UI text) + `JetBrains Mono` (timecode display)
- **Google Apps Script Web App:** URL được cấu hình trong `app_settings` KV (Admin panel)
- **Google Drive Template Spreadsheet ID:** `1S6YxzKJE7X5vZRZduA36KDc_E00Cdkxp2mD3VXhwfmA`

---

## 5. Hướng dẫn Deploy & Chạy dự án

### 5.1 Chạy ở Local (Development)

**Yêu cầu:** Node.js >= 18, npm

#### Bước 1: Cài đặt dependencies
```bash
npm install
```

#### Bước 2: Build public files (nếu cần xem trang đã build)
```bash
npm run sync:public
```

#### Bước 3: Khởi động local server
```bash
node local_server.js
# → Server chạy tại: http://127.0.0.1:3000
# → Truy cập app:   http://127.0.0.1:3000/tcpscript/
```

> **Lưu ý khi dev local:**
> - `local_server.js` mock tất cả API calls, không cần kết nối Cloudflare hay Google
> - Files HTML được phục vụ từ `public/` (đã build); CSS/JS assets từ `src/`
> - Mọi thay đổi trong `src/assets/app/js/*.js` cần chạy lại `npm run sync:public` để có hiệu lực

#### Rebuild sau khi sửa source
```bash
# Rebuild chỉ app.js (nhanh hơn):
npm run sync:app-source

# Rebuild toàn bộ public/ (login, project, setting, app):
npm run sync:public
```

---

### 5.2 Deploy lên Cloudflare (Production)

#### Yêu cầu tiên quyết
- Node.js + npm đã cài đặt
- Đã đăng nhập Cloudflare: `npx wrangler login`
- KV namespace `SETTINGS_KV` đã được tạo trên Cloudflare Dashboard
- ID của KV namespace được điền vào `wrangler.jsonc`

#### Cách 1: Dùng script tự động (Khuyến nghị)

**macOS / Linux:**
```bash
chmod +x Deploy_Cloudflare.sh
./Deploy_Cloudflare.sh            # Deploy thật
./Deploy_Cloudflare.sh --dry-run  # Chạy thử, không deploy
```

**Windows:**
```bat
Deploy_Cloudflare.bat             :: Deploy thật
Deploy_Cloudflare.bat --dry-run   :: Chạy thử
Deploy_Cloudflare.bat --no-pause  :: Không dừng màn hình sau khi xong
```

Script tự động thực hiện:
1. ✅ Kiểm tra Node.js và npm tồn tại trong PATH
2. ✅ Kiểm tra các file bắt buộc (`package.json`, `wrangler.jsonc`, `src/app.html`)
3. ✅ Chạy `npm install` nếu `node_modules` chưa tồn tại
4. ✅ Xác minh đăng nhập Cloudflare (`wrangler whoami`)
5. ✅ Chạy `npm run deploy` (= build public → wrangler deploy)

#### Cách 2: Deploy thủ công
```bash
# 1. Build tất cả trang HTML vào public/
npm run sync:public

# 2. Deploy Worker và static assets lên Cloudflare
npx wrangler deploy

# Hoặc gộp lại:
npm run deploy
```

#### Sau khi deploy

| Thiết lập | Nơi thực hiện |
|-----------|---------------|
| Cấu hình Google Apps Script URL | Đăng nhập Admin → `/tcpscript/setting` |
| Deploy `apps-script/Code.gs` lên Google Apps Script | Google Apps Script Editor → Deploy as Web App |
| Lấy URL Web App → điền vào Settings | Setting page → Google Sheets Web App URL field |
| Đặt Template Spreadsheet ID | Setting page → Template Spreadsheet ID field |
| (Tùy chọn) Đặt Drive Folder ID | Setting page → Google Drive Folder ID field |

---

## 6. Cấu trúc thư mục tổng hợp

```
Autoscript/
├── src/                          ← Source code (development)
│   ├── worker.js                 ← Cloudflare Worker backend (ENTRY POINT)
│   ├── login.html/css/js         ← Trang đăng nhập
│   ├── project.html/css/js       ← Dashboard quản lý dự án
│   ├── app.html                  ← Shell trang logging chính
│   ├── setting.html/css/js       ← Admin settings
│   ├── styles.css                ← Shared global styles
│   ├── js/
│   │   ├── app.js                ← Compiled/monolith JS cho app.html
│   │   └── timecode.js           ← Timecode utilities
│   └── assets/app/
│       ├── js/                   ← Modular JS source (14 modules)
│       └── styles/               ← Modular CSS source (5 files)
│
├── public/                       ← Built output (deployed to Cloudflare)
│   ├── index.html                ← Redirect → login.html
│   ├── login.html                ← Built (CSS+JS inlined)
│   ├── project.html              ← Built (CSS+JS inlined)
│   ├── app.html                  ← Built (CSS+JS inlined)
│   ├── setting.html              ← Built (CSS+JS inlined)
│   └── assets/                   ← Runtime assets (fonts, icons…)
│
├── apps-script/
│   └── Code.gs                   ← Google Apps Script (deploy riêng)
│
├── scripts/                      ← Build utilities (Node.js)
│   ├── build-public.js           ← Inline CSS+JS vào HTML → public/
│   ├── build-app-source.js       ← Concatenate app JS modules
│   ├── verify-refactor.js        ← Kiểm tra tính nhất quán sau refactor
│   └── lib/                      ← Build helper libraries
│
├── wrangler.jsonc                ← Cloudflare Worker config
├── package.json                  ← npm config & scripts
├── local_server.js               ← Local dev server (Node.js)
├── Deploy_Cloudflare.sh          ← Deploy script (macOS/Linux)
├── Deploy_Cloudflare.bat         ← Deploy script (Windows)
└── PROJECT_SUMMARY.md            ← File này
```

---

> **Tóm tắt kiến trúc:** TCP Autoscript là một **full-stack serverless application** chạy hoàn toàn trên Cloudflare Edge (Worker + KV) với Vanilla JS front-end và Google Apps Script làm integration layer để thao tác Google Drive & Sheets. Không có server, không có database truyền thống — toàn bộ persistence được lưu trong Cloudflare KV theo schema key-value phân cấp theo user.
