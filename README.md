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
├── back-end/
│   ├── package.json             # Node.js backend dependencies
│   ├── package-lock.json        # npm lockfile
│   ├── .env.example             # Environment variable template for backend
│   ├── db/
│   │   ├── mysql_schema.sql     # Core database schema for user, transactions, reports
│   │   └── mysql_onboarding.sql # Onboarding-related schema
│   ├── scripts/
│   │   └── migrate.js           # Optional SQL migration/import helper script
│   └── src/
│       ├── index.js             # Express server and API route handlers
│       └── speech.js            # Speech transcription helper
├── front-end/
│   ├── package.json             # Expo frontend dependencies
│   ├── package-lock.json        # npm lockfile
│   ├── .env.example             # Environment variable template for frontend
│   ├── app/
│   │   ├── _layout.tsx          # Application layout wrapper
│   │   ├── home.tsx             # Main dashboard screen
│   │   ├── modal.tsx            # Shared modal layout component
│   │   ├── onboarding-summary.tsx # Onboarding summary screen
│   │   ├── onboarding.tsx       # Onboarding flow screen
│   │   ├── register.tsx         # Registration screen
│   │   └── (tabs)/              # Tab navigation screens
│   │       ├── _layout.tsx
│   │       ├── explore.tsx
│   │       └── index.tsx
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
│   ├── scripts/
│   │   ├── reset-project.js
│   │   └── update-ngrok-env.js
│   └── assets/
│       └── images/              # Static image assets
├── README.md                    # Project documentation
```

## Installation steps and required tools

### Requirements

- Node.js 18 or newer
- npm
- MySQL 8+
- Optional: `ngrok` for mobile device access over LAN or public URL
- Optional: Google Cloud Speech credentials for speech-to-text functionality

### Install dependencies

From `back-end`:

```bash
cd back-end
npm ci
```

From `front-end`:

```bash
cd front-end
npm ci
```

## Environment variable setup using .env.example

### Backend

From `back-end/`:

```bash
cp .env.example .env
```

Or on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `back-end/.env` and configure:

```env
PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=monee_db
DB_SSL=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\google-speech-key.json
```

- `GEMINI_API_KEY` is optional. Without it, some AI-powered features may not work.
- `GOOGLE_APPLICATION_CREDENTIALS` is optional and required only for speech-to-text.

### Frontend

From `front-end/`:

```bash
cp .env.example .env
```

Or on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `front-end/.env` and configure:

```env
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_API_BASE_URL_WEB=http://localhost:4000
```

- `EXPO_PUBLIC_API_BASE_URL_WEB` is used for local web testing.
- `EXPO_PUBLIC_API_BASE_URL` should be set when using a real device or when backend is not on `localhost`.

## How to run backend

In `back-end/`:

```bash
npm run dev
```

The backend should start at:

```text
http://localhost:4000
```

Verify with:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{ "status": "ok" }
```

## How to run frontend

In `front-end/`:

```bash
npm start
```

Or use:

```bash
npm run web
npm run android
npm run ios
```

Expo will open the developer tools and allow running on web, emulator, or a physical device.

## How to set up or migrate/seed the database

### Create the database

Before running the backend, create the MySQL database:

```sql
CREATE DATABASE monee_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Automatic schema creation

The backend includes logic to create the required tables on startup. After creating the database, start the backend and it will initialize the necessary schema.

### Optional migration script

The file `back-end/scripts/migrate.js` can run the SQL files in `back-end/db/` to create the tables.
Note: the script checks `DB_HOST` and supports SSL when `DB_SSL=true`.

## How to run the full system from a clean machine

1. Clone the repository:
    ```bash
    git clone <repo-url>
    cd Smart-Finance-Assistant
    ```
2. Install Node.js 18+ and npm.
3. Install MySQL 8+ and start the MySQL service.
4. Create the `monee_db` database.
5. Install backend and frontend dependencies:
    ```bash
    cd back-end
    npm ci
    cd ../front-end
    npm ci
    ```
6. Copy `.env.example` to `.env` in each folder and update environment variables.
7. Run the backend:
    ```bash
    cd back-end
    npm run dev
    ```
8. Run the frontend:
    ```bash
    cd ../front-end
    npm start
    ```
9. Open the app in a browser or on a mobile device and register a new user.

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
- Submit source code and `.env.example` files only to reproduce the project.
