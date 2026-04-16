# Freelance Marketplace Platform — GigBridge

**Mini Fiverr–style marketplace** where buyers purchase services ("gigs") from sellers, with role-based access, PayPal payments, subscriptions, messaging, real-time chat, dispute resolution, and admin tooling.  
Stack: **Laravel 13** (API + business logic) and **React** (UI via **Vite**), **MySQL**, **Spatie Laravel Permission** for RBAC, **Laravel Reverb / Pusher** for WebSockets.

---------------------------------------------------------------------------------------------------------------------

## 1. Purpose and scope

| Item | Description |
|------|-------------|
| **What** | Full-stack marketplace for listing, buying, and delivering digital/service gigs. |
| **Who** | Buyers, sellers, and a non–self-serve super admin. |
| **Why** | Demonstrates SaaS-style patterns: RBAC, orders and escrow-style payments, real-time messaging, notifications, and scalable monolith structure. |

---------------------------------------------------------------------------------------------------------------------

## 2. Roles and permissions

### 2.1 Buyer

- **Access**: orders, messages, disputes, favourites, notifications, profile settings.
- Browse and search gigs with keyword, category, subcategory, price, delivery, rating, and sort filters.
- Save gigs to a **wishlist** (heart button on catalog cards).
- Place orders, pay via PayPal, **manage orders** (track, accept/revise, cancel).
- Message sellers, request revisions, cancel per rules.
- Leave reviews after order completion.
- **Notification center** and **preference toggles** (email vs in-app for orders, messages, reviews).

### 2.2 Seller

- **Access**: active orders, earnings summary, gig count vs plan limit, subscription status.
- **Create and manage gigs**: (media, packages, pricing, delivery time) — list, edit, activate/deactivate.
- **Manage incoming orders** (queue, deliver, revisions, cancel) deliver work (files + notes).
- Message buyers.
- **Subscribe to a plan** (e.g. Free / Basic / Pro) for gig limits and features; **request withdrawals** of released earnings.
- Notification center / preferences.
- Public **seller profile page** visible to all visitors.

### 2.3 Role assignment

- On **registration**, user chooses **Buyer** or **Seller**; role is stored and enforced via RBAC.
- Admin can change roles, permissions and user status (e.g. active / banned) at any time.
- **Super admin** is not a public signup role; it owns categories, user management, plans, system settings, and order management and overrides.

----------------------------------------------------------------------------------------------------------------------

## 3. Super admin: configuration and pages

**Who:** Created only via seeder or Artisan — **not** self-serve registration.

### 3.1 Categories

- **Parent category**: name, slug, status (active/inactive).
- **Subcategory**: name, slug, `parent_id`, status.

### 3.2 Users

- Manage name, email, **role**, **permission**, **status** (active/banned).

### 3.3 Subscription plans

- name, price, duration_days, gig_limit, features, status CRUD for commercial packages sellers can buy.

### 3.4 Email settings (SMTP)

- Driver (smtp/sendmail/mailgun), host, port, username, password, encryption, from address, from name.

### 3.5 Brand settings

- Site name, logo, optional favicon, tagline, primary/secondary colors, footer text, contact email/phone, address, social URLs.

### 3.6 Payment settings

- PayPal mode (sandbox/live), client ID/secret, currency, **platform_fee_percentage**, **auto_release_days**, optional refund policy text.

### 3.7 Trello Settings

Super admin can enable Trello-based notifications for system events.

- trello_enabled, trello_api_key, trello_token, trello_board_id, trello_list_id.

#### Supported Events

- Order placed, Order delivered, Order completed, Order cancelled, New message, New seller signup, Withdrawal request.

#### Behavior

- When enabled, system creates a **Trello card** for selected events.
- Card contains: Title (event name), Description (order/user details), Timestamp.

### 3.8 Notification settings

- Per-event toggles for **email** (registration, order placed/completed/cancelled, messages, reviews, payments, withdrawals, subscriptions).
- Per-event toggles for **in-app** (orders, messages, reviews, payment released).
- Per-event toggles for **Trello** (order placed, delivered, completed, cancelled, new messages, withdrawal requests, new user registrations).

