# VivaInventory

VivaInventory is a full-stack inventory management system for construction teams. Admins can manage warehouse stock, assign products to employees, review inventory activity, and publish announcements. Employees can track assigned products, record usage, export records, and use the app from mobile as an installable PWA.

This repository is configured for Vercel deployment with PostgreSQL.

## Stack

- Next.js 14 App Router
- React 18
- NextAuth.js credentials auth
- PostgreSQL via `pg`
- Tailwind CSS
- `react-hot-toast`
- `recharts`
- `xlsx`
- `lucide-react`

## Features

- Role-based login for `admin` and `employee`
- Protected admin and employee areas
- Warehouse inventory management
- Employee stock assignment and adjustment
- Full usage audit trail with before/after quantities
- Records filtering, Excel export, and print view
- Admin announcements visible to employees
- Mobile-optimized layout
- PWA install support with offline fallback page
- Vercel-compatible Postgres backend

## Roles

### Admin

- View dashboard metrics and recent activity
- Create, activate, deactivate, edit, and delete users
- Manage warehouse products
- Assign and remove products for employees
- Adjust employee quantities
- Post announcements
- Update profile settings

### Employee

- View assigned product summary
- Record product usage
- Review complete activity history
- Filter records by date and product
- Export records to Excel
- Print records
- Read announcements and employee communication board
- Update profile settings

## Project Structure

```text
vivainventory/
|-- app/
|-- components/
|-- lib/
|-- public/
|-- middleware.js
|-- package.json
`-- README.md
```

## Environment Variables

Create `.env.local` from `.env.example`.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-this-with-a-long-random-secret
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

Windows:

```bash
copy .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

### 3. Set PostgreSQL connection

Update `DATABASE_URL` in `.env.local` to point to your Postgres database.

### 4. Seed the database

```bash
npm run seed
```

This creates:

- all required tables
- baseline admin and employee accounts
- sample warehouse products
- sample inventory activity
- one sample announcement

### 5. Start development server

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

## Vercel Deployment

VivaInventory is deployable on Vercel because it uses an external PostgreSQL database instead of local disk storage.

### 1. Push this repository to GitHub

The project is already prepared for Git-based Vercel deployment.

### 2. Create and connect a PostgreSQL database

On Vercel, the simplest path is to create Postgres through `Storage` and connect it to the project. The current Vercel storage docs point to Marketplace-backed providers such as Neon.

### 3. Import the project into Vercel

1. Open the Vercel dashboard
2. Import the GitHub repository
3. Keep the default Next.js framework detection

### 4. Add environment variables in Vercel

Set these values in `Project Settings -> Environment Variables`:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `POSTGRES_URL` if it is injected automatically by Vercel Storage
- `DATABASE_URL` only if you want to mirror the same connection string manually

Production notes:

- `NEXTAUTH_URL` must be your deployed app URL
- Vercel Storage usually injects the Postgres variables automatically after the database is connected
- do not keep placeholder values such as `YOUR_PASSWORD`

### 5. Deploy

Deploy from the `main` branch.

### 6. Seed the production database

After the database variables are configured, run the seed script against the production database:

```bash
npm run seed
```

Using the Vercel CLI is the safest production path because it uses the exact production environment variables from the project:

```bash
vercel env run -e production -- npm run seed
```

## Database Tables

The application creates these PostgreSQL tables automatically:

- `users`
- `products`
- `user_inventory`
- `records`
- `announcements`

## PWA Notes

VivaInventory includes:

- web app manifest
- install prompt support
- service worker registration
- offline fallback page
- iPhone safe-area and Dynamic Island handling

If the installed mobile icon or shell does not update immediately, remove the app from the home screen and install it again.

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
- The app uses email/password credentials through NextAuth.js.
- The backend supports `DATABASE_URL` as well as Vercel-injected Postgres variables such as `POSTGRES_URL`.
- The seed flow creates the baseline admin and employee accounts, and the auth bootstrap creates them automatically if the connected database is empty.
- Local build artifacts, environment files, logs, and machine-specific folders are excluded from git.

## Sources

- Vercel storage overview: https://vercel.com/docs/storage
- Vercel environment variables: https://vercel.com/docs/environment-variables/managing-environment-variables

## License

This repository is provided for project and portfolio use.
