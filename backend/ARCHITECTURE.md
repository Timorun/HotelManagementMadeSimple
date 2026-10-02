# Backend architecture: how the Spring Boot API is put together

A guide to the layers of `backend/hmms`, following a real request from HTTP to the database and
back. Paths are relative to `backend/hmms/src/main/java/com/timorun/hmms/`.

## The layers at a glance

```
HTTP request
   │
   ▼
security/TokenAuthenticationFilter   ← runs before every request: who is calling?
   │
   ▼
controllers/*Controller              ← HTTP only: URL, JSON in/out, status codes
   │  DTOs (dto/*Request)
   ▼
services/*Service                    ← business rules: validation, availability, emails
   │  entities (entities/*)
   ▼
repositories/*Repository             ← database queries (Spring Data JPA)
   │
   ▼
PostgreSQL  (schema managed by Flyway: resources/db/migration/V*__*.sql)
```

Each layer only talks to the one below it. Controllers go through services (a few trivial
read-only lookups, such as the nationality list, read a repository directly), and services never
deal with HTTP.

| Folder | Role | Example |
|---|---|---|
| `controllers/` | Map URLs to methods, turn exceptions into HTTP status codes | `ReservationController` |
| `controllers/publicapi/` | Endpoints that need no login (booking page, preference links, iCal feeds) | `PublicBookingController` |
| `dto/` | Shapes of JSON requests/responses, separate from the database entities | `CreateReservationRequest`, `ReservationResponse` |
| `services/` | The rules of the hotel: availability, guest matching, check-in flow | `ReservationService` |
| `entities/` | Java classes mapped to tables with JPA annotations | `Reservation` ↔ `reservations` |
| `repositories/` | Interfaces; Spring generates the SQL from method names or `@Query` | `ReservationRepository` |
| `config/` | Beans and settings: security rules, CORS, hotel settings | `SecurityConfig`, `HotelSettings` |
| `security/` | Token filter, rate limiter for public endpoints | `TokenAuthenticationFilter` |
| `exceptions/` | Custom exceptions and the global handler that turns them into JSON | `GlobalExceptionHandler` |
| `mail/` | Sending email and the email texts | `MailService`, `GuestMails` |
| `ical/` | Reading/writing iCal feeds for booking.com sync | `IcalCalendar` |
| `util/` | Small pure helpers without Spring | `NameUtils`, `PhoneNumbers` |

## Key Spring concepts used here

- **Beans and dependency injection.** Classes annotated with `@Service`, `@RestController`,
  `@Component` or `@Repository` are created once by Spring ("beans"). Their constructor
  parameters are filled in by Spring automatically. That's why `ReservationService` simply asks
  for a `ReservationRepository` in its constructor and never calls `new`.
- **Spring Data JPA repositories.** `ReservationRepository extends JpaRepository<Reservation, Long>`
  gives `save`, `findById` and `findAll` for free. Method names become queries
  (`findByStatus(status)` → `WHERE status = ?`), and `@Query` holds JPQL when a name would be
  unreadable (see `findActiveOverlapping`).
- **Transactions.** `@Transactional` on a service method means all its database writes succeed or
  fail together. For example, `createReservation` creates the guest and the reservation in one
  transaction, so a failed availability check doesn't leave an orphan guest behind.
- **Flyway migrations.** The schema is never generated from entities (`ddl-auto: validate`).
  `V1__schema.sql` creates all tables, `V2__seed.sql` adds the suites and nationalities and
  `V3__suite_content.sql` fills in the suites' texts and photos from carmensuites.com. Each later
  change is a new numbered file in `resources/db/migration` (`V4__something.sql`), applied
  once, in order, at startup; Flyway records what ran in the `flyway_schema_history` table and
  refuses to start if an applied file was edited afterwards (its checksum changed). So never edit
  a migration that already ran on a real database: add a new one. Migrations can also be Java
  classes when SQL isn't enough; they then live in `src/main/java/db/migration`, because Flyway
  reads the `db/migration` classpath folder, which holds both the SQL resources and compiled
  classes in that package.
