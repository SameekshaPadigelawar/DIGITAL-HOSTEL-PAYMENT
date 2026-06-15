# HostelPay Backend

This Node.js API stores HostelPay data in MongoDB Atlas.

## Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Set your Atlas connection string before running the server.

PowerShell:

```powershell
$env:MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/hostelpay?retryWrites=true&w=majority"
$env:MONGODB_DB_NAME="hostelpay"
npm run dev
```

The API runs at:

```txt
http://localhost:5000
```

Health check:

```txt
http://localhost:5000/api/health
```

## MongoDB Atlas Notes

In Atlas, make sure:

- Your database user exists and the username/password are correct.
- Your current IP address is allowed in Network Access.
- The connection string includes the database name, for example `/hostelpay`.

## Main Routes

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/:id`
- `GET /api/hostels`
- `GET /api/owners/:ownerId/tenants`
- `GET /api/owners/:ownerId/stats`
- `GET /api/owners/:ownerId/settings`
- `PUT /api/owners/:ownerId/settings`
- `GET /api/payments`
- `POST /api/payments`
- `PUT /api/payments/:paymentId/approve`
- `GET /api/complaints`
- `POST /api/complaints`
- `GET /api/reminders`
- `POST /api/reminders`

## Demo Login

The first successful backend start seeds these accounts into Atlas.

Owner:

```txt
owner@hostelpay.com / owner123
```

Tenant:

```txt
priya@email.com / tenant123
```