#### Global Controls
- Enable/disable **email notifications**
- Enable/disable **in-app notifications**
- Enable/disable **Trello integration**

### 3.9 Order intervention (super admin)

- Adjust **order status**, **payment_status**, **escrow_held**, and timestamps (`delivered_at`, `completed_at`, `cancelled_at`).
- Monitor platform revenue from sellers and buyers.

--------------------------------------------------------------------------------------------------------------------

## 4. End-to-end flows

### 4.1 Onboarding

1. User opens **Register**: name, email, password, password confirmation, role (buyer/seller).
2. User opens **Login** or uses **Forgot password** → **Reset password** (token + email + new password).
3. Authenticated users manage **Profile**: name, email, bio, phone, picture, skills, location, website.

### 4.2 Seller: gig lifecycle

1. Seller creates a **Gig**: title, description, category, subcategory, multiple images, optional tags, status (active/inactive).
2. Seller defines **three packages** per gig: Basic / Standard / Premium — each with title, description, price, delivery days, revision count.
3. Gig goes to **admin moderation** (pending → approved/rejected) before appearing in catalog.
4. **Ongoing management**: **My gigs** list, **edit** any field or packages, toggle **active/inactive**, remove/replace images as needed.
5. Editing an approved gig's core fields (title, description, category, packages) triggers **re-approval**.

### 4.3 Buyer: discovery → order

1. Buyer browses **Search & filters**: keyword, category, **subcategory**, price range, delivery days, rating, sort.
2. Buyer can **save gigs** to their wishlist via the heart button on any gig card.
3. Buyer opens gig, picks a **package**, opens **Place order**:
   - `gig_id`, `package_id`, quantity, requirements (text), optional file, reference link, style notes, optional coupon.
4. Order is created in pending state; buyer proceeds to **payment**.

### 4.4 Payment and escrow (business flow)

| Step | Actor | What happens |
|------|--------|----------------|
| 1 | Buyer | Confirms order and billing identity (**billing_name**, **billing_email** + PayPal); checkout starts. |
| 2 | PayPal | Buyer authorizes payment; platform records `paypal_order_id` / `paypal_payer_id` and transaction metadata. |
| 3 | System | On successful capture, payment state moves to **paid**; order becomes **active**; `due_at` is set to `now + delivery_days`; seller is notified. |
| 4 | Seller | Uploads **delivery** (file + optional note); order moves to **delivered**. |
| 5 | Buyer | Accepts → **completed**; or requests **revision** → back to active; or initiates **cancellation** with reason. |
| 6 | System | On completion, **platform fee** is applied; remainder credited to seller's **available balance**; `payment_status` moves to **released**. |
| 7 | Admin / policy | Cancellations drive **refund** paths back through PayPal where applicable. |
| 8 | Seller | May **request withdrawal** of eligible earnings. |

**Platform fee:** Configurable **service fee %** (e.g. 10–20%): buyer pays $100 → fee $10 → seller **net** $90.

**Payment states:** `pending` → `paid` → `released` or `refunded`; plus `failed` where applicable.

**Auto-release:** Super admin can configure **auto_release_days** (auto-complete X days after delivery if buyer does not act).

### 4.5 Order deadline tracking

- When an order becomes **active** (payment captured), `due_at` is computed as `activated_at + delivery_days`.
- Both buyer and seller order lists show a **due date badge** on active orders:
  - **Overdue** — red badge with "Overdue by Xd Yh"
  - **Due today** — amber badge with "Yh left"
  - **Future** — muted badge with "Xd Yh left"

### 4.6 Buyer & seller: order management

#### Buyer — order management

| Capability | Detail |
|------------|--------|
| **Order list** | See all orders; filter by status and payment; search by ID, seller, or gig. |
| **Order detail** | Gig title, package, quantity, price, seller identity, requirements, reference link, style notes, coupon, timeline. |
| **Pay / checkout** | From pending orders, continue to PayPal. |
| **While active** | Message seller; monitor due date countdown. |
| **When delivered** | **Accept** → completed; or **Request revision** with note; or **Cancel** with reason. |
| **After completed** | Leave **review** (rating + comment). |

#### Seller — order management

