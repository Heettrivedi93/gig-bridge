# 💼 Freelance Marketplace (Mini Fiverr Clone)

## 🚀 Overview
This is a full-stack freelance marketplace platform similar to Fiverr where users can buy and sell services (gigs). The project is built using **Laravel 13** with a **React frontend integrated via Vite**.

The application includes real-world features such as:
- Role-based access control
- Payments & subscriptions
- Messaging system
- Notifications
- Scalable architecture design

---

## 🧱 Tech Stack

### 🔧 Backend
- Laravel 13
- Laravel built-in authentication
- Spatie Laravel Permission (RBAC)
- MySQL Database
- Queue System (Database / Redis)
- Events & Listeners

### 🎨 Frontend
- React (with Vite)
- Axios
- React Router
- Tailwind CSS

---

## 🏗️ Architecture

- Monolithic Laravel application with integrated React frontend
- React components rendered using Vite
- Backend handles business logic and database operations
- Frontend handles UI and user interaction

---

## 👥 User Roles

### 🛡️ Super Admin
- Full system access
- Manages users, gigs, categories, subscriptions, and platform settings

### 🧑‍💼 Seller
- Creates and manages gigs
- Receives and fulfills orders
- Communicates with buyers

### 🛒 Buyer
- Browses gigs
- Places orders
- Communicates with sellers
- Leaves reviews

---

## 🔐 Role Assignment Logic

- Users can select their role (**Buyer or Seller**) during registration
- Role is assigned based on user selection
- Super Admin is **not publicly accessible**
- Created manually via Seeder or Artisan command
- Admin can modify roles anytime

---

## ✨ Core Features

- Authentication system (Laravel built-in)
- Role-Based Access Control (RBAC)
- Gig Management (CRUD with images, pricing, delivery time)
- Category & Subcategory system (hierarchical)
- Order lifecycle:
  - Pending → Active → Completed → Cancelled
- Messaging system (Buyer ↔ Seller chat)
- Reviews & Ratings
- Notifications (Email + In-app)
- Payment integration (Stripe / Razorpay)
- Subscription plans (Free / Basic / Pro)
- Role-based dashboards

---

## 🗃️ Database Entities

- Users  
- Roles & Permissions  
- Gigs  
- Categories (Parent → Child)  
- Orders  
- Messages  
- Reviews  
- Payments  
- Plans  
- Subscriptions  

---

## 🔄 Key Functional Flows

- User registers and selects role
- Admin manages platform
- Sellers create gigs
- Buyers purchase gigs
- Orders move through lifecycle stages
- Payments are securely processed
- Messaging enables communication
- Reviews after order completion
- Subscriptions control feature access

---

## ⚡ Advanced Features

- Real-time chat (WebSockets / Laravel Echo / Pusher)
- Advanced search & filtering
- Admin approval system
- Subscription-based restrictions
- Scheduled tasks (cron jobs)
- Event-driven architecture

---

## 📁 Folder Structure

### 📦 Laravel + React (Monolithic)


app/
├── Models/
├── Http/
│ ├── Controllers/
│ ├── Middleware/
│ └── Requests/
├── Services/
├── Events/
├── Listeners/
└── Notifications/

resources/
└── js/
├── components/
├── pages/
├── layouts/
├── hooks/
├── context/
└── routes/

routes/
├── web.php
└── api.php

database/
├── migrations/
└── seeders/


---

## ⚙️ Setup Instructions

### 🔹 Backend

```bash
composer install
cp .env.example .env
php artisan key:generate

Configure .env file (DB, mail, queue)

php artisan migrate --seed
php artisan serve
🔹 Frontend
npm install
npm run dev
🚀 Deployment
Backend: VPS / Laravel Forge / AWS
Frontend: Built via Vite for production
📌 TODO
 Real-time chat
 Advanced search filters
 Dispute system
 Invoice generation
 Admin dashboard analytics
 UI/UX improvements
🔮 Future Improvements
Mobile app (React Native)
AI-based recommendations
Multi-language support
Performance optimization
📊 Status

🚧 Project is under active development

🧠 Notes

This project demonstrates:

Full-stack Laravel + React
SaaS-level architecture
RBAC system
Payments & subscriptions
Scalable design patterns
🤝 Contribution

Contributions are welcome! Feel free to fork and improve.

📜 License

This project is open-source under the MIT License.


