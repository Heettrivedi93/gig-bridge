# Freelance Marketplace Platform

**Mini Fiverr–style marketplace** where buyers purchase services (“gigs”) from sellers, with role-based access, PayPal payments, subscriptions, messaging, and admin tooling.  
Stack: **Laravel 13** (API + business logic) and **React** (UI via **Vite**), **MySQL**, **Spatie Laravel Permission** for RBAC.

---------------------------------------------------------------------------------------------------------------------

## 1. Purpose and scope

| Item | Description |
|------|-------------|
| **What** | Full-stack marketplace for listing, buying, and delivering digital/service gigs. |
| **Who** | Buyers, sellers, and a non–self-serve super admin. |
| **Why** | Demonstrates SaaS-style patterns: RBAC, orders and escrow-style payments, notifications, and scalable monolith structure. |

---------------------------------------------------------------------------------------------------------------------

## 2. Roles and permissions

### 2.1 Buyer

- **Buyer roles and permissions and access**: orders, messages, and can edit profile.
- Browse and search gigs (filters described in product spec).
- Place orders, pay via PayPal, **manage orders** (track, accept/revise, cancel) 
- Message sellers, request revisions, cancel per rules.
- Leave reviews after order completion.
- **Notification center** and **preference toggles** (email vs in-app for orders, messages, reviews)

### 2.2 Seller

- **Seller roles and permissions and access**: active orders, earnings summary, gig count vs plan limit, subscription status.
- **Create and manage gigs**: (media, packages, pricing, delivery time) — list, edit, activate/deactivate;
- **Manage incoming orders** (queue, deliver, revisions, cancel) deliver work (files + notes).
- Message buyers.
- **Subscribe to a plan** (e.g. Free / Basic / Pro) for gig limits and features; **request withdrawals** of released earnings.
- Notification center / preferences 

### 2.3 Role assignment

- On **registration**, user chooses **Buyer** or **Seller**; role is stored and enforced via RBAC.
- Admin can change roles, permissions and user status (e.g. active / banned) at any time.
- **Super admin** is not a public signup role; it owns categories, user managements, plans, system settings, and order management and overrides.

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

- trello_enabled, trello_api_key, trello_token , trello_board_id , trello_list_id.

#### Supported Events

- Order placed, Order delivered, Order completed, Order cancelled, New message, New seller signup, Withdrawal request.

#### Behavior

- When enabled, system creates a **Trello card** for selected events.
- Card contains:
  - Title (event name)
  - Description (order/user details)
  - Timestamp

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
- Monitor plateform revenue from sellers and buyers.
- Monitor related **messages** and files.

--------------------------------------------------------------------------------------------------------------------

## 4. End-to-end flows (presentation narrative)

Use these sections in order for buyer/seller journeys.

### 4.1 Onboarding

1. User opens **Register**: name, email, password, password confirmation, role (buyer/seller).
2. User opens **Login** or uses **Forgot password** → **Reset password** (token + email + new password).
3. Authenticated users manage **Profile**: name, email, bio, phone, picture, skills, location, website.

### 4.2 Seller: gig lifecycle

1. Seller creates a **Gig**: title, description, category, subcategory, multiple images, optional tags, status (active/inactive).
2. Seller defines **three packages** per gig: Basic / Standard / Premium — each with title, description, price, delivery days, revision count.
3. Gig appears in catalog subject to category visibility and seller subscription limits.
4. **Ongoing management**: **My gigs** list, **edit** any field or packages, toggle **active/inactive**, remove/replace images as needed.

### 4.3 Buyer: discovery → order

1. Buyer browses **Search & filters**: keyword, category, price range, delivery days, rating, sort.
2. Buyer opens gig, picks a **package**, opens **Place order**:
   - `gig_id`, `package_id`, quantity, requirements (text), optional file, reference link, style notes, optional coupon.
3. Order is created in an early lifecycle state; buyer proceeds to **payment**.

### 4.4 Payment and escrow (business flow)

