# Carmen Suites - Hotel Management System Frontend

A modern, professional React-based hotel management system for **Carmen Suites**, a boutique hotel in Málaga, Spain.

## Features

### **Dashboard**
- Real-time KPIs (Reservations, Occupancy Rate, Revenue, ADR)
- Revenue trend charts with Chart.js
- Occupancy visualization (Doughnut charts)
- Today's arrivals, departures, and cleaning overview
- Quick stats for suites and guest database

### **Calendar View**
- Month-by-month reservation calendar
- Visual representation of all bookings
- Quick navigation between months
- Color-coded reservation display
- Hover details for each reservation

### **Reservation Management**
- Create new reservations with full guest integration
- Edit existing reservations
- Cancel reservations (soft delete)
- Guest search and autocomplete
- Link to existing guests or create new ones
- Date range filtering
- Status badges (Confirmed, Checked-in, Cancelled, Pending)
- Integration with all booking channels (Direct, Booking.com, Airbnb, etc.)

### **Guest Management**
- Complete guest database
- Create and edit guest profiles
- Advanced search functionality
- Email, phone, and nationality tracking
- Marketing consent management (GDPR compliant)
- Reservation count per guest
- Guest history tracking

### **Suite Management**
- Visual suite cards with capacity
- Active/Inactive status tracking
- Filter by status
- Capacity overview and statistics
- Suite availability tracking

### **Analytics & Reports**
- Monthly analytics with customizable date ranges
- Revenue by booking channel (Bar charts)
- Occupancy trend analysis (Line charts)
- Key performance indicators:
  - Total Reservations
  - Total Revenue
  - Occupancy Rate
  - Average Daily Rate (ADR)
  - Revenue Per Available Room (RevPAR)
  - Average Length of Stay
  - Cancellation Rate
- Actionable insights and recommendations

### **Operations Dashboard**
- Today's check-ins with guest details
- Today's check-outs with guest details
- Housekeeping task list
- Turnover requirements
- Auto-refresh every 5 minutes
- Real-time operational overview

## Design System

### Color Palette
- **Primary**: Deep Navy Blue (#2C3E50) - Sophistication and trust
- **Accent**: Warm Orange/Gold (#E67E22) - Energy and luxury
- **Success**: Green (#27AE60) - Positive actions
- **Info**: Blue (#3498DB) - Information
- **Warning**: Orange (#F39C12) - Caution
- **Danger**: Red (#E74C3C) - Critical actions

### Typography
- **Headings**: Playfair Display (Elegant serif)
- **Body**: Inter (Modern sans-serif)

### Components
- Modern card-based layouts
- Responsive grid systems
- Custom modal dialogs
- Status badges
- KPI cards with icons
- Data tables with hover effects
- Form inputs with validation styling

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Carmen Suites Backend API running on `localhost:8080`

### Installation

```bash
# Navigate to frontend directory
cd frontend/hmms

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Dependencies

### Core
- **React** 19.2.0 - UI framework
- **Vite** - Build tool and dev server

### UI & Visualization
- **Chart.js** - Data visualization
- **react-chartjs-2** - React wrapper for Chart.js
- **lucide-react** - Modern icon library

### Utilities
- **date-fns** - Date manipulation and formatting

## Project Structure

```
frontend/hmms/
├── src/
│   ├── api/
│   │   └── backend.js          # API integration layer
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard with KPIs
│   │   ├── CalendarView.jsx    # Monthly calendar view
│   │   ├── ReservationManagement.jsx  # Reservations CRUD
│   │   ├── GuestManagement.jsx # Guest database management
│   │   ├── SuiteManagement.jsx # Suite overview
│   │   ├── AnalyticsView.jsx   # Analytics & reports
│   │   ├── OperationsView.jsx  # Daily operations
│   │   └── ... (legacy components)
│   ├── styles/
│   │   └── theme.js            # Design system & theme
│   ├── App.jsx                 # Main app component
│   ├── App.css                 # Global styles
│   └── main.jsx                # Entry point
├── public/                      # Static assets
├── index.html
├── package.json
└── vite.config.js
```

## API Integration

The frontend connects to the Carmen Suites Backend API:

- **Base URL**: `http://localhost:8080/api`
- **Endpoints**:
  - `/reservations` - Reservation management
  - `/guests` - Guest database
  - `/suites` - Suite inventory
  - `/operations/*` - Daily operations
  - `/analytics/*` - Reports and analytics
  - `/nationalities` - Nationality reference data

## Key Features for Hotel Owners

### What Makes This Special?

1. **Ease of Use**: Intuitive interface designed for non-technical staff
2. **Real-Time Data**: Live updates for operational efficiency
3. **Comprehensive**: All hotel management in one place
4. **Visual Analytics**: Charts and graphs for quick insights
5. **GDPR Compliant**: Guest data privacy and consent management
6. **Mobile Responsive**: Works on tablets and phones
7. **Fast Performance**: Built with modern React and Vite
8. **Offline Resilient**: Graceful error handling

### Operational Benefits

- **Reduce Manual Work**: Automated cleaning lists, arrival/departure tracking
- **Increase Revenue**: Analytics help optimize pricing and occupancy
- **Better Guest Service**: Complete guest history and preferences
- **Channel Management**: Track performance across booking platforms
- **Staff Efficiency**: Clear daily task lists and priorities

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Code Style
- ES6+ JavaScript
- Functional React components with Hooks
- CSS-in-JS for component-specific styles
- CSS variables for theming

## Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 480px
- **Tablet**: 768px
- **Desktop**: 1024px
- **Wide**: 1280px+

## License

Proprietary - Carmen Suites Hotel Management System