- **Profiles and configuration.** `application.yml` holds defaults (mostly read from environment
  variables). `application-dev.yml` / `application-prod.yml` override them when
  `SPRING_PROFILES_ACTIVE` is `dev` or `prod`. Values are read with `@Value("${hmms.…}")` (see
  `HotelSettings`).
- **Scheduling and async.** `@EnableScheduling` enables `@Scheduled` methods (expired-session cleanup,
  booking.com calendar sync every 15 minutes). `@EnableAsync` lets `MailService.send` run in the
  background so a slow SMTP server never slows down a request.

## Request walkthrough 1: creating a reservation

`POST /api/reservations` with a new guest:

1. **`TokenAuthenticationFilter`** reads the `Authorization: Bearer …` header (or the `HMMS_AUTH`
   cookie), looks the token up in `AuthService` and, if valid, marks the request as authenticated.
   `SecurityConfig` requires that for everything under `/api/**` except `/api/auth/login` and
   `/api/public/**`.
2. **`ReservationController.createReservation`** receives the JSON, already converted by Spring
   (Jackson) into a `CreateReservationRequest`. It calls the service and returns `201 Created`
   with a `ReservationResponse`, or `400` with `{"error": …}` on an `IllegalArgumentException`.
3. **`ReservationService.createReservation`** (in a transaction):
   - validates the dates;
   - `getOrCreateGuest`: reuses the guest when the email *and* name match, rejects a clash with
     `GuestConflictException` (→ 409 via `GlobalExceptionHandler`), or creates a guest through
     `GuestService.createGuestEntity` (name normalization, phone → E.164, duplicate check);
   - checks availability with `ReservationRepository.findActiveOverlapping`;
   - saves a `Reservation` entity with status `CONFIRMED`.
4. **`toResponse`** turns the entity into a `ReservationResponse` DTO. DTOs keep the JSON stable
   and avoid leaking internal fields (or endless JSON from entity relationships).

## Request walkthrough 2: logging in

1. `POST /api/auth/login` is public. `AuthController` passes the credentials to
   `AuthService.login`.
2. `AuthService` finds the `AppUser` by username or email and checks the password with BCrypt
   (`PasswordEncoder` bean from `SecurityConfig`).
3. On success it generates a random token, keeps it in memory with an expiry (12h by default)
   and returns it. The controller also sets it as an HttpOnly cookie.
4. Every later request goes through `TokenAuthenticationFilter` (step 1 above).
   Tokens live in memory, so restarting the backend logs everyone out.

## Where to add things

| You want to… | Do this |
|---|---|
| Add a column | New Flyway migration `V<next>__description.sql`, field on the entity, field on the DTO(s), map it in the service's `toResponse` |
| Add an endpoint | Method on a controller (or a new `@RestController`), logic in a service, query in a repository |
| Add a public endpoint | Put it under `/api/public/...` in `controllers/publicapi/`; consider `PublicRateLimiter` for writes |
| Add a business rule | In the service, throwing `IllegalArgumentException` with a message the user can read (becomes a 400) |
| Send an email | Add a text to `GuestMails`, call `mailService.send(...)` from a service |
| Run something periodically | A `@Scheduled` method on a bean |
| Add configuration | `hmms.something: ${HMMS_SOMETHING:default}` in `application.yml`, document it in `.env.example` |

## Tests

`src/test/java` has two kinds of tests:

- **Plain unit tests** (`PhoneNumbersTest`, `IcalCalendarTest`, `GuestLinkTokensTest`) for pure
  logic without Spring.
- **Integration tests** extending `IntegrationTest`: the full application runs against a real
  Postgres database (`hotel_test` on port 5433, see `src/test/resources/application-test.yml`).
  Each test runs in a transaction that is rolled back afterwards. External systems are replaced
  with `@MockitoBean` (e.g. `MailService`, `IcalFetcher`).

Run them with `./mvnw test` (CI runs the same against a Postgres service container).