| Step | Actor | What happens |
|------|--------|----------------|
| 1 | Buyer | Confirms order and billing identity (**billing_name**, **billing_email** + PayPal); checkout starts. |
| 2 | PayPal | Buyer authorizes payment; platform records `paypal_order_id` / `paypal_payer_id` and transaction metadata. |
| 3 | System | On successful capture, payment state moves toward **paid**; order becomes **active**; seller is notified per settings. |
| 4 | Seller | After completion of work seller Uploads **delivery** (file + optional note); order moves to **delivered**. |
| 5 | Buyer | After satisfication of work buyer can Accepts → **completed**; or requests **revision** → back toward active work; or initiates **cancellation** with reason. |
| 6 | System | On completion, **platform fee** is applied; remainder conceptually credited to seller’s **available balance**; `payment_status` can move to **released** after rules so funds count toward payouts. |
| 7 | Admin / policy | Cancellations drive **refund** paths back through PayPal where applicable. |
| 8 | Seller | May **request withdrawal** of eligible earnings|

**Platform fee (example)**  
Configurable **service fee %** (e.g. 10–20%): buyer pays $100 → fee $10 → seller **net** $90 (exact implementation follows `platform_fee_percentage` in admin payment settings).

**Payment states (conceptual)**  
`pending` → `paid` → `released` or `refunded`; plus `failed` where applicable.

**Auto-release**  
Super admin can configure **auto_release_days** (e.g. auto-complete X days after delivery if buyer does not act).

### 4.5 Buyer & seller: order management

This is the **day-to-day operations** layer: both sides see an order-centric workspace (list + detail), with actions gated by **order status** and RBAC.

#### Buyer — order management

| Capability | Detail |
|------------|--------|
| **Order list** | See all orders where the user is **buyer**; filter or scan by status (e.g. awaiting payment, in progress, awaiting review, completed, cancelled). |
| **Order detail** | Gig title, package (basic/standard/premium), quantity, **price**, seller identity, **requirements** (and optional uploaded brief), reference link, style notes, coupon if used; **timeline** (`delivered_at`, `completed_at`, `cancelled_at` when set). |
| **Pay / checkout** | From **pending** (unpaid) orders, continue to PayPal until payment succeeds or fails. |
| **While active** | Message seller (optionally scoped to `order_id`); monitor status until seller delivers. |
| **When delivered** | **Accept** delivery → order moves toward **completed**; or **Request revision** with `revision_note` → order returns to **active** for seller rework (within package `revisions` limit per product rules). |
| **Cancel** | Submit **cancellation** with `cancellation_reason` when allowed (e.g. **active** — policy-dependent); outcome ties to refund.|
| **After completed** | Open path to **review** (rating + comment); order is read-only for lifecycle except admin. |

#### Seller — order management

| Capability | Detail |
|------------|--------|
| **Order list** | See all orders where the user is **seller**; prioritize **active** work and **delivered** awaiting buyer action. |
| **Order detail** | Same commercial fields as buyer view but from fulfillment perspective: buyer requirements, files, links, deadlines implied by **delivery_days** / due expectations. |
| **While active** | **Submit delivery**: `delivery_file` (required when submitting) + optional `delivery_note` → status moves to **delivered**; each submission can append to **order_deliveries** history. |
| **Revisions** | When buyer sends back to **active**, seller sees **order_revisions** notes and must **re-deliver** within agreed limits (respect package **revisions** cap). |
| **Cancel** | Submit cancellation with `cancellation_reason` when role allows (**active** path); **`order_cancellations`** should record **`cancelled_by`** (buyer vs seller) for audit. |
| **Messaging** | Talk to buyer with optional `order_id` for context on that job. |
| **Earnings context** | After buyer acceptance / auto-complete, balances move toward **released** (net of platform fee) 

#### Shared UX expectations

- **Order detail** is the single place for status, payment flags, delivery downloads, and revision history.
- **Super admin** can still override status, payments, and timestamps.

### 4.6 Messaging

- **Messages** tie to `sender_id`, `receiver_id`, optional `order_id`, text body, optional attachment.
- Triggers for email/in-app notifications are configurable under **Notification settings**.

### 4.7 Reviews

- After **order completed**, buyer submits **Review**: `order_id`, rating 1–5, comment.
- Feeds seller reputation and search/filter by rating.

### 4.8 Subscriptions

- **Plans** (catalog): name, price, `duration_days`, `gig_limit`, JSON **features**, status. Typical commercial labels: **Free**, **Basic**, **Pro** — exact tiers are data-driven.
- **Subscription** row links `user_id` to `plan_id` with `starts_at`, `ends_at`, `status`.
- **Who subscribes:** **Sellers** (not buyers): subscription gates how many gigs they can publish and which features apply.
- **Purchase / renew:** seller picks a plan in-app; paid plans complete through the same payment approach as orders (e.g. PayPal) or admin-assigned trial; period rolls forward from `starts_at`/`ends_at`.
- Enforce **gig_limit** (and any feature flags in JSON) when creating or activating gigs.

