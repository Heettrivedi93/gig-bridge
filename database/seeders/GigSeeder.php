<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Gig;
use App\Models\Plan;
use App\Models\User;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;

class GigSeeder extends Seeder
{
    private array $verbs = [
        'design', 'build', 'create', 'develop', 'write', 'deliver',
        'set up', 'optimize', 'fix', 'launch', 'manage', 'produce',
    ];

    private array $subjectSuffixes = [
        'for your business',
        'for your brand',
        'for your project',
        'for your startup',
        'tailored to your needs',
        'that drives real results',
        'to grow your audience',
        'to boost your online presence',
    ];

    public function run(): void
    {
        $faker = Faker::create('en_US');

        $sellers = User::query()
            ->role('seller')
            ->orderBy('id')
            ->get();

        if ($sellers->isEmpty()) {
            $this->command?->warn('GigSeeder skipped: no existing sellers found.');

            return;
        }

        $subcategories = Category::query()
            ->whereNotNull('parent_id')
            ->where('status', 'active')
            ->with('parent')
            ->get()
            ->filter(fn ($sub) => $sub->parent !== null)
            ->values();

        if ($subcategories->isEmpty()) {
            $this->command?->warn('GigSeeder skipped: no subcategories found. Run CategorySeeder first.');

            return;
        }

        foreach ($sellers as $seller) {
            $gigLimit = $this->resolveGigLimitForSeller($seller);

            for ($i = 0; $i < $gigLimit; $i++) {
                $sub = $subcategories->random();
                $this->seedGig($faker, $seller, $sub->parent, $sub);
            }

            $this->command?->info(sprintf(
                'Seeded %d gigs for seller %s (limit: %d).',
                $gigLimit,
                $seller->email,
                $gigLimit,
            ));
        }
    }

    private function resolveGigLimitForSeller(User $seller): int
    {
        $activeSubscription = $seller->activeSubscription();

        if ($activeSubscription?->plan?->gig_limit) {
            return (int) $activeSubscription->plan->gig_limit;
        }

        $fallbackPlan = Plan::query()
            ->where('status', 'active')
            ->orderBy('price')
            ->orderBy('id')
            ->first();

        return max(1, (int) ($fallbackPlan?->gig_limit ?? 3));
    }

    private function buildDescription(\Faker\Generator $faker, string $subcategoryName, string $categoryName): string
    {
        $openers = [
            "I provide professional {sub} services as part of {cat}.",
            "Looking for expert {sub} help? You are in the right place.",
            "I specialize in {sub} within the {cat} space.",
            "Get high-quality {sub} delivered on time, every time.",
            "Need reliable {sub} for your next project? I have got you covered.",
        ];

        $middles = [
            "Every project is handled with attention to detail and a commitment to quality.",
            "I bring a results-driven approach to every deliverable I produce.",
            "My process is clear, collaborative, and focused on your goals.",
            "I work closely with clients to ensure the final output exceeds expectations.",
            "You will receive regular updates and open communication throughout.",
        ];

        $closers = [
            "Let's work together to bring your vision to life.",
            "Order now and get started with a fast turnaround.",
            "Reach out with your requirements and I will take it from there.",
            "Your satisfaction is guaranteed — revisions included.",
            "I look forward to delivering outstanding results for your business.",
        ];

        $opener = str_replace(
            ['{sub}', '{cat}'],
            [strtolower($subcategoryName), strtolower($categoryName)],
            $faker->randomElement($openers)
        );

        return $opener . ' '
            . $faker->randomElement($middles) . ' '
            . $faker->randomElement($closers);
    }

    private function buildTags(string $subcategoryName, string $categoryName): array
    {
        $words = array_merge(
            explode(' ', strtolower($subcategoryName)),
            explode(' ', strtolower($categoryName)),
        );

        return array_values(array_unique(
            array_filter(
                array_map(fn ($w) => preg_replace('/[^a-z0-9\-]/', '', str_replace(' ', '-', $w)), $words),
                fn ($w) => strlen($w) > 2
            )
        ));
    }

    private function buildPackageDescription(\Faker\Generator $faker, string $tier, string $subcategoryName): string
    {
        $scopes = [
            'basic'    => ['an entry-level', 'a starter', 'a foundational'],
            'standard' => ['a professional', 'a well-rounded', 'a solid'],
            'premium'  => ['a comprehensive', 'a fully-featured', 'an advanced'],
        ];

        $outcomes = [
            'designed to meet your core needs.',
            'built to deliver real value for your business.',
            'crafted with quality and attention to detail.',
            'tailored to help you achieve your goals.',
            'focused on results and client satisfaction.',
        ];

        $scope = $faker->randomElement($scopes[$tier]);

        return ucfirst($scope) . ' ' . strtolower($subcategoryName) . ' package ' . $faker->randomElement($outcomes);
    }

    private function seedGig(
        \Faker\Generator $faker,
        User $seller,
        Category $category,
        Category $subcategory,
    ): void {
        $suffix = $faker->randomElement($this->subjectSuffixes);
        $subject = strtolower($subcategory->name) . ' ' . $suffix;
        $title   = 'I will ' . $faker->randomElement($this->verbs) . ' ' . $subject;

        $gig = Gig::query()->updateOrCreate(
            ['user_id' => $seller->id, 'title' => $title],
            [
                'category_id'      => $category->id,
                'subcategory_id'   => $subcategory->id,
                'description'      => $this->buildDescription($faker, $subcategory->name, $category->name),
                'tags'             => $this->buildTags($subcategory->name, $category->name),
                'status'           => 'active',
                'approval_status'  => 'approved',
                'rejection_reason' => null,
                'approved_at'      => now(),
                'rejected_at'      => null,
            ]
        );

        $tiers = [
            'basic'    => [25,  50,  7, 1],
            'standard' => [75,  150, 5, 2],
            'premium'  => [200, 500, 3, 3],
        ];

        foreach ($tiers as $tier => [$minPrice, $maxPrice, $delivery, $revisions]) {
            $gig->packages()->updateOrCreate(
                ['tier' => $tier],
                [
                    'title'          => ucfirst($tier),
                    'description'    => $this->buildPackageDescription($faker, $tier, $subcategory->name),
                    'price'          => $faker->numberBetween($minPrice, $maxPrice),
                    'delivery_days'  => $delivery,
                    'revision_count' => $revisions,
                ]
            );
        }
    }
}
