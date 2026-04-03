<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'price' => 0,
                'duration_days' => 30,
                'gig_limit' => 3,
                'features' => ['Basic listing visibility'],
                'status' => 'active',
            ],
            [
                'name' => 'Basic',
                'price' => 9.99,
                'duration_days' => 30,
                'gig_limit' => 15,
                'features' => ['Priority listing', 'Standard seller support'],
                'status' => 'active',
            ],
            [
                'name' => 'Pro',
                'price' => 29.99,
                'duration_days' => 30,
                'gig_limit' => 50,
                'features' => ['Priority listing', 'Featured profile badge', 'Premium seller support'],
                'status' => 'active',
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['name' => $plan['name']], $plan);
        }
    }
}
