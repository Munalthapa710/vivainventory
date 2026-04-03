# VivaInventory

VivaInventory is a full-stack inventory management system for construction teams. It helps admins manage warehouse stock, assign products to employees, track usage, review records, and publish announcements from a single responsive web app.

The project is built with Next.js 14 App Router, NextAuth.js credentials authentication, SQLite via `better-sqlite3`, Tailwind CSS, and a mobile-optimized PWA shell.

## Features

- Role-based authentication with `admin` and `employee` accounts
- Protected admin and employee dashboards
- Warehouse product master list with low-stock indicators
- Employee inventory assignment and quantity editing
- Usage records with quantity before/after audit trail
- Employee records filtering, Excel export, and print support
- Admin announcements board visible to employees
- Mobile-friendly layout with drawer navigation, bottom nav, safe-area support, and installable PWA behavior
- SQLite seed script with sample users, products, records, and announcement

## Tech Stack

- Next.js 14
- React 18
- NextAuth.js
- SQLite + `better-sqlite3`
- Tailwind CSS
- `bcryptjs`
- `react-hot-toast`
- `recharts`
- `xlsx`
- `lucide-react`

## Roles

### Admin

- View warehouse and activity summary
- Create, activate, deactivate, and delete users
- Manage warehouse products
- Assign and remove products from employees
- Post announcements
- Update profile settings

### Employee

- View assigned inventory summary
- Record product usage
- Review all activity records
- Export records to Excel
- Print record history
- Read announcements and view shared communication board
- Update profile settings

## Default Seeded Accounts

After seeding the database:

- Admin: `admin@vivainventory.com` / `admin123`
- Employee: `employee@vivainventory.com` / `employee123`

## Project Structure

```text
vivainventory/
├── app/
│   ├── (auth)/login/page.jsx
│   ├── (admin)/admin/...
│   ├── (employee)/employee/...
│   ├── api/
│   ├── globals.css
│   ├── layout.jsx
│   └── manifest.js
├── components/
├── lib/
├── public/
├── middleware.js
├── package.json
└── README.md
```

## Environment Variables

Create a `.env.local` file using `.env.example`.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-this-with-a-long-random-secret
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
copy .env.example .env.local
```

On macOS/Linux use:

```bash
cp .env.example .env.local
```

### 3. Seed the database

```bash
npm run seed
```

This creates:

- all required SQLite tables
- the default admin account
- one sample employee
- sample products
- sample records
- one sample announcement

### 4. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run seed
```

## Production Build

```bash
npm run build
npm run start
```

## Database

SQLite tables created by the app:

- `users`
- `products`
- `user_inventory`
- `records`
- `announcements`

The SQLite database file is created locally as `database.sqlite` and is intentionally ignored from git.

## PWA Notes

VivaInventory includes:

- web app manifest
- install prompt support
- service worker registration
- offline fallback page
- safe-area handling for iPhone notches and Dynamic Island

If the installed mobile icon or cached shell does not update immediately, remove the installed app and install it again.

## Main User Flows

### Admin flow

1. Sign in as admin
2. Add warehouse products
3. Create employee accounts
4. Assign products to employees
5. Monitor low stock and recent activity

### Employee flow

1. Sign in as employee
2. Review assigned products
3. Record usage
4. Filter activity history
5. Export or print records

## Notes

- Registration is disabled; users are created by admins only.
- The app uses credentials authentication with email and password.
- Local log files, build artifacts, environment files, and SQLite files are excluded from git.

## License

This repository is provided for project and portfolio use.