| Capability | Detail |
|------------|--------|
| **Order list** | See all paid orders; filter by status and payment; search by ID, buyer, or gig. |
| **Order detail** | Buyer requirements, files, links, due date. |
| **While active** | **Submit delivery**: file (required) + optional note. |
| **Revisions** | Re-deliver within agreed revision limits. |
| **Cancel** | Submit cancellation with reason. |
| **Messaging** | Talk to buyer with optional order context. |
| **Earnings** | After completion, balances move toward released (net of platform fee). |

### 4.7 Messaging

- **Messages** tie to `sender_id`, `receiver_id`, optional `order_id`, text body, optional attachment.
- **Real-time** via Laravel Reverb / Pusher — order chat modal updates live without page reload.
- Triggers for email/in-app notifications are configurable under **Notification settings**.

### 4.8 Dispute resolution (real-time)

- Buyer or seller raises a **dispute** on a delivered or completed order.
- **Dispute chat** is real-time — buyer, seller, and admin all see new messages instantly via WebSockets.
- Admin reviews evidence and resolves with one of three decisions:
  - **Full refund** → 100% back to buyer
  - **Partial refund** → configurable % split with live preview
  - **Release** → 100% to seller
- Resolution triggers wallet movements and order status updates automatically.

### 4.9 Reviews

- After **order completed**, buyer submits **Review**: `order_id`, rating 1–5, comment.
- Feeds seller reputation, search/filter by rating, and seller public profile.

### 4.10 Subscriptions

- **Plans** (catalog): name, price, `duration_days`, `gig_limit`, JSON **features**, status.
- **Subscription** row links `user_id` to `plan_id` with `starts_at`, `ends_at`, `status`.
- **Who subscribes:** Sellers only — subscription gates how many gigs they can publish.
- **Purchase / renew:** seller picks a plan in-app; paid plans complete through PayPal.
- Enforce **gig_limit** when creating or activating gigs.

### 4.11 User notification center & preferences

| Area | Behavior |
|------|-----------|
| **In-app inbox** | Rows from `notifications` (`type`, `data`, `read_at`); user can mark read / mark all read. |
| **Preferences** | Per-user toggles: `email_notifications`, `order_updates`, `message_alerts`, `review_alerts`. |
| **Delivery** | Notifications delivered via in-app, email, or Trello (if enabled); gated by super admin settings. |

### 4.12 Trello Notifications (System-level)

- Managed globally by super admin — not configurable by individual users.
- System automatically creates Trello cards for selected events in the admin-configured board and list.
- Acts as an internal operations / tracking tool alongside email and in-app notifications.

### 4.13 Seller payouts (withdrawals)

- After orders complete and payments move to **released**, seller accumulates **withdrawable balance** (net of platform fee).
- Seller initiates a **withdrawal request** (amount, payout method details).
- Super admin confirms and pays out; status transitions are auditable.

### 4.14 Gig wishlist (buyer favourites)

- Buyers can **heart** any gig card in the catalog to save it.
- Heart button is optimistic — state updates instantly, server syncs in background via plain `fetch`.
- Toast notification confirms save/remove action.
- **Saved Gigs** page (`/buyer/favourites`) shows all saved gigs with the same card layout.
- Unsaving from the Saved Gigs page removes the card immediately.
- "Saved Gigs" nav item in buyer sidebar.

----------------------------------------------------------------------------------------------------------------------

## 5. Order model (status and permissions)

### 5.1 Order status progression

**Pending** → **Active** (after payment captured, `due_at` set) → **Delivered** (seller submission) → **Completed** (buyer acceptance or auto-release) **or** **Cancelled**.

### 5.2 Who can change what

| Transition | Who |
|------------|-----|
| pending → active | System (PayPal success) — sets `due_at` |
| active → delivered | Seller |
| delivered → completed | Buyer or system (auto_release_days) |
| delivered → active | Buyer (revision loop) |
| active → cancelled | Buyer or seller (with reason, policy-dependent) |
| payment pending → paid | System |
| paid → released | System (after completion / rules) |
| paid → refunded | System (cancellation / dispute policy) |

### 5.3 Cancellation and refunds (policy summary)

