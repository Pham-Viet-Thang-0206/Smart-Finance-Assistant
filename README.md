# Smart Finance Assistant

## Project name

Smart Finance Assistant

## Short description

A personal finance management application with an intelligent finance assistant. It includes a backend built with Node.js, Express, and MySQL, and a frontend built with Expo React Native.

## Member list

```
MEMBER LIST
--------------------------------------------------
Full Name            | Student ID  | Role
Hoàng Tùng           | 2301140099  | Project Leader, Lead Mobile Developer, Back-end Developer & DevOps
Phạm Viết Thắng      | 2301140091  | Front-end Developer, UI/UX Figma Designer
Đoàn Anh Sơn         | 2301140088  | Database Architect
```

## Tech stack

- Backend: Node.js 18+, Express, MySQL, dotenv, bcryptjs, cors, mysql2
- Frontend: Expo, React Native, React Navigation, TypeScript, Expo Router
- AI / media: Google Gemini (Generative Language API), Google Cloud Speech-to-Text, QR decoding libraries

## Main features

- User registration and login by email or phone number
- Financial onboarding with income, savings goals, and expense allocation
- Expense and income transaction management
- Savings goal tracking, financial report generation, and report history
- Intelligent finance chat assistant
- Transaction entry via image, QR code, and voice input
- Community features with posts, comments, and likes

## Overall project structure

```
Smart-Finance-Assistant/
├── monneeeeeeeee.session.sql
├── README.md
├── back-end/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── db/
│   │   ├── mysql_onboarding.sql
│   │   └── mysql_schema.sql
│   ├── scripts/
│   │   └── migrate.js
│   └── src/
│       ├── db.js
│       ├── index.js
│       └── speech.js
├── front-end/
│   ├── app.json
│   ├── eas.json
│   ├── eslint.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── modal.tsx
│   │   ├── onboarding-summary.tsx
│   │   ├── onboarding.tsx
│   │   ├── register.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       ├── explore.tsx
│   │       └── index.tsx
│   ├── assets/
│   │   └── images/
│   ├── components/
│   │   ├── external-link.tsx
│   │   ├── financial-report-modal.tsx
│   │   ├── haptic-tab.tsx
│   │   ├── hello-wave.tsx
│   │   ├── parallax-scroll-view.tsx
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   └── ui/
│   │       ├── collapsible.tsx
│   │       ├── icon-symbol.ios.tsx
│   │       └── icon-symbol.tsx
│   ├── constants/
│   │   ├── api.ts
│   │   └── theme.ts
│   ├── hooks/
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts
│   │   └── use-theme-color.ts
│   └── scripts/
│       ├── reset-project.js
│       └── update-ngrok-env.js
```

## Appendix — Setup & Run Guide


### Step 1 — Required tools

Install the following before proceeding:

- Node.js (v18+)
- npm
- MySQL Server (8+)
- Expo CLI / Expo Go (for mobile testing)
- Ngrok (optional but recommended for testing on physical devices)
- Google Gemini API key (optional; required for AI features)

### Step 2 — Database & environment

1. Create the database (example name: `smart_finance_db`):

```sql
CREATE DATABASE smart_finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Copy the backend environment template and edit values:

```bash
cp back-end/.env.example back-end/.env
# then edit back-end/.env and set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, GEMINI_API_KEY, JWT_SECRET
```

Example `back-end/.env` entries:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_finance_db
JWT_SECRET=your_super_secret_jwt_key_change_this
PORT=4000
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Step 3 — Install & start backend

```bash
cd back-end
npm ci
npm run dev
```

The backend will attempt to create required tables on first start by running the included SQL schema files. API will be available at `http://localhost:4000`.

### Step 4 — (Optional) Tunnel backend with ngrok for mobile testing

```bash
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 4000
```

Keep ngrok running; copy the public URL for the frontend environment.

### Step 5 — Prepare & run frontend

```bash
cd front-end
npm ci
# if using ngrok, update frontend env automatically
npm run ngrok:env
# start Expo in tunnel mode (recommended for physical devices)
npx expo start --tunnel
```

If tunnel mode fails, use LAN mode:

```bash
npx expo start --lan
```

### Step 6 — Open the app

Open Expo Go on your device and scan the QR code shown by Expo, or open the web URL in your browser for the web build.

---

### Notes on database migration & seeding

- The `back-end/scripts/migrate.js` script can run SQL files in `back-end/db/` to import schemas and onboarding data. Use it when deploying to managed databases.
- Ensure `DB_HOST` and `DB_SSL` values are set appropriately for remote DBs.

## Demo account

- Email: tunghoang71005@gmail.com
- Phone: 0901771005
- Password: 11111111

## Known issues

- Localhost routing errors: Physical mobile devices cannot always connect directly to the local development server without a tunnel. Run `npm run ngrok:env` before starting the Expo bundler when testing on a real device.
- Camera focus and QR scanning: Some emulator screens do not simulate camera focus fields reliably for high-density VietQR scans. Testing on a physical smartphone is recommended.
- Layout and keyboard handling: Some Android screen sizes may experience visual overflow in forms if the wrapper view does not dynamically adjust the keyboard offset.

## Notes

- `back-end/.env.example` and `front-end/.env.example` are included in the source.
- Do not include `node_modules/`, `.env`, or large build artifacts in the submitted zip.
  Submit source code and `.env.example` files only to reproduce the project.
