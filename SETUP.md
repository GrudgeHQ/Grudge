# Setup Instructions for Grudge App

## Prerequisites
- Node.js (v18 or later)
- npm or yarn

## Database Setup

Your PowerShell execution policy is preventing npm commands from running automatically. Please run these commands manually in your terminal:

### Option 1: Enable scripts temporarily (Recommended)
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run:
```bash
cd "c:\Users\rozwe\OneDrive\Documents\Grudge App\Grudge2\grudge-app"
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### Option 2: Run commands individually
If you prefer not to change execution policy, you can run the full path:

```powershell
cd "c:\Users\rozwe\OneDrive\Documents\Grudge App\Grudge2\grudge-app"
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" prisma generate
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" prisma db push
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run prisma:seed
```

## What These Commands Do

1. **npm install** - Installs all dependencies
2. **npx prisma generate** - Generates the Prisma Client from your schema
3. **npx prisma db push** - Creates the SQLite database with your schema
4. **npm run prisma:seed** - Seeds the database with test data:
   - User: alice@example.com / password123
   - User: bob@example.com / password123
   - Team: Lakeside FC (SOCCER) with invite code LAKE123

## Running the Development Server

After setup is complete:
```bash
npm run dev
```

Then visit: http://localhost:3000

## Optional: Pusher Setup for Real-time Features

Real-time chat and notifications require Pusher credentials:

1. Sign up at https://pusher.com (free tier available)
2. Create a new Channels app
3. Copy your credentials to `.env`:
   ```
   PUSHER_APP_ID="your-app-id"
   PUSHER_KEY="your-key"
   PUSHER_SECRET="your-secret"
   PUSHER_CLUSTER="your-cluster"
   NEXT_PUBLIC_PUSHER_KEY="your-key"
   NEXT_PUBLIC_PUSHER_CLUSTER="your-cluster"
   ```

**Note**: The app will work without Pusher, but real-time features will be disabled.

## Testing the App

1. Register a new account at http://localhost:3000/register
2. Or sign in with test accounts:
   - Email: alice@example.com
   - Password: password123

## Running Tests

```bash
npm test
```

## Features Implemented

✅ User authentication (register/login)
✅ Team creation and management
✅ Team member roles and permissions
✅ Admin panel (promote, demote, remove members)
✅ Team join with invite codes
✅ Real-time chat (when Pusher configured)
✅ Notifications system
✅ Match creation and scheduling
✅ Player availability tracking
✅ Assignment management
✅ Audit logging
✅ Navigation bar
✅ Landing page

## Next Steps to Build

- Match management UI pages
- Scrimmage scheduler UI
- Practice scheduling UI
- League management
- User profile pages
- Team settings page