### 4.9 User notification center & preferences

| Area | Behavior |
|------|-----------|
| **In-app inbox** | Rows from `notifications` (`type`, `data`, **`read_at`**); user can open and **mark read** / mark all read. |
| **Preferences** | Per-user toggles such as: `email_notifications`, `order_updates`, `message_alerts`, `review_alerts`, optional **Trello notifications (if connected)** |
| **Delivery** | Notifications can be delivered via **in-app, email, or Trello (if enabled)**; actual sending is gated by **super admin settings** |

### 4.10 Trello Notifications (System-level)

Trello integration is managed **globally by the super admin** and is not configurable by individual users.

#### Behavior

- When enabled by admin, system automatically creates **Trello cards** for selected events.
- Users do **not** connect or manage Trello accounts.
- All cards are created in the **admin-configured board and list**.

#### Supported Events

- Order placed
- Order delivered
- Order completed
- Order cancelled
- New message
- Withdrawal request
- New user registration

#### Notes

- Trello acts as an **internal operations / tracking tool**, not a user-facing notification channel.
- Works alongside **email** and **in-app notifications**.
- Users still control their own notification preferences (email/in-app), but **Trello is always system-driven**.

---

### 4.11 Seller payouts (withdrawals)

- After orders **complete** and payments move to **released** (per policy), the seller accumulates **withdrawable balance** (net of platform fee).
- Seller initiates a **withdrawal request** (amount, payout method details as product defines — e.g. PayPal email, bank reference).
- **Operations / super admin** confirms and pays out (manual or integrated); status transitions are implementation-specific but should be auditable.
- **Email** toggle *Withdrawal requested* can alert finance/admin.
- Failed or reversed payouts should leave a clear trail and adjust balance accordingly (implementation detail).

----------------------------------------------------------------------------------------------------------------------

## 5. Order model (status and permissions)

### 5.1 Order status progression

- **Pending** → **Active** (after payment captured) → **Delivered** (seller submission) → **Completed** (buyer acceptance or auto-release) **or** **Cancelled**.

### 5.2 Who can change what

| Transition | Who |
|------------|-----|
| pending → active | System (PayPal success) |
| active → delivered | Seller |
| delivered → completed | Buyer or system (auto_release_days) |
| delivered → active | Buyer (revision loop) |
| active → cancelled | Buyer or seller (with reason, policy-dependent) |
| payment pending → paid | System |
| paid → released | System (after completion / rules) |
| paid → refunded | System (cancellation / dispute policy) |

### 5.3 Cancellation and refunds (policy summary)

- **Before work starts**: full refund to buyer (target behavior).
- **After work started**: partial or negotiated refund (product decision; README encodes intent for disputes module later).

----------------------------------------------------------------------------------------------------------------------

## 6. Data model (entities)

High-level relational picture for engineering leads.

| Entity | Purpose |
|--------|---------|
| users | Accounts; profile fields; status. |
| roles, permissions | Spatie RBAC. |
| categories | Tree: parent / child via `parent_id`. |
| gigs | Seller offerings; link to category/subcategory. |
| gig_packages | Basic/standard/premium economics per gig. |
| gig_images | Gallery paths per gig. |
| orders | Buyer/seller/gig/package; requirements; pricing; lifecycle + payment flags. |
| order_deliveries | Files and notes per delivery. |
| order_revisions | Revision requests. |
| order_cancellations | Who cancelled, reason, audit. |
| messages | Conversation threads, optional order scope. |
| reviews | Post-completion ratings. |
| payments | PayPal-oriented fields and statuses. |
| plans, subscriptions | Monetization limits for sellers. |
| notifications | In-app notification records (`type`, `data`, `read_at`). |

**Key fields (reference)**  

