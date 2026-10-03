# HotelManagementMadeSimple

A full-stack hotel management system for Carmen Suites, built with a Spring Boot backend and a React/Vite frontend.

## What's included

- **Backend**: Spring Boot + PostgreSQL REST API with reservations, guests, suites, operations, analytics and GDPR support.
- **Frontend**: React + Vite app, usable on desktop and phones:
  - **Today**: arrivals and departures with check-in/check-out buttons, plus occupied suites.
  - **Calendar** with a week/month picker, **Reservations**, **Guests** and **Analytics**.
  - **Requests**: booking requests from the public booking page (`/book`). Accepting one holds the dates and emails the guest the price and how to pay (bank transfer or Bizum) by a deadline; marking it as paid confirms the booking. Unpaid requests past their deadline are flagged.
  - **Prices**: a price per night for each suite and date, set in bulk by date range and day of the week.
  - **Communications**: BCC email via your mail app, or WhatsApp messages, with consent checks and unsubscribe links.
  - **Settings**: suites, payment details (IBAN, Bizum, days to pay), booking.com calendar sync, and booking.com reservations-export import.
- **Guest-facing pages** (no login): `/book` to see the price of a stay and request it, `/preferences` to unsubscribe or request data deletion.
- **Weekly database backup** via GitHub Actions (`.github/workflows/weekly-db-backup.yml`).

## Key documentation

- `backend/ARCHITECTURE.md` — How the Spring Boot backend is layered, with request walkthroughs. Start here to learn the code.
- `backend/API_DOCUMENTATION.md` — API reference.
- `backend/hmms/.env.example` — Every environment variable for production (database, mail, public URLs, secrets).
- `frontend/FRONTEND_README.md` — Frontend architecture and setup.

## Quick start

1. Start PostgreSQL on `localhost:5433` with database `hotel` and user `hotel_user` / `welkom`.
2. Start the backend with sample data:
   ```powershell
   cd backend/hmms
   $env:SPRING_PROFILES_ACTIVE="dev"; .\mvnw spring-boot:run
   ```
   Log in with `admin` / `ChangeMeNow!123`. In dev, emails are written to the backend log instead of being sent.
3. Start the frontend:
   ```powershell
   cd frontend/hmms
   npm install
   npm run dev
   ```

## Tests

- Backend: `cd backend/hmms && ./mvnw test`. This needs the Postgres above, with an extra database `hotel_test`.
- Frontend: `cd frontend/hmms && npm run lint && npm test`.

CI (`.github/workflows/ci.yml`) runs both on every push.

## Booking.com

Booking.com's live API is only open to certified channel managers, so availability is synced through iCal, one calendar per suite. The steps are under Settings → Booking.com calendar sync.

Guest names and prices come from the reservations export you download from the extranet (Settings → Import booking.com reservations).

## Project structure

- `/backend` — Spring Boot backend project
- `/frontend` — React/Vite frontend project
- `/.github/workflows` — CI and the weekly backup
