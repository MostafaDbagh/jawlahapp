# Mock Seed Auth Data

Pre-made accounts (one per role) for development, QA, and demos. Created by the
idempotent seed script `scripts/seedAuth.js`.

```bash
# Seed all mock accounts (+ a demo restaurant for the merchant)
cd jawlahapp
npm run seed:auth

# Point at a dev database first if you don't want them in the shared/live DB:
MONGO_URI=mongodb://127.0.0.1:27017/jawla_dev npm run seed:auth
```

> ⚠️ `MONGO_URI` in `.env` points at the shared **live** Atlas DB. Override it
> (as above) to keep mock data out of production. **Change these passwords**
> before using any shared environment.

---

## Accounts

| Role | `account_type` | Login method | Email | Password | Phone |
|---|---|---|---|---|---|
| Platform Admin | `PLATFORM_ADMIN` | Web · email + password | `admin@jawlah.sy` | `Admin123` | +963 900 000 000 |
| Platform Owner | `PLATFORM_OWNER` | Web · email + password | `owner@jawlah.sy` | `Owner12345` | +963 900 000 001 |
| Merchant (restaurant owner) | `SERVICE_PROVIDER_OWNER` | Web · email + password | `merchant@jawlah.sy` | `Merchant123` | +963 900 000 002 |
| Customer Service | `CUSTOMER_SERVICE` | Web · email + password | `support@jawlah.sy` | `Support123` | +963 900 000 003 |
| Driver | `DRIVER` | Mobile · **phone OTP** | `driver@jawlah.sy` | `Driver12345` | **+963 0944 000 001** |
| Customer | `CUSTOMER` | Mobile · **phone OTP** | `customer@jawlah.sy` | `Customer123` | **+963 0944 000 002** |

> Phone-login numbers keep the Syrian leading `0` (national form `0944000001`),
> because the apps build the international string as `+963` + `0` + national. In
> the app's phone field you type just the national part **`944000001`** (the
> `+963` and leading `0` are added for you).

The seed also creates a demo restaurant for the merchant: **مطعم جولة التجريبي**
(approved + active) with one branch (الفرع الرئيسي, دمشق) and one product
(شاورما دجاج).

---

## Login flows

### Web portal (`jawlah_web`) — email + password
Admin, Platform Owner, Merchant, and Customer Service sign in here.

```
POST /api/v1/auth/login
{ "email": "admin@jawlah.sy", "password_hash": "Admin123" }
→ { data: { user, accessToken, refreshToken } }
```

- Admin / Platform Owner → admin dashboard (`/admin`).
- Merchant → restaurant portal (`/`), manages **مطعم جولة التجريبي**.
- Customer Service → can manage complaints & contact requests via the API
  (no dedicated portal screen).

### Mobile / driver app — phone OTP
Driver and Customer sign in by phone. In **development** (`NODE_ENV !==
'production'`) the **master OTP `000000`** always works (no SMS gateway needed);
`request-otp-login` also returns the real `devOtp` in the response.

```
POST /api/v1/auth/request-otp-login   { "phone": "+9630944000001" }
POST /api/v1/auth/verify-otp-login    { "phone": "+9630944000001", "otp": "000000" }
→ { data: { user, accessToken, refreshToken } }
```

> Rate limit: `request-otp-login` is capped at **3 requests/hour per phone**.

---

## Access summary (who can reach what)

| Capability | Admin / Owner | Merchant | Cust. Service | Driver | Customer |
|---|:--:|:--:|:--:|:--:|:--:|
| `/api/v1/admin/*` (overview, users, drivers, all-orders) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve / reject / block restaurants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Block / unblock users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create / manage promo codes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage complaints & contact (`GET/PATCH`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Own restaurant (`/vendors/mine`, branches, products) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Incoming orders box (`/orders/incoming`) | ✅ (all) | ✅ (own) | ❌ | ❌ | ❌ |
| Driver job board / deliveries (`/driver/*`) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Place orders, file complaints (`/orders`, `/complaints`) | — | — | — | — | ✅ |

---

## Other auth endpoints (all roles)

| Action | Endpoint |
|---|---|
| Get profile | `GET /api/v1/auth/profile` (Bearer token) |
| Refresh token | `POST /api/v1/auth/refresh-token` `{ refreshToken }` |
| Password reset (email) | `POST /auth/request-password-reset` `{ email }` → `POST /auth/reset-password` `{ email, otp, newPassword }`. **Requires SMTP** to be configured; in dev with SMTP the response includes `devOtp`. |
| Password reset (phone) | `POST /auth/request-password-reset` `{ phone }` → `POST /auth/reset-password` `{ phone, otp: "000000", newPassword }`. No gateway needed — the dev master code `000000` works. |
| Register (web roles) | `POST /auth/register` `{ username, email, full_name, country_code, phone_number, password_hash, account_type }` |

### Failure behaviours
- Wrong password / unknown email → **401**.
- Blocked account (`is_active: false`) → **401 “Account is not active”**; a
  blocked user's existing token is also rejected on the next request.
- **5** failed password attempts → account locked for **30 minutes** (**423**).
- Invalid OTP (not the real code and not `000000` in dev) → **400**.
- Missing / invalid bearer token on a protected route → **401**.
- Wrong role for a route → **403**.