- **orders**: `buyer_id`, `seller_id`, `gig_id`, `package_id`, requirements (+ optional file, links, coupon), `price`, `status`, `payment_status`, `escrow_held`, `delivered_at`, `completed_at`, `cancelled_at`.  
- **payments**: `order_id`, `user_id`, method (`paypal`), `amount`, `status`, `transaction_id`, `paypal_order_id`, `paypal_payer_id`.  
- **reviews**: `order_id`, `buyer_id`, `seller_id`, `gig_id`, `rating`, `comment` (one substantive review per completed order).  
- **order_cancellations**: `order_id`, **`cancelled_by`**, `cancellation_reason`, `created_at`.

----------------------------------------------------------------------------------------------------------------------

## 7. Technical architecture

### 7.1 Pattern

- **Monolithic Laravel** application: HTTP layer, domain logic, queues, events/listeners, notifications.
- **React SPA (or embedded pages)** built with **Vite** under `resources/js`: components, pages, layouts, hooks, context, routes.
- **Axios** for API calls; **React Router** for client routes; **Tailwind CSS** for styling.

### 7.2 Backend structure (typical)

```
app/
├── Models/
├── Http/Controllers|Middleware|Requests/
├── Services/
├── Events/Listeners/
└── Notifications/
resources/js/   # React
routes/web.php, routes/api.php
database/migrations, database/seeders
```

### 7.3 Cross-cutting concerns

- **Queues**: database or Redis-backed for mail, heavy tasks, and reliable processing after PayPal webhooks or callbacks.
- **Events & listeners**: domain events (order placed, delivered, completed, paid, refunded) drive notifications, audit, and future analytics without bloating controllers.
- **Scheduler (`schedule` + OS cron):** run queue workers, retry failed jobs, and **auto-complete** orders after **`auto_release_days`** from delivery when the buyer does not act.
- **Planned / advanced**: Laravel Echo + Pusher (or similar) for **real-time** chat and live notification badges.

----------------------------------------------------------------------------------------------------------------------

## 8. Setup (local)

### Backend

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env` (database, mail, queue, PayPal when testing).

```bash
php artisan migrate --seed
php artisan serve
```

### Frontend

```bash
npm install
npm run dev
```

----------------------------------------------------------------------------------------------------------------------

## 9. Deployment (orientation)

| Layer | Options |
|--------|---------|
| App | VPS, Laravel Forge, or cloud VM |
| Frontend assets | `npm run build`; Vite emits production bundles consumed by Laravel |
| Database | Managed MySQL or equivalent |
| Secrets | PayPal keys, SMTP, app key — never committed |

----------------------------------------------------------------------------------------------------------------------

## 10. Roadmap and open items

**Documented TODOs**

- Real-time chat (WebSockets / Echo / Pusher).
- Advanced search and filtering (beyond baseline keyword/category/price/delivery/rating/sort).
- **Gig moderation / admin approval** before gigs go live (optional policy).
- Dispute resolution module.
- Invoice generation.
- Admin dashboard analytics.
- General UI/UX polish.

**Future ideas**

- Mobile app (e.g. React Native).
- Language translation.
- AI recommendations.
- Performance hardening (caching, query tuning).

**Project status**  
Active development — treat feature list above as the contract with stakeholders until tickets close each item.

----------------------------------------------------------------------------------------------------------------------

## 11. Contributing and license

Contributions welcome via fork and PR.  
Licensed under the **MIT License** (adjust in repo if different).

----------------------------------------------------------------------------------------------------------------------

## Appendix A — Form field checklists (quick reference)

**Register:** name, email, password, password_confirmation, role.  
**Login:** email, password.  
**Forgot / reset:** email; reset adds token, password, password_confirmation.  
**Profile:** name, email, bio, phone, profile_picture, skills, location, website.  
**Gig (seller):** title, description, category_id, subcategory_id, images, tags, status + package rows.  
**Order (buyer):** package_id, quantity, requirements (+ optional file, links, style, coupon).  
**Payment:** order_id, PayPal flow fields, billing_name, billing_email.  
**Order details — buyer:** accept/revision/cancel actions and notes.  
**Order details — seller:** delivery file, delivery note, cancel reason.  
**Messages:** receiver_id, message, optional attachment.  
**Review:** order_id, rating, comment.  
**User notification prefs:** email_notifications, order_updates, message_alerts, review_alerts.

----------------------------------------------------------------------------------------------------------------------

*This README is ordered for walkthrough: **purpose → roles → super admin (control plane) → buyer/seller journeys (orders, subscriptions, notifications, payouts) → order rules → data → tech → ops → roadmap**.*
