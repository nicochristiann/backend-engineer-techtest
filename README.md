# Visitor Check-In System

A simple visitor management system built with Node.js, Express, and PostgreSQL.

## Table of Contents

- [How to Run the Application](#how-to-run-the-application)
- [Architecture](#architecture)
- [Why Supabase and PostgreSQL](#why-supabase-and-postgresql)
- [Assumptions](#assumptions)
- [Trade-offs](#trade-offs)
- [Postman Collection](#postman-collection)

---

## How to Run the Application

### Prerequisites

- Node.js (v18+)
- PostgreSQL database (local or Supabase hosted)
- npm or yarn

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   PORT=5010
   ```

3. **Run the application:**

   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

4. **Verify it's running:**
   ```
   curl http://localhost:5010
   # Output: Server OK
   ```

### API Endpoints

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| `POST` | `/check-in`        | Check in a visitor      |
| `POST` | `/check-out`       | Check out a visitor     |
| `GET`  | `/visitors/active` | Get all active visitors |

### Example Request

```bash
curl -X POST http://localhost:5010/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "host_employee": "Jane Smith"
  }'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                               │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              visitorController.js                   │    │
│  │  - checkInVisitor()                                 │    │
│  │  - checkOutVisitor()                                │    │
│  │  - getActiveVisitors()                              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              async.waterfall()                      │    │
│  │  (Validation → Build Payload → Save)                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │ Knex Query Builder
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 visitors table                      │    │
│  │  - id (UUID)                                        │    │
│  │  - check_in_id (unique)                             │    │
│  │  - name, email, company, host_employee              │    │
│  │  - check_in_time, check_out_time                    │    │
│  │  - duration_minutes                                 │    │
│  │  - status (active/checked_out)                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer         | Technology                |
| ------------- | ------------------------- |
| Server        | Express.js                |
| Database      | PostgreSQL (via Supabase) |
| Query Builder | Knex.js                   |
| Flow Control  | async (waterfall)         |
| ID Generation | crypto + Date timestamp   |

---

## Why Supabase and PostgreSQL

### 1. **PostgreSQL**

- **Relational integrity**: Visitor records require strict schema (name, email, company, etc.)
- **ACID compliance**: Critical for check-in/check-out transactions
- **Unique constraints**: Prevents duplicate active visits per email
- **Row-level locking**: `.forUpdate()` in check-out prevents race conditions

### 2. **Supabase**

| Benefit                     | Explanation                                  |
| --------------------------- | -------------------------------------------- |
| **Managed infrastructure**  | No need to maintain self-hosted PostgreSQL   |
| **Instant API**             | Supabase provides REST APIs out of the box   |
| **Real-time subscriptions** | Optional future enhancement for live updates |
| **Row Level Security**      | Can add fine-grained access control later    |
| **Free tier**               | Sufficient for development/small production  |

### 3. **Why Knex.js**

- **Database abstraction**: Easy to switch between PostgreSQL and other databases
- **Query building**: Prevents SQL injection, cleaner syntax
- **Transaction support**: Built-in `.transaction()` for atomic operations
- **Migration support**: Schema management built-in

---

## Assumptions

### 1. **Business Logic**

- [x] One active visit per email at a time
- [x] Visitors are checked in by host employee name
- [x] Duration is calculated automatically on checkout

### 2. **Technical**

- [x] Single-tenant application (no multi-org support needed)
- [x] No authentication required (internal tool)
- [x] Network is relatively stable (retries handled at client level)
- [x] Check-in IDs are unique enough (timestamp + random bytes)

### 3. **Data**

- [x] Email is the unique identifier for visitor deduplication
- [x] All timestamps use server time
- [x] Duration is stored in minutes (rounded)

### 4. **Scale**

- [x] Low to medium traffic (< 1000 check-ins/day)
- [x] No need for caching layer yet
- [x] Single server instance is sufficient

---

## Trade-offs

### 1. **async.waterfall vs async/await**

| Aspect          | async.waterfall      | async/await            |
| --------------- | -------------------- | ---------------------- |
| Readability     | Nested callbacks     | Flat, linear code      |
| Error handling  | Single catch at end  | Try/catch per function |
| Debugging       | Hard to trace        | Easy to step through   |
| **Choice made** | Used async.waterfall | —                      |

**Trade-off**: Code uses legacy `async.waterfall` pattern — works but less readable than modern async/await.

---

### 2. **Check-in ID Generation**

| Approach                                | Pros                      | Cons                                |
| --------------------------------------- | ------------------------- | ----------------------------------- |
| **Current**: `CHK-{timestamp}-{random}` | No DB round-trip, fast    | Slight collision risk at high scale |
| **UUID**                                | Globally unique, standard | Longer, less human-readable         |
| **Database sequence**                   | Guaranteed unique         | Requires DB call                    |

**Trade-off**: Chose application-level ID generation for speed — acceptable for low-to-medium scale.

---

### 3. **No Authentication**

| Aspect            | Without Auth                | With Auth           |
| ----------------- | --------------------------- | ------------------- |
| Development speed | Fast                        | Slower to implement |
| Security          | Exposed to internal network | Protected           |
| Use case          | Internal kiosk              | Public-facing       |

**Trade-off**: No auth layer — assumes internal use only. Would need addition for public exposure.

---

### 4. **No Idempotency for Check-in**

| Aspect         | Current                    | With client_id          |
| -------------- | -------------------------- | ----------------------- |
| Network retry  | Creates duplicate check-in | Returns existing        |
| Implementation | Simple                     | Requires client changes |

**Trade-off**: Check-in retries can create duplicates — needs `client_id` for production. (Check-out already handles this via status check.)

---

### 5. **Supabase vs Self-Hosted**

| Aspect         | Supabase            | Self-Hosted     |
| -------------- | ------------------- | --------------- |
| Cost           | Free tier available | Requires server |
| Control        | Limited config      | Full control    |
| Latency        | May add ~50ms       | Faster          |
| Vendor lock-in | Yes                 | No              |

**Trade-off**: Using Supabase for convenience — acceptable for MVP, may migrate to self-hosted for cost control at scale.

---

## Postman Collection

`https://web.postman.co/workspace/Express~0acca6d0-300f-446c-8ba8-01f01a1bf950/collection/43043383-d3c9c953-7a06-4c61-9410-83364a12f532?action=share&source=copy-link&creator=43043383`

## Future Improvements

- [ ] Add `client_id` for idempotent check-ins
- [ ] Changing from using `async.waterfall` to `async/await`
- [ ] Add authentication layer
- [ ] Add input validation (Zod)
- [ ] Add rate limiting
- [ ] Add API versioning
