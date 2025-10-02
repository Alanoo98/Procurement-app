# Centralized Layout System

Dette er et centraliseret layout system baseret på den moderne procurement dashboard stil. Systemet giver dig alle de nødvendige komponenter til at bygge professionelle dashboard interfaces.

## Komponenter

### Layout
- **Layout**: Hovedlayout komponent der håndterer sidebar og main content
- **Sidebar**: Mørk navigation sidebar med logo, menu items og user section
- **Header**: Top header med filters, notifications og user controls

### UI Komponenter
- **Card**: Fleksibel card komponent med header, content og footer
- **StatusIndicator**: Status indikatorer med forskellige farver (success, warning, error, info)

### Dashboard
- **Dashboard**: Eksempel dashboard der viser hvordan systemet bruges

## Brug

### Basis Layout
```tsx
import Layout from '@/components/layout/Layout';
import Dashboard from '@/components/dashboard/Dashboard';

const MyPage = () => {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};
```

### Card System
```tsx
import Card from '@/components/ui/Card';
import { AlertTriangle } from 'lucide-react';

const MyCard = () => {
  return (
    <Card>
      <Card.Header
        title="Price Alerts"
        icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
        info
        action={{ label: "View All Alerts" }}
      />
      <Card.Content>
        <p>Card content goes here</p>
      </Card.Content>
    </Card>
  );
};
```

### Status Indicators
```tsx
import StatusIndicator from '@/components/ui/StatusIndicator';

const MyStatus = () => {
  return (
    <StatusIndicator variant="success">
      On Track
    </StatusIndicator>
  );
};
```

## Design System

Systemet bruger CSS custom properties for konsistent styling:

### Farver
- `--color-primary`: Emerald-500 (#10B981)
- `--color-secondary`: Dark blue-grey (#1A202C)
- `--color-background`: Light grey (#F8FAFC)
- `--color-success`: Green for positive indicators
- `--color-warning`: Yellow for warnings
- `--color-error`: Red for errors

### Spacing
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px

### Typography
- Font family: Inter
- Responsive text sizes fra xs til 5xl
- Font weights: normal, medium, semibold, bold

## Responsive Design

Systemet er fuldt responsivt:
- Sidebar kollapserer på mobile enheder
- Grid system tilpasser sig automatisk
- Touch-friendly knapper og links

## Customization

Du kan nemt tilpasse systemet ved at ændre CSS custom properties i `design-system.css`:

```css
:root {
  --color-primary: #your-color;
  --spacing-md: 20px;
  /* ... andre properties */
}
```

## Eksempler

Se `/dashboard` ruten for et komplet eksempel på hvordan systemet bruges.

