# HotelManagementMadeSimple

A modern, full-stack hotel management system for Carmen Suites, built with a Spring Boot backend and a React/Vite frontend.

## What’s included

- **Backend**: Spring Boot + PostgreSQL REST API with reservations, guests, suites, operations, analytics, and GDPR support.
- **Frontend**: React + Vite dashboard, reservation and guest management, calendar view, analytics, and operational views.
- **Documentation**: Domain-specific docs are kept in focused files for easier maintenance.

## Key documentation

- `backend/API_DOCUMENTATION.md` — Backend API reference and reservation endpoints, including reservation status updates.
- `backend/IMPLEMENTATION_COMPLETE.md` — Backend implementation status and feature coverage.
- `frontend/FRONTEND_README.md` — Frontend architecture, setup, and feature summary.

## Quick start

1. Start backend:
   ```powershell
   cd backend/hmms
   .\mvnw spring-boot:run
   ```
2. Start frontend:
   ```powershell
   cd frontend/hmms
   npm install
   npm run dev
   ```

## Project structure

- `/backend` — Spring Boot backend project
- `/frontend` — React/Vite frontend project
- `/backend/API_DOCUMENTATION.md` — Backend API details
- `/frontend/FRONTEND_README.md` — Frontend development guide
- `/RESERVATION_STATUS_IMPLEMENTATION.md` — Reservation status implementation details
