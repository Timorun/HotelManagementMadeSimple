# HMMS Frontend - Hotel Management System

A professional React-based web application for hotel management, built with Vite. This frontend interfaces with a Spring Boot backend to provide comprehensive hotel operations management.

## Features

- **Dashboard**: Overview of hotel operations with guest and suite statistics
- **Operations Center**: Real-time view of arrivals, departures, and rooms needing cleaning
- **Guest Management**: Complete guest information management and search capabilities
- **Suite Management**: View and manage available hotel suites
- **Reservation System**: Create, view, and manage reservations with date-range filtering
- **Reference Data**: Manage nationalities and guest information
- **Analytics**: Monthly revenue and occupancy analytics dashboard

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- The HMMS backend running on `http://localhost:8080`

### Installation

1. Clone the repository and navigate to the frontend directory
2. Install dependencies:
```bash
npm install
```

3. Ensure the backend is running on `http://localhost:8080`

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── api/
│   └── backend.js              # Backend API service layer
├── components/
│   ├── GuestList.jsx           # Guest management component
│   ├── SuiteList.jsx           # Suite listing and display
│   ├── ReservationList.jsx     # Reservation management
│   ├── NationalityList.jsx     # Nationality reference data
│   ├── AnalyticsView.jsx       # Analytics dashboard
│   └── OperationsView.jsx      # Daily operations view
├── App.jsx                     # Main application component with routing
├── App.css                     # Global application styles
├── main.jsx                    # React application entry point
└── index.css                   # Base CSS variables and defaults
```

## Backend API Integration

The frontend connects to the following backend endpoints at `http://localhost:8080/api`:

### Guest Management
- `GET /guests` - List all guests
- `POST /guests` - Create new guest
- `GET /guests/{id}` - Get guest details
- `PUT /guests/{id}` - Update guest
- `PATCH /guests/{id}/anonymize` - Anonymize guest (GDPR)

### Suite Management
- `GET /suites` - List all suites
- `GET /suites/active` - List active suites only
- `POST /suites` - Create new suite
- `PUT /suites/{id}` - Update suite
- `PATCH /suites/{id}/deactivate` - Deactivate suite
- `PATCH /suites/{id}/reactivate` - Reactivate suite

### Reservations
- `GET /reservations?from=YYYY-MM-DD&to=YYYY-MM-DD` - List reservations in date range
- `GET /reservations/{id}` - Get reservation details
- `GET /reservations/guest/{guestId}` - Get guest's reservations
- `POST /reservations` - Create new reservation
- `PUT /reservations/{id}` - Update reservation
- `PATCH /reservations/{id}/cancel` - Cancel reservation

### Operations
- `GET /operations/arrivals/today` - Get today's arrivals
- `GET /operations/departures/today` - Get today's departures
- `GET /operations/rooms-to-clean` - Get rooms requiring cleaning
- `GET /operations/occupancy` - Get current occupancy status
- `GET /operations/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` - Get calendar data

### Analytics
- `GET /analytics/monthly` - Get current month analytics
- `GET /analytics/monthly/{month}` - Get analytics for specific month (YYYY-MM format)

### Reference Data
- `GET /nationalities` - List all nationalities

## Technologies Used

- **React 19**: Modern UI framework with hooks and latest features
- **Vite 7**: Ultra-fast build tool and development server
- **CSS3**: Modern styling with flexbox and grid layouts
- **Fetch API**: Native browser API for HTTP requests

## Styling

The application uses a professional color scheme:
- Primary: #3498db (Blue)
- Secondary: #2c3e50 (Dark Blue-Gray)
- Neutral: #ecf0f1 (Light Gray)
- Text: #555 (Dark Gray)

## Development

- Hot Module Replacement (HMR) enabled for instant updates during development
- ESLint configured for code quality
- Responsive design that works on desktop and tablet devices
