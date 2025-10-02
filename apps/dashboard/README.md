# Procurement Dashboard

Main dashboard application for the procurement management system. Built with React 18, TypeScript, and modern web technologies.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Dashboard: http://localhost:3000

## 📁 Project Structure

```
apps/dashboard/
├── src/                           # Source code
│   ├── components/               # React components
│   │   ├── auth/                 # Authentication components
│   │   ├── dashboard/            # Dashboard components
│   │   ├── products/             # Product management
│   │   ├── suppliers/            # Supplier management
│   │   └── common/               # Shared components
│   ├── hooks/                    # Custom React hooks
│   ├── pages/                    # Page components
│   ├── store/                    # State management
│   └── utils/                    # Utility functions
├── docs/                         # Documentation
├── supabase/                     # Supabase configuration
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint.

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing

## 🚀 Deployment

- **Frontend**: Deploy to Vercel
- **Database**: Managed by Supabase