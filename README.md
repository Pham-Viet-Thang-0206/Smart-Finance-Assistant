# Smart Finance Assistant

Ứng dụng quản lý tài chính cá nhân gồm:

- `back-end`: Node.js + Express + MySQL
- `front-end`: Expo / React Native

## 1. Yêu cầu cài sẵn

- Node.js `18+` và `npm`
- MySQL `8+`
- Expo Go trên điện thoại hoặc Android Studio emulator nếu muốn chạy mobile
- Tùy chọn:
  - Gemini API key để phân loại giao dịch bằng AI
  - Google Cloud Speech credentials để nhận diện giọng nói

## 2. Cài dependencies

Chạy lần lượt:

```powershell
cd back-end
npm ci

cd ..\front-end
npm ci
```

## 3. Cấu hình MySQL cho back-end

### 3.1. Tạo database

Back-end sẽ tự tạo bảng khi khởi động, nhưng bạn phải tạo database trước:

```sql
CREATE DATABASE monee_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2. Tạo file môi trường

Tại thư mục `back-end`, copy file mẫu:

```powershell
Copy-Item .env.example .env
```

Sau đó sửa các biến trong `.env`:

```env
PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=monee_db
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\google-speech-key.json
```

Ghi chú:

- `DB_PASS` là bắt buộc nếu tài khoản MySQL của bạn có mật khẩu.
- Nếu bỏ trống `GEMINI_API_KEY`, app vẫn chạy nhưng phần AI classification sẽ fallback về category mặc định.
- Nếu không có `GOOGLE_APPLICATION_CREDENTIALS`, endpoint speech-to-text sẽ không dùng được.

## 4. Chạy back-end

Trong thư mục `back-end`:

```powershell
npm run dev
```

Nếu cấu hình đúng, API sẽ chạy tại:

```text
http://localhost:4000
```

Kiểm tra nhanh:

```text
GET http://localhost:4000/health
```

Kỳ vọng nhận:

```json
{ "status": "ok" }
```

## 5. Cấu hình front-end

Tại thư mục `front-end`, copy file mẫu nếu cần:

```powershell
Copy-Item .env.example .env
```

Nội dung mặc định:

```env
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_API_BASE_URL_WEB=http://localhost:4000
```

Giải thích:

- `EXPO_PUBLIC_API_BASE_URL_WEB` dùng cho web local.
- `EXPO_PUBLIC_API_BASE_URL` để trống thì app mobile sẽ tự suy ra host từ Expo dev server.
- Nếu chạy trên điện thoại thật qua mạng LAN hoặc qua `ngrok`, bạn có thể set thủ công giá trị này.

Ví dụ:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:4000
```

Hoặc:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

Repo đã có script cập nhật nhanh `.env` từ tunnel `ngrok`:

```powershell
npm run ngrok:env
```

Script này yêu cầu bạn đã chạy `ngrok http 4000` trước đó.

## 6. Chạy front-end

Trong thư mục `front-end`:

```powershell
npm start
```

Hoặc:

```powershell
npm run web
npm run android
```

## 7. Thứ tự khởi chạy đúng

1. Khởi động MySQL.
2. Tạo database `monee_db`.
3. Cấu hình `back-end/.env`.
4. Chạy `back-end` bằng `npm run dev`.
5. Kiểm tra `http://localhost:4000/health`.
6. Cấu hình `front-end/.env` nếu cần.
7. Chạy `front-end` bằng `npm start` hoặc `npm run web`.

## 8. Các lỗi thường gặp

### `Access denied for user ...`

Sai `DB_USER` hoặc `DB_PASS` trong `back-end/.env`.

### `Unknown database 'monee_db'`

Bạn chưa tạo database trước khi chạy API.

### Mobile không gọi được API

- Đảm bảo điện thoại và máy tính cùng mạng LAN.
- Nếu vẫn lỗi, set thủ công `EXPO_PUBLIC_API_BASE_URL`.
- Trường hợp mạng nội bộ bị chặn, dùng `ngrok`.

### Speech-to-text lỗi

Bạn chưa cấu hình `GOOGLE_APPLICATION_CREDENTIALS` hoặc service account chưa có quyền Speech-to-Text.

## 9. Ghi chú kỹ thuật hiện tại

- Back-end đang dùng `Gemini`, không phải OpenAI.
- Back-end tự khởi tạo phần lớn bảng khi startup.
- Có một màn hình front-end gọi endpoint `/api/user/update-info`, nhưng endpoint này hiện chưa có trong back-end. Việc này không chặn app khởi động, nhưng phần sửa thông tin tài khoản trong màn hình cài đặt có thể chưa hoạt động.