- **Before work starts**: full refund to buyer (target behavior).
- **After work started**: partial or negotiated refund (via dispute resolution).

----------------------------------------------------------------------------------------------------------------------

## 6. Data model (entities)

| Entity | Purpose |
|--------|---------|
| users | Accounts; profile fields; status. |
| roles, permissions | Spatie RBAC. |
| categories | Tree: parent / child via `parent_id`. |
| gigs | Seller offerings; link to category/subcategory; approval workflow. |
| gig_packages | Basic/standard/premium economics per gig. |
| gig_images | Gallery paths per gig. |
| gig_favourites | Buyer wishlist — `user_id`, `gig_id`, unique constraint. |
| orders | Buyer/seller/gig/package; requirements; pricing; lifecycle + payment flags; `due_at`. |
| order_deliveries | Files and notes per delivery. |
| order_revisions | Revision requests. |
| order_cancellations | Who cancelled, reason, audit. |
| messages | Conversation threads, optional order scope. |
| reviews | Post-completion ratings. |
| payments | PayPal-oriented fields and statuses. |
| plans, subscriptions | Monetization limits for sellers. |
| notifications | In-app notification records (`type`, `data`, `read_at`). |
| disputes | Dispute records per order with decision and resolution fields. |
| dispute_messages | Real-time chat messages within a dispute. |

**Key fields (reference)**

- **orders**: `buyer_id`, `seller_id`, `gig_id`, `package_id`, requirements, `price`, `status`, `payment_status`, `escrow_held`, `due_at`, `delivered_at`, `completed_at`, `cancelled_at`.
- **payments**: `order_id`, `user_id`, method (`paypal`), `amount`, `status`, `transaction_id`, `paypal_order_id`, `paypal_payer_id`.
- **reviews**: `order_id`, `buyer_id`, `seller_id`, `gig_id`, `rating`, `comment`.
- **order_cancellations**: `order_id`, `cancelled_by`, `cancellation_reason`, `created_at`.
- **gig_favourites**: `user_id`, `gig_id`, unique(`user_id`, `gig_id`).
- **dispute_messages**: `dispute_id`, `sender_id`, `body`, `attachment_path`.

----------------------------------------------------------------------------------------------------------------------

## 7. Technical architecture

### 7.1 Pattern

- **Monolithic Laravel** application: HTTP layer, domain logic, queues, events/listeners, notifications.
- **React SPA** built with **Vite** under `resources/js`: components, pages, layouts, hooks, context, routes.
- **Axios / Inertia** for page navigation; **React Router** not used (Inertia handles routing); **Tailwind CSS** for styling.

### 7.2 Backend structure

```
app/
├── Models/
├── Http/Controllers|Middleware|Requests/
├── Services/
├── Events/
│   ├── OrderMessageSent.php        # real-time order chat
│   └── DisputeMessageSent.php      # real-time dispute chat
├── Listeners/
└── Notifications/
resources/js/   # React + Inertia
routes/web.php, routes/api.php, routes/channels.php
database/migrations, database/seeders
```

### 7.3 Real-time (WebSockets)

- **Laravel Reverb** (or Pusher) for WebSocket broadcasting.
- **Order chat** — `orders.{orderId}.messages` private channel; `OrderMessageSent` event.
- **Dispute chat** — `disputes.{disputeId}.messages` private channel; `DisputeMessageSent` event.
- Channel authorization in `routes/channels.php` — buyer/seller verified against order/dispute ownership; super admin always authorized for disputes.
- Frontend uses `window.Echo` (Laravel Echo + Pusher JS) initialized in `resources/js/echo.ts`.

### 7.4 Frontend component library

Key shared components under `resources/js/components/`:

| Component | Purpose |
|-----------|---------|
| `flash-toaster.tsx` | Toast notifications — driven by Inertia flash props **and** imperative `toast()` helper via custom DOM event |
| `navigation-loader.tsx` | Full-screen overlay loader on Inertia navigations (150ms delay, fade-in) |
| `empty-state.tsx` | Reusable empty state with icon, title, description, optional CTA |
| `order-due-date.tsx` | Countdown / overdue badge for active orders |
| `order-chat-modal.tsx` | Real-time order messaging modal |
| `ui/button.tsx` | Extended with `loading` prop — auto-shows spinner and disables |
| `ui/spinner.tsx` | Animated spinner used by Button and NavigationLoader |

