// Carmen Suites Design System - Modern, professional color palette for a boutique hotel
export const theme = {
  // Primary Colors - Sophisticated navy and gold for luxury feel
  colors: {
    primary: '#2C3E50',        // Deep Navy Blue - main brand color
    primaryLight: '#34495E',   // Lighter navy for hover states
    primaryDark: '#1A252F',    // Darker navy for emphasis
    
    accent: '#E67E22',         // Warm Orange/Gold - for CTAs and highlights
    accentLight: '#F39C12',    // Lighter gold
    accentDark: '#D35400',     // Darker orange
    
    success: '#27AE60',        // Green for confirmed/success states
    warning: '#F39C12',        // Yellow/Orange for warnings
    danger: '#E74C3C',         // Red for cancellations/errors
    info: '#3498DB',           // Blue for information
    
    // Neutral Colors
    white: '#FFFFFF',
    lightGray: '#ECF0F1',      // Background
    gray: '#BDC3C7',           // Borders
    darkGray: '#7F8C8D',       // Secondary text
    black: '#2C3E50',          // Primary text
    
    // Status Colors for Reservations
    confirmed: '#3498DB',      // Blue
    checkedIn: '#27AE60',      // Green
    checkedOut: '#95A5A6',     // Gray
    cancelled: '#E74C3C',      // Red
    pending: '#F39C12',        // Orange
  },
  
  // Typography
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },
  
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  
  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Border Radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    base: '0 2px 8px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
    xl: '0 12px 40px rgba(0, 0, 0, 0.25)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
  
  // Breakpoints
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
};
