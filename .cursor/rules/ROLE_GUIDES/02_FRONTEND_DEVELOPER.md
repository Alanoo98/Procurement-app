# Frontend Developer Role Guide

## 🎯 Role Overview

As a Frontend Developer for the Procurement Management System, you'll be responsible for building and maintaining the React-based dashboard that provides users with real-time insights into their procurement operations. You'll focus on creating intuitive, responsive, and performant user interfaces that make complex procurement data accessible and actionable.

## 🛠️ Technical Stack

### Core Technologies
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for data fetching and caching

### UI & Visualization
- **Recharts** for data visualization
- **shadcn/ui** for UI components
- **Lucide React** for icons
- **React Select** for advanced select components
- **Sonner** for toast notifications

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **React DevTools** for debugging

## 📋 Key Responsibilities

### 1. Dashboard Development
- Build responsive dashboard components
- Implement real-time data updates
- Create interactive data visualizations
- Develop filtering and search functionality
- Ensure optimal performance with large datasets

### 2. Component Development
- Create reusable UI components
- Implement consistent design patterns
- Build form components with validation
- Develop data table components with sorting/filtering
- Create modal and dialog components

### 3. Data Visualization
- Design and implement charts and graphs
- Create interactive dashboards
- Build reporting interfaces
- Implement data export functionality
- Ensure accessibility in visualizations

### 4. User Experience
- Implement responsive design principles
- Ensure cross-browser compatibility
- Optimize for mobile devices
- Create intuitive navigation flows
- Implement loading states and error handling

## 🚀 Getting Started

### Prerequisites
1. **Node.js 18+** and npm
2. **Git** for version control
3. **VS Code** or preferred IDE
4. **Chrome DevTools** for debugging

### Environment Setup

#### 1. Clone and Install Dependencies
```bash
cd procurement
npm install
```

#### 2. Environment Configuration
```bash
cp .env.example .env
# Add your Supabase credentials:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 3. Start Development Server
```bash
npm run dev
```

#### 4. Access the Application
Open `http://localhost:5173` in your browser

## 📁 Project Structure

