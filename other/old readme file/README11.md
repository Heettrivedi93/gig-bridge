<div align="center">

<br/>

```
███████╗██████╗ ███████╗███████╗██╗      █████╗ ███╗   ██╗ ██████╗███████╗██████╗
██╔════╝██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗████╗  ██║██╔════╝██╔════╝██╔══██╗
█████╗  ██████╔╝█████╗  █████╗  ██║     ███████║██╔██╗ ██║██║     █████╗  ██████╔╝
██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║     ██╔══██║██║╚██╗██║██║     ██╔══╝  ██╔══██╗
██║     ██║  ██║███████╗███████╗███████╗██║  ██║██║ ╚████║╚██████╗███████╗██║  ██║
╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝
```

### **MARKETPLACE**
#### *A Production-Grade Freelance Services Platform*

<br/>

[![Laravel](https://img.shields.io/badge/Laravel-13.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<br/>

[![Status](https://img.shields.io/badge/Status-Active%20Development-yellow?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#️-architecture)
- [User Roles & Permissions](#-user-roles--permissions)
- [Feature Flows](#-feature-flows)
  - [Authentication Flow](#1-authentication-flow)
  - [Gig Management Flow](#2-gig-management-flow)
  - [Order Lifecycle Flow](#3-order-lifecycle-flow)
  - [Payment Flow](#4-payment-flow--escrow)
  - [Messaging Flow](#5-messaging-flow)
  - [Subscription Flow](#6-subscription-flow)
- [Database Schema](#️-database-schema)
- [API & Pages Reference](#-api--pages-reference)
- [Admin Control Panel](#️-admin-control-panel)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [Roadmap](#-roadmap)

---

## 🌐 Overview

**Freelancer Marketplace** is a full-stack, production-ready freelance services platform — inspired by Fiverr — built for real-world deployment. It enables **Sellers** to offer services (gigs) and **Buyers** to discover, purchase, and review those services, all managed under a centralized **Super Admin** panel.

The platform is designed with a **SaaS-level architecture**, featuring escrow-based payments, subscription plans, role-based access control, and an event-driven notification system.

> **Presentation Note:** This project demonstrates enterprise-grade patterns: RBAC, payment escrow, event-driven architecture, and subscription gating — all within a unified Laravel + React monolith.

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Laravel 13 | Core application framework |
| **Auth** | Laravel Built-in Auth | Session & token-based authentication |
| **RBAC** | Spatie Laravel Permission | Role & permission management |
| **Frontend** | React 18 + Vite | UI components & client routing |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **HTTP Client** | Axios | API communication |
| **Database** | MySQL 8 | Primary relational data store |
| **Queue** | Database / Redis | Background job processing |
| **Events** | Laravel Events & Listeners | Decoupled system communication |
| **Payments** | PayPal SDK | Order payments & refunds |
| **Realtime** | Laravel Echo + Pusher | WebSocket-based live messaging |
| **Scheduling** | Laravel Cron / Task Scheduler | Auto-release, subscription expiry |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT BROWSER                        │
│              React 18  ·  React Router                  │
│              Tailwind CSS  ·  Axios                     │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP / REST API
┌────────────────────────▼────────────────────────────────┐
│                 LARAVEL 13 BACKEND                      │
│                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│   │  Routes  │  │   Auth   │  │  Spatie RBAC         │ │
│   │ web.php  │  │ Middleware│  │  Roles·Permissions   │ │
│   │ api.php  │  └──────────┘  └──────────────────────┘ │
│   └──────────┘                                          │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │              SERVICE LAYER                       │  │
│   │  OrderService · PaymentService · GigService      │  │
│   └──────────────────────────────────────────────────┘  │
│                                                         │
│   ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│   │  Events &  │  │    Queue     │  │  Notifications │  │
│   │  Listeners │  │  (Jobs)      │  │  Email + Push  │  │
│   └────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    DATA LAYER                           │
│       MySQL 8  ·  Redis (Queue/Cache)                   │
└─────────────────────────────────────────────────────────┘
```

- **Monolithic** Laravel application with an **integrated React frontend** rendered via Vite
- Backend handles all **business logic, validation, and database operations**
- Frontend handles **UI rendering, routing, and user interactions**
- Decoupled internal communication via **Events & Listeners**
- **Queue-based** processing for emails, notifications, and payment hooks

---

## 👥 User Roles & Permissions

```
┌─────────────────────────────────────────────────────────┐
│                    PLATFORM ROLES                       │
├──────────────────┬────────────────────┬─────────────────┤
│   SUPER ADMIN    │      SELLER        │      BUYER      │
├──────────────────┼────────────────────┼─────────────────┤
│ Full system      │ Create & manage    │ Browse gigs     │
│ access           │ gigs               │                 │
│                  │                    │                 │
│ Manage users,    │ Accept & fulfill   │ Place orders    │
│ roles, plans     │ orders             │                 │
│                  │                    │                 │
│ Configure        │ Communicate with   │ Communicate     │
│ platform         │ buyers             │ with sellers    │
│ settings         │                    │                 │
│                  │ View earnings &    │ Leave reviews   │
│ Monitor orders   │ withdraw funds     │ & ratings       │
│ & payments       │                    │                 │
│                  │ Subscribe to plans │ Track orders    │
│ NOT publicly     │                    │                 │
│ accessible       │ Role selected      │ Role selected   │
│                  │ at registration    │ at registration │
│ Created via      │                    │                 │
│ Seeder/Artisan   │                    │                 │
└──────────────────┴────────────────────┴─────────────────┘
```

> Admin can **modify any user's role at any time** from the admin panel.

---

## 🔄 Feature Flows

### 1. Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                  AUTHENTICATION                         │
└─────────────────────────────────────────────────────────┘

  REGISTER ──────────────────────────────────────────────▶
  │
  ├─ User fills: name, email, password, role (buyer/seller)
  ├─ Role is assigned via Spatie Permission
  ├─ Email verification sent (if enabled)
  └─ Redirected to role-based dashboard

  LOGIN ─────────────────────────────────────────────────▶
  │
  ├─ Credentials validated
  ├─ Session / token created
  └─ Redirected to dashboard

  FORGOT PASSWORD ───────────────────────────────────────▶
  │
  ├─ Reset link sent to registered email
  ├─ User clicks link → password reset form
  └─ Password updated → redirect to login
```

---

### 2. Gig Management Flow

```
┌─────────────────────────────────────────────────────────┐
│              GIG MANAGEMENT (SELLER)                    │
└─────────────────────────────────────────────────────────┘

  CREATE GIG ────────────────────────────────────────────▶
  │
  ├─ [1] Fill gig details
  │       title, description, category, subcategory
  │
  ├─ [2] Upload gig images (multiple)
  │
  ├─ [3] Define packages
  │       ┌─────────┬──────────────┬──────────────────┐
  │       │ Basic   │ Standard     │ Premium          │
  │       │ Price   │ Price        │ Price            │
  │       │ Days    │ Days         │ Days             │
  │       │ Revisions│ Revisions   │ Revisions        │
  │       └─────────┴──────────────┴──────────────────┘
  │
  ├─ [4] Submit for review (if admin approval enabled)
  │        OR
  │       Auto-publish (if approval disabled)
  │
  └─ [5] Gig appears in search / marketplace

  SUBSCRIPTION CHECK ────────────────────────────────────▶
  │
  └─ Active plan? → Check gig_limit
       ├─ Within limit → Allow gig creation
       └─ Limit reached → Prompt to upgrade plan
```

---

### 3. Order Lifecycle Flow

```
┌─────────────────────────────────────────────────────────┐
│                ORDER LIFECYCLE                          │
└─────────────────────────────────────────────────────────┘

  BUYER PLACES ORDER ────────────────────────────────────▶
  │
  ├─ Selects gig + package (basic/standard/premium)
  ├─ Fills requirements, uploads reference files
  └─ Proceeds to payment

                    ┌──────────┐
                    │ PENDING  │ ← Order created, awaiting payment
                    └────┬─────┘
                         │ Payment captured (PayPal)
                    ┌────▼─────┐
                    │  ACTIVE  │ ← Seller notified to begin work
                    └────┬─────┘
                         │ Seller submits delivery
                    ┌────▼──────────┐
                    │  DELIVERED    │ ← Buyer reviews delivery
                    └────┬──────────┘
            ┌────────────┴────────────────┐
            │                             │
    ┌───────▼──────┐             ┌────────▼──────┐
    │  COMPLETED   │             │ REVISION REQ  │
    │  (Accepted / │             │ (Back to      │
    │   Auto)      │             │  Active)      │
    └───────┬──────┘             └───────────────┘
            │
      Funds released to seller

  CANCELLATION PATH ──────────────────────────────────────▶
  │
  ├─ Before work starts → Full refund to buyer
  └─ After work started → Dispute resolution → Partial refund

  STATUS CHANGE PERMISSIONS:
  ┌────────────────────────────────────────┬────────────────────┐
  │ Transition                             │ Actor              │
  ├────────────────────────────────────────┼────────────────────┤
  │ pending → active                       │ System (auto)      │
  │ active → delivered                     │ Seller             │
  │ delivered → completed                  │ Buyer / System     │
  │ delivered → active (revision)          │ Buyer              │
  │ active → cancelled                     │ Buyer or Seller    │
  │ Any status                             │ Super Admin        │
  └────────────────────────────────────────┴────────────────────┘
```

---

### 4. Payment Flow & Escrow

```
┌─────────────────────────────────────────────────────────┐
│              PAYMENT FLOW (PayPal Escrow)               │
└─────────────────────────────────────────────────────────┘

  [1] Buyer places order
        │
  [2] Redirect to PayPal ──▶ Buyer authorizes payment
        │
  [3] PayPal captures payment
        │   Amount held by platform (escrow)
        │   escrow_held = true
        │
  [4] Order status → ACTIVE
        │   Seller receives notification
        │
  [5] Seller delivers work
        │
  [6] Buyer accepts delivery
        │
  [7] Order COMPLETED
        │   Platform deducts service fee (e.g. 10–20%)
        │   Remaining credited to seller
        │   escrow_held = false
        │
  [8] Seller withdraws earnings

  PLATFORM FEE EXAMPLE:
  ┌────────────────────────────────────────────────────┐
  │  Buyer pays      $100.00                          │
  │  Platform fee    $10.00  (10%)                    │
  │  Seller receives $90.00                           │
  └────────────────────────────────────────────────────┘

  PAYMENT STATES:
  ┌──────────────┬────────────────────────────────────────┐
  │ State        │ Description                            │
  ├──────────────┼────────────────────────────────────────┤
  │ pending      │ Initiated, not yet confirmed           │
  │ paid         │ Successfully captured by PayPal        │
  │ failed       │ Payment attempt failed                 │
  │ refunded     │ Returned to buyer on cancellation      │
  │ released     │ Transferred to seller after completion │
  └──────────────┴────────────────────────────────────────┘
```

---

### 5. Messaging Flow

```
┌─────────────────────────────────────────────────────────┐
│                   MESSAGING SYSTEM                      │
└─────────────────────────────────────────────────────────┘

  BUYER ─────────────────────────────────────────▶ SELLER
  │                                                     │
  ├─ Send message (text + optional attachment)          │
  ├─ Message linked to order (order_id)                 │
  ├─ Real-time delivery via WebSocket (Echo + Pusher)   │
  ├─ Email notification triggered on new message        │
  └─ In-app notification shown in notification center   │
                                                        │
  SELLER ────────────────────────────────────────▶ BUYER
  (same flow in reverse)

  Admin can READ all conversations for dispute resolution.
```

---

### 6. Subscription Flow

```
┌─────────────────────────────────────────────────────────┐
│               SUBSCRIPTION MANAGEMENT                   │
└─────────────────────────────────────────────────────────┘

  PLANS:
  ┌────────┬────────────┬──────────────────────────────────┐
  │ Plan   │ Price      │ Features                         │
  ├────────┼────────────┼──────────────────────────────────┤
  │ Free   │ $0/month   │ Limited gigs, basic features     │
  │ Basic  │ $X/month   │ More gigs, priority listing      │
  │ Pro    │ $XX/month  │ Unlimited gigs, all features     │
  └────────┴────────────┴──────────────────────────────────┘

  SUBSCRIPTION FLOW ──────────────────────────────────────▶
  │
  ├─ Seller selects plan
  ├─ Payment processed (PayPal)
  ├─ subscription.starts_at = now()
  ├─ subscription.ends_at = now() + plan.duration_days
  ├─ Gig limit enforced throughout active period
  └─ Cron job checks expiry daily → downgrades if expired
```

---

## 🗃️ Database Schema

### Entity Relationship Overview

```
users ──────────┬──── gigs ──────────┬──── gig_packages
                │                    └──── gig_images
                │
                ├──── orders ─────────┬──── order_deliveries
                │         │           ├──── order_revisions
                │         │           └──── order_cancellations
                │         │
                │         ├──── payments
                │         └──── reviews
                │
                ├──── messages
                ├──── notifications
                └──── subscriptions ──── plans

categories ─────── subcategories (self-referencing: parent_id)
roles & permissions (Spatie)
```

### Core Tables

| Table | Key Fields |
|---|---|
| `users` | id, name, email, password, bio, phone, profile_picture, skills, location, website, status |
| `gigs` | id, user_id, category_id, subcategory_id, title, description, status |
| `gig_packages` | id, gig_id, name (basic/standard/premium), price, delivery_days, revisions |
| `gig_images` | id, gig_id, image_path |
| `categories` | id, parent_id, name, slug, status |
| `orders` | id, buyer_id, seller_id, gig_id, package_id, price, status, payment_status, escrow_held, delivered_at, completed_at, cancelled_at |
| `order_deliveries` | id, order_id, delivery_file, delivery_note, delivered_at |
| `order_revisions` | id, order_id, revision_note, created_at |
| `order_cancellations` | id, order_id, cancelled_by, cancellation_reason, created_at |
| `payments` | id, order_id, user_id, method, amount, status, transaction_id, paypal_order_id, paypal_payer_id |
| `messages` | id, sender_id, receiver_id, order_id, message, attachment |
| `reviews` | id, order_id, buyer_id, seller_id, gig_id, rating, comment |
| `plans` | id, name, price, duration_days, gig_limit, features (JSON), status |
| `subscriptions` | id, user_id, plan_id, starts_at, ends_at, status |
| `notifications` | id, user_id, type, data (JSON), read_at |

---

## 📄 API & Pages Reference

### Auth Pages

| Page | Fields | Notes |
|---|---|---|
| **Register** | name, email, password, password_confirmation, role (buyer/seller) | Role assigned via Spatie |
| **Login** | email, password | Session-based |
| **Forgot Password** | email | Sends reset link |
| **Reset Password** | token (hidden), email, password, password_confirmation | Token from email |

### User Pages

| Page | Key Fields | Role |
|---|---|---|
| **Edit Profile** | name, email, bio, phone, profile_picture, skills (tags), location, website | All |
| **Create / Edit Gig** | title, description, category, subcategory, images, packages (basic/standard/premium), status | Seller |
| **Place Order** | gig_id, package_id, quantity, requirements, requirements_file, reference_link, coupon_code | Buyer |
| **Payment** | order_id, paypal_order_id, paypal_payer_id, billing_name, billing_email | Buyer |
| **Order Details** | delivery actions, revision notes, cancellation reasons, status indicators | Buyer + Seller |
| **Search & Filters** | keyword, category, min/max price, delivery_days, rating, sort_by | Public |
| **Messages** | receiver_id, message, attachment | Buyer + Seller |
| **Write Review** | order_id, rating (1–5), comment | Buyer (post-completion) |
| **Notification Preferences** | email_notifications, order_updates, message_alerts, review_alerts | All |

---

## 🛡️ Admin Control Panel

### Settings Managed by Super Admin

| Settings Module | Purpose |
|---|---|
| **Brand Settings** | site_name, logo, favicon, tagline, colors, footer_text, contact info, social links |
| **Email / SMTP** | mail_driver, host, port, username, password, encryption, from_address |
| **Payment Settings** | PayPal mode (sandbox/live), client_id, client_secret, currency, platform_fee %, auto_release_days, refund_policy |
| **Notification Settings** | Toggle email & in-app notifications per trigger event (order placed, completed, message, review, payment, etc.) |

### Admin Managed Entities

| Entity | Operations |
|---|---|
| **Users** | Create, edit, ban, change role |
| **Categories** | Create parent categories, attach subcategories |
| **Subscription Plans** | Define name, price, duration, gig_limit, features |
| **Orders** | Override status, control payment state, manage escrow, view all activity |

### Admin Order Actions

| Action | Description |
|---|---|
| `update_status` | Manually change order status |
| `control_payment` | Update payment state (paid → released / refunded) |
| `escrow_control` | Hold or release funds manually |
| `adjust_timestamps` | Update delivered_at, completed_at, cancelled_at |
| `monitor_order` | View all messages, uploaded files, and activity log |

---

## 📁 Project Structure

```
freelancer-marketplace/
│
├── app/
│   ├── Models/                    # Eloquent models
│   ├── Http/
│   │   ├── Controllers/           # Route controllers
│   │   ├── Middleware/            # Auth, RBAC, etc.
│   │   └── Requests/              # Form request validation
│   ├── Services/                  # Business logic layer
│   │   ├── OrderService.php
│   │   ├── PaymentService.php
│   │   └── GigService.php
│   ├── Events/                    # Domain events
│   ├── Listeners/                 # Event handlers
│   └── Notifications/             # Email + in-app notification classes
│
├── resources/
│   └── js/
│       ├── components/            # Reusable React components
│       ├── pages/                 # Page-level components
│       │   ├── auth/
│       │   ├── buyer/
│       │   ├── seller/
│       │   └── admin/
│       ├── layouts/               # Shared layout wrappers
│       ├── hooks/                 # Custom React hooks
│       ├── context/               # React context providers
│       └── routes/                # React Router config
│
├── routes/
│   ├── web.php                    # Web routes (React SPA)
│   └── api.php                    # API routes
│
├── database/
│   ├── migrations/                # Database schema
│   └── seeders/                   # Initial data + super admin
│
├── config/
│   ├── paypal.php
│   └── permission.php
│
├── .env.example
├── vite.config.js
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites

- PHP >= 8.2
- Composer
- Node.js >= 18.x & npm
- MySQL 8.x
- Redis *(optional, for queue)*

### Step 1 — Clone & Install

```bash
git clone https://github.com/your-org/freelancer-marketplace.git
cd freelancer-marketplace
```

### Step 2 — Backend Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configure your `.env` file:

```env
# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=freelancer_marketplace
DB_USERNAME=root
DB_PASSWORD=

# Queue
QUEUE_CONNECTION=database        # or redis

# PayPal
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
PAYPAL_CURRENCY=USD

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=
MAIL_PASSWORD=
```

Run migrations and seed initial data:

```bash
php artisan migrate --seed
php artisan serve
```

> The seeder creates the **Super Admin** account automatically.
> Default credentials are defined in `database/seeders/AdminSeeder.php`

### Step 3 — Frontend Setup

```bash
npm install
npm run dev        # development
npm run build      # production build
```

### Step 4 — Queue Worker *(for emails & notifications)*

```bash
php artisan queue:work
```

### Step 5 — Scheduler *(for auto-release & subscription expiry)*

```bash
# Add to crontab
* * * * * php /path-to-your-project/artisan schedule:run >> /dev/null 2>&1
```

---

## 🗺️ Roadmap

### ✅ Completed (Core)
- [x] Authentication system (register, login, forgot/reset password)
- [x] Role-Based Access Control (RBAC) via Spatie
- [x] Gig CRUD with images, packages, categories
- [x] Order lifecycle management (pending → completed)
- [x] PayPal payment integration with escrow logic
- [x] Buyer ↔ Seller messaging system
- [x] Reviews & ratings (post-completion)
- [x] Email + in-app notifications
- [x] Subscription plans (Free / Basic / Pro)
- [x] Super Admin panel (users, categories, plans, settings)

### 🔄 In Progress
- [ ] Real-time chat (WebSockets via Laravel Echo + Pusher)
- [ ] Advanced search & filter engine
- [ ] Admin dashboard with analytics charts

### 📌 Upcoming
- [ ] Dispute resolution system
- [ ] Invoice PDF generation
- [ ] Coupon & discount code engine
- [ ] Seller withdrawal management

### 🔮 Future Vision
- [ ] Mobile app (React Native)
- [ ] AI-based gig recommendations
- [ ] Multi-language & multi-currency support
- [ ] Microservices migration (if scale requires)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with ❤️ using Laravel + React**

*Designed for scale · Built for production · Ready to ship*

</div>
