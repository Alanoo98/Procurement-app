# Procurement Admin Portal

Admin portal for managing users, organizations, business units, and invitations in the procurement system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Admin: http://localhost:3001

## 🔑 Demo Credentials

- **Email**: admin@test.dk
- **Password**: admin123

## 📁 Project Structure

```
apps/admin/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts
│   ├── pages/              # Page components
│   └── utils/              # Utility functions
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hot Toast** - Notifications
- **Vite** - Build tool
- **Supabase** - Database and authentication

## 🚀 Deployment

- **Frontend**: Deploy to Vercel
- **Database**: Managed by Supabase