### Key Directories
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard-specific components
│   ├── import/         # Data import components
│   ├── priceAlerts/    # Price alert components
│   ├── efficiency/     # Efficiency analysis components
│   └── ...
├── pages/              # Route-specific pages
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Suppliers.tsx   # Supplier management
│   ├── Products.tsx    # Product catalog
│   ├── Analytics.tsx   # Analytics and reporting
│   └── ...
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── contexts/           # React contexts
├── utils/              # Utility functions
└── types.ts            # TypeScript type definitions
```

### Component Architecture
- **Atomic Design**: Components follow atomic design principles
- **Composition**: Prefer composition over inheritance
- **Props Interface**: All components have TypeScript interfaces
- **Error Boundaries**: Implemented for error handling

## 🔧 Development Workflows

### 1. Feature Development
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement component in appropriate directory
3. Add TypeScript types in `types.ts`
4. Create custom hooks if needed
5. Add tests for the component
6. Update documentation
7. Create pull request

### 2. Component Development
1. **Plan**: Define component requirements and props
2. **Design**: Create component structure and styling
3. **Implement**: Write component logic and state management
4. **Test**: Test component functionality and edge cases
5. **Refactor**: Optimize performance and code quality
6. **Document**: Add JSDoc comments and examples

### 3. Page Development
1. **Layout**: Create page layout and navigation
2. **Data Fetching**: Implement React Query hooks
3. **Components**: Integrate reusable components
4. **State Management**: Handle page-specific state
5. **Error Handling**: Implement error boundaries and fallbacks

## 🧪 Testing Strategy

### Unit Testing
- Test individual components in isolation
- Mock external dependencies
- Test component props and state changes
- Verify component rendering and interactions

### Integration Testing
- Test component interactions
- Test data flow between components
- Test form submissions and validations
- Test navigation and routing

### E2E Testing
- Test complete user workflows
- Test critical business processes
- Test responsive design across devices
- Test accessibility features

## 📊 Key Features to Master

### 1. Data Tables
- **ResizableTable**: Custom table component with sorting/filtering
- **Pagination**: Handle large datasets efficiently
- **Search**: Implement global and column-specific search
- **Export**: CSV/Excel export functionality

### 2. Charts and Visualizations
- **Recharts**: Line, bar, pie, and area charts
- **Interactive**: Hover effects and tooltips
- **Responsive**: Adapt to different screen sizes
- **Accessible**: Screen reader support

### 3. Forms and Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **Error Handling**: User-friendly error messages
- **Auto-save**: Progressive form saving

### 4. Real-time Updates
- **React Query**: Automatic data refetching
- **WebSocket**: Real-time notifications
- **Optimistic Updates**: Immediate UI feedback
- **Background Sync**: Offline support

## 🔍 Common Development Tasks

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation link in `Sidebar.tsx`
4. Implement data fetching with React Query
5. Add proper TypeScript types

### Creating Reusable Components
1. Define component interface in TypeScript
2. Implement component logic
3. Add Tailwind CSS styling
4. Create component documentation
5. Add unit tests

### Implementing Data Visualization
1. Choose appropriate chart type
2. Transform data for chart format
3. Implement interactive features
4. Add responsive design
5. Ensure accessibility

### Building Forms
1. Use React Hook Form for state management
2. Implement Zod validation schemas
3. Add error handling and user feedback
4. Implement auto-save functionality
5. Test form submission and validation

## 🎨 Design System

### Color Palette
- **Primary**: Emerald green (#059669)
- **Secondary**: Slate gray (#64748b)
- **Success**: Green (#22c55e)
- **Warning**: Yellow (#eab308)
- **Error**: Red (#ef4444)

### Typography
- **Font Family**: Inter (system font fallback)
- **Headings**: Font weights 600-700
- **Body**: Font weight 400
- **Code**: Monospace font

### Spacing
- **Base Unit**: 4px (0.25rem)
- **Common Spacings**: 4, 8, 12, 16, 20, 24, 32, 48, 64px

### Components
- **Buttons**: Primary, secondary, outline variants
- **Cards**: Consistent padding and shadows
- **Tables**: Striped rows, hover effects
- **Forms**: Consistent input styling

## 🚨 Important Considerations

### Performance
- **Code Splitting**: Use React.lazy for route-based splitting
- **Memoization**: Use React.memo and useMemo appropriately
- **Bundle Size**: Monitor and optimize bundle size
- **Image Optimization**: Use appropriate image formats and sizes

### Accessibility
- **WCAG Compliance**: Follow WCAG 2.1 guidelines
- **Keyboard Navigation**: Ensure all features are keyboard accessible
- **Screen Readers**: Add proper ARIA labels and roles
- **Color Contrast**: Maintain sufficient color contrast ratios

### Responsive Design
- **Mobile First**: Design for mobile devices first
- **Breakpoints**: Use Tailwind's responsive breakpoints
- **Touch Targets**: Ensure adequate touch target sizes
- **Viewport**: Handle different screen sizes gracefully

### State Management
- **Local State**: Use useState for component-specific state
- **Global State**: Use Zustand for application-wide state
- **Server State**: Use React Query for API data
- **Form State**: Use React Hook Form for form management

## 📚 Learning Resources

### React & TypeScript
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Styling & UI
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)

### Data Visualization
- [Recharts Documentation](https://recharts.org/)
- [D3.js Tutorials](https://d3js.org/)
- [Chart.js Examples](https://www.chartjs.org/docs/latest/)

### State Management
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)

## 🎯 Success Metrics

### Code Quality
- Maintain > 90% test coverage
- Keep TypeScript strict mode enabled
- Follow ESLint rules consistently
- Document complex components

### Performance
- Page load times < 2 seconds
- Bundle size < 500KB gzipped
- Time to interactive < 3 seconds
- Smooth animations (60fps)

### User Experience
- Responsive design across all devices
- Intuitive navigation and workflows
- Fast and reliable data updates
- Comprehensive error handling

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios > 4.5:1

## 🔄 Daily Workflow

1. **Morning**: Review design updates and user feedback
2. **Development**: Build and refine components
3. **Testing**: Test components across devices and browsers
4. **Code Review**: Review team members' frontend code
5. **Documentation**: Update component documentation
6. **Deployment**: Deploy frontend changes

This role requires strong React skills, attention to detail in UI/UX, and the ability to work with complex data visualization requirements while maintaining excellent performance and accessibility standards.
