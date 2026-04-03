# 🛒 Freelance Marketplace — Mini Fiverr Clone

A full-stack freelance marketplace platform where users can buy and sell services (gigs). Built with **Laravel 13** and **React** (via Vite), featuring role-based access control, payments, subscriptions, real-time messaging, and more.

> 🚧 Project is under active development.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13, MySQL, Queues (DB/Redis) |
| Frontend | React, Tailwind CSS, React Router, Axios |
| Auth | Laravel Built-in Authentication |
| RBAC | Spatie Laravel Permission |
| Payments | Stripe / Razorpay |
| Build Tool | Vite |

---

## Architecture

Monolithic Laravel application with an integrated React frontend served via Vite. The backend handles all business logic and database operations while React manages the UI layer.

---

## User Roles

| Role | Description |
|---|---|
| **Super Admin** | Full platform access — manages users, gigs, categories, subscriptions, and settings |
| **Seller** | Creates and manages gigs, fulfills orders, communicates with buyers |
| **Buyer** | Browses gigs, places orders, communicates with sellers, leaves reviews |

- Buyers and Sellers self-select their role during registration
- Super Admin is created manually via seeder or Artisan command
- Admin can modify any user's role and permissions

---

## Core Features

- 🔐 Authentication & Role-Based Access Control (RBAC)
- 📦 Gig management — CRUD with images, pricing, and delivery time
- 🗂️ Hierarchical category & subcategory system
- 🔄 Order lifecycle — `pending → active → completed → cancelled`
- 💬 Buyer–Seller messaging system
- ⭐ Reviews and ratings (post-order)
- 🔔 Notifications — email + database
- 💳 Payment integration (Stripe / Razorpay)
- 📋 Subscription plans — Free, Basic, Pro (controls gig limits & features)
- 📊 Role-based dashboards — Admin, Seller, Buyer

---

## Key Flows

1. User registers and selects role (Buyer or Seller)
2. Sellers create gigs under categories
3. Buyers browse, filter, and purchase gigs
4. Orders progress through lifecycle states
5. Payments are processed and verified securely
6. Buyer and Seller communicate via messaging
7. Buyer submits a review after order completion
8. Subscription plan enforces seller feature limits

---

## Folder Structure

```
├── app/
│   ├── Models/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Services/
│   ├── Events/
│   ├── Listeners/
│   └── Notifications/
│
├── resources/
│   └── js/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── hooks/
│       ├── context/
│       └── routes/
│
├── routes/
│   ├── web.php
│   └── api.php
│
└── database/
    ├── migrations/
    └── seeders/
```

---

## Getting Started

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd <project-folder>

# 2. Install PHP dependencies
composer install

# 3. Configure environment
cp .env.example .env
php artisan key:generate
# Edit .env — set DB credentials, Stripe/Razorpay keys, mail config

# 4. Run migrations and seeders
php artisan migrate --seed

# 5. Install frontend dependencies
npm install

# 6. Start development servers
npm run dev          # Vite dev server
php artisan serve    # Laravel dev server
```

---

## Database Entities

`Users` · `Roles & Permissions` · `Gigs` · `Categories` · `Orders` · `Messages` · `Reviews` · `Payments` · `Plans` · `Subscriptions`

---

## Deployment

- Laravel backend deployable on **VPS**, **Laravel Forge**, or **AWS**
- Frontend compiled for production via `npm run build`
- Configure queue worker: `php artisan queue:work`
- Configure scheduler in crontab for subscription expiration tasks

---

## Advanced Features

- [ ] Real-time chat (WebSockets / Laravel Echo)
- [ ] Advanced search & filtering
- [ ] Admin approval system
- [ ] Subscription-based feature gating
- [ ] Scheduled tasks (subscription expiration)
- [ ] Event-driven architecture

---

## Roadmap

- [ ] Dispute resolution system
- [ ] Invoice generation
- [ ] Admin analytics dashboard
- [ ] Mobile app (React Native)
- [ ] AI-based gig recommendations
- [ ] Multi-language support

---

## License

This project is for educational and portfolio purposes, demonstrating full-stack development with Laravel and React — covering RBAC, payments, subscriptions, and scalable architecture.