### 7.5 Pages inventory

```
pages/
├── welcome.tsx                  # Public landing page (hero, features, how it works, roles CTA)
├── dashboard.tsx                # Role-aware: seller analytics / buyer analytics / general
├── sellers/show.tsx             # Public seller profile (no auth required)
├── buyer/
│   ├── gigs/index.tsx           # Catalog with subcategory filter + heart/wishlist
│   ├── gigs/show.tsx            # Gig detail + order form
│   ├── favourites/index.tsx     # Saved gigs wishlist
│   ├── orders/index.tsx         # Buyer order management + due date badges
│   └── payments/index.tsx       # Payment history + invoice download
├── seller/
│   ├── gigs/index.tsx           # Gig management (create/edit/delete/toggle)
│   ├── orders/index.tsx         # Seller order management + due date badges
│   ├── plans/index.tsx          # Subscription plan purchase
│   ├── wallet/index.tsx         # Wallet + withdrawal requests
│   └── payments/index.tsx       # Payment history
├── disputes/
│   ├── index.tsx                # Dispute list (buyer/seller)
│   └── show.tsx                 # Dispute detail + real-time chat
├── messages/index.tsx           # Messaging center
├── notifications/index.tsx      # Notification inbox
├── settings/
│   ├── profile.tsx              # Profile settings
│   ├── security.tsx             # Password + 2FA
│   ├── notifications.tsx        # Notification preferences
│   └── appearance.tsx           # Theme toggle
└── admin/
    ├── dashboard.tsx            # Admin analytics dashboard
    ├── disputes/show.tsx        # Admin dispute resolution + real-time chat
    └── ...                      # categories, users, orders, gigs, plans, coupons, settings, withdrawals, ledger
```

### 7.6 Cross-cutting concerns

- **Queues**: database or Redis-backed for mail, heavy tasks, and reliable processing after PayPal webhooks.
- **Events & listeners**: domain events (order placed, delivered, completed, paid, refunded, message sent) drive notifications, audit, and analytics.
- **Scheduler**: run queue workers, retry failed jobs, and **auto-complete** orders after `auto_release_days` from delivery.
- **Imperative toasts**: `toast(level, message)` exported from `flash-toaster.tsx` — fires a `CustomEvent('app:toast')` on `window`, picked up by `FlashToaster` without any Inertia round-trip.

----------------------------------------------------------------------------------------------------------------------

## 8. Setup (local)

### Backend

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env` (database, mail, queue, PayPal, Reverb/Pusher when testing).

```bash
php artisan migrate --seed
php artisan serve
```

### Frontend

```bash
npm install
npm run dev
```

### WebSockets (Reverb)

```bash
php artisan reverb:start
```

Or configure Pusher credentials in `.env` and skip Reverb.

----------------------------------------------------------------------------------------------------------------------

## 9. Environment variables (key)

```env
# App
APP_NAME=GigBridge
APP_URL=http://localhost

# Database
DB_CONNECTION=mysql
DB_DATABASE=gigbridge

# Queue (use database for local)
QUEUE_CONNECTION=database

# Broadcasting
BROADCAST_CONNECTION=reverb          # or pusher
VITE_REVERB_APP_KEY=...
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http

# PayPal (configured via admin settings UI, not .env)
# SMTP (configured via admin settings UI, not .env)
```

----------------------------------------------------------------------------------------------------------------------

## 10. Deployment (orientation)

| Layer | Options |
|--------|---------|
| App | VPS, Laravel Forge, or cloud VM |
| Frontend assets | `npm run build`; Vite emits production bundles consumed by Laravel |
| WebSockets | Laravel Reverb process or Pusher hosted service |
| Database | Managed MySQL or equivalent |
| Secrets | PayPal keys, SMTP, app key — never committed |

----------------------------------------------------------------------------------------------------------------------

## 11. Roadmap and open items

### Implemented ✅

- Full buyer/seller/admin role-based marketplace
- Gig catalog with keyword, category, **subcategory**, price, delivery, rating filters
- Gig wishlist / favourites (heart button, saved gigs page, optimistic UI + toast)
- Public seller profile page (`/sellers/{id}`) — gigs, stats, reviews, message button
- Order deadline tracking (`due_at` — countdown / overdue badges on both sides)
- Real-time order chat (WebSockets via Reverb/Pusher)
- Real-time dispute chat (same WebSocket infrastructure)
- Dispute resolution with full/partial refund and release decisions + wallet movements
- PayPal escrow payments with platform fee
- Seller wallet + withdrawal requests
- Subscription plans with gig limits
- Coupon / discount system
- Gig moderation (admin approve/reject with re-approval on edit)
- Admin analytics dashboard (revenue trend, order funnel, top sellers, top categories)
- Seller analytics dashboard (revenue trend, top gigs, payout readiness, health signals)
- Buyer analytics dashboard (spend trend, favorite sellers, top categories)
- In-app + email + Trello notification system
- Two-factor authentication
- Invoice PDF download (buyer + seller)
- Excel + PDF order export (seller)
- Full-screen navigation loader (150ms delay, fade-in overlay)
- Consistent empty states with icons and CTAs across all list pages
- Spinner on all form submit buttons via `loading` prop on Button component
- Imperative `toast()` helper for non-Inertia actions
- Public landing page (GigBridge welcome page)

### Pending / Roadmap

- Real-time messages page (main `/messages` index — currently requires page reload; order chat modal is already real-time)
- Seller availability toggle (on/off without deactivating gigs)
- Admin broadcast announcements (dismissible banner for all/buyers/sellers)
- Buyer invoice PDF download
- Gig search — server-side pagination (currently loads all matching gigs)
- Dispute resolution — admin bulk filter/search
- Withdrawal detail view for sellers (show admin note on rejection)
- Language translation (on-demand gig content translation via Google/DeepL API)
- Real-time chat (WebSockets / Echo) on main messages page
- Advanced search and filtering (beyond current baseline)
- Dispute resolution module enhancements
- Admin dashboard analytics — deeper drill-down
- Mobile app (React Native)
- Performance hardening (caching, query tuning, pagination)

----------------------------------------------------------------------------------------------------------------------

## 12. Contributing and license

Contributions welcome via fork and PR.  
Licensed under the **MIT License**.

----------------------------------------------------------------------------------------------------------------------

## Appendix A — Form field checklists (quick reference)

**Register:** name, email, password, password_confirmation, role.  
**Login:** email, password.  
**Forgot / reset:** email; reset adds token, password, password_confirmation.  
**Profile:** name, email, bio, phone, profile_picture, skills, location, website.  
**Gig (seller):** title, description, category_id, subcategory_id, images, tags, status + package rows (basic/standard/premium).  
**Order (buyer):** package_id, quantity, requirements (+ optional file, links, style, coupon), billing_name, billing_email.  
**Payment:** order_id, PayPal flow fields.  
**Order actions — buyer:** accept / revision_note / cancellation_reason / review (rating + comment).  
**Order actions — seller:** delivery_file, delivery_note, cancellation_reason.  
**Messages:** receiver_id, message, optional attachment.  
**Dispute:** reason (raise); body + optional attachment (chat message).  
**Withdrawal:** amount, method, details.  
**User notification prefs:** email_notifications, order_updates, message_alerts, review_alerts.

----------------------------------------------------------------------------------------------------------------------

## Appendix B — API / broadcast channels

| Channel | Type | Authorized |
|---------|------|-----------|
| `orders.{orderId}.messages` | Private | Buyer or seller of that order |
| `disputes.{disputeId}.messages` | Private | Buyer/seller of that dispute's order, or super admin |

| Event | Channel | Payload |
|-------|---------|---------|
| `message.sent` | `orders.{id}.messages` | `{ order_id, message }` |
| `message.sent` | `disputes.{id}.messages` | `{ dispute_id, message }` |

----------------------------------------------------------------------------------------------------------------------

*This README reflects the current implemented state of GigBridge. Sections are ordered: purpose → roles → admin control plane → buyer/seller journeys → order rules → data model → tech → ops → roadmap.*
