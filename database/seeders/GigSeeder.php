<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Gig;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Seeder;

class GigSeeder extends Seeder
{
    public function run(): void
    {
        $sellers = User::query()
            ->role('seller')
            ->orderBy('id')
            ->get();

        if ($sellers->isEmpty()) {
            $this->command?->warn('GigSeeder skipped: no existing sellers found.');

            return;
        }

        $graphics = Category::query()->where('slug', 'graphics-design')->first();
        $logoDesign = Category::query()->where('slug', 'logo-design')->whereNotNull('parent_id')->first();
        $programming = Category::query()->where('slug', 'programming-tech')->first();
        $webDevelopment = Category::query()->where('slug', 'web-development')->whereNotNull('parent_id')->first();
        $marketing = Category::query()->where('slug', 'digital-marketing')->first();
        $seo = Category::query()->where('slug', 'seo')->whereNotNull('parent_id')->first();
        $writing = Category::query()->where('slug', 'writing-translation')->first();
        $copywriting = Category::query()->where('slug', 'copywriting')->whereNotNull('parent_id')->first();
        $video = Category::query()->where('slug', 'video-animation')->first();
        $videoEditing = Category::query()->where('slug', 'video-editing')->whereNotNull('parent_id')->first();

        if (! $graphics || ! $logoDesign || ! $programming || ! $webDevelopment || ! $marketing || ! $seo || ! $writing || ! $copywriting || ! $video || ! $videoEditing) {
            $this->command?->warn('GigSeeder skipped: required categories or subcategories are missing.');

            return;
        }

        $definitions = [
            [
                'category' => $graphics,
                'subcategory' => $logoDesign,
                'title' => 'I will design a modern minimalist logo',
                'description' => 'Clean, scalable logo concepts for startups, agencies, and growing brands.',
                'tags' => ['logo', 'branding', 'design'],
                'packages' => [
                    'basic'    => ['Starter logo',        '1 logo concept with transparent export.',                          35,  6, 2],
                    'standard' => ['Business logo kit',   '2 concepts with color variations and brand sheet.',                75,  4, 3],
                    'premium'  => ['Full brand identity', '3 concepts, brand guide, social assets, and source files.',       150, 2, 5],
                ],
            ],
            [
                'category' => $programming,
                'subcategory' => $webDevelopment,
                'title' => 'I will build a responsive Laravel landing page',
                'description' => 'Modern landing page with responsive sections, forms, and polished UI for product launches.',
                'tags' => ['laravel', 'react', 'landing-page'],
                'packages' => [
                    'basic'    => ['Single-page build', 'Responsive one-page website with 3 sections.',                              120, 7, 2],
                    'standard' => ['Marketing site',    'Responsive website with up to 6 sections and contact form.',               240, 5, 3],
                    'premium'  => ['Conversion site',   'Full landing experience with animations and CMS-ready sections.',           420, 3, 5],
                ],
            ],
            [
                'category' => $marketing,
                'subcategory' => $seo,
                'title' => 'I will do on-page SEO for your business website',
                'description' => 'Keyword mapping, on-page optimization, meta updates, and actionable technical recommendations.',
                'tags' => ['seo', 'marketing', 'audit'],
                'packages' => [
                    'basic'    => ['SEO starter',    'Optimization for up to 5 pages with keyword suggestions.',          60,  7, 1],
                    'standard' => ['SEO growth',     'Optimization for 10 pages plus content recommendations.',           140, 5, 2],
                    'premium'  => ['SEO authority',  'Advanced optimization, audit report, and priority roadmap.',        260, 3, 3],
                ],
            ],
            [
                'category' => $writing,
                'subcategory' => $copywriting,
                'title' => 'I will write high-converting website copy',
                'description' => 'Clear, persuasive copy for landing pages, services, and conversion-focused websites.',
                'tags' => ['copywriting', 'website-copy', 'sales'],
                'packages' => [
                    'basic'    => ['Homepage copy',       'Homepage headline and 3 conversion sections.',                   55,  6, 1],
                    'standard' => ['Sales page copy',     'Full website page copy for one service or offer.',               130, 4, 2],
                    'premium'  => ['Brand messaging set', 'Website copy plus messaging guide and CTA variants.',            240, 2, 3],
                ],
            ],
            [
                'category' => $video,
                'subcategory' => $videoEditing,
                'title' => 'I will edit short form reels and tiktok videos',
                'description' => 'Fast-paced social edits with subtitles, hooks, transitions, and export-ready formats.',
                'tags' => ['video-editing', 'reels', 'shorts'],
                'packages' => [
                    'basic'    => ['3 short videos',  'Up to 3 edited short videos with captions.',                        45,  6, 1],
                    'standard' => ['8 short videos',  'Batch editing with hooks, captions, and music sync.',               120, 4, 2],
                    'premium'  => ['15 short videos', 'High-volume short-form package with creative pacing.',              220, 2, 3],
                ],
            ],
            [
                'category' => $graphics,
                'subcategory' => $logoDesign,
                'title' => 'I will create a professional brand identity kit',
                'description' => 'Full visual identity system including logo variations, colors, and brand rules.',
                'tags' => ['brand-identity', 'logo', 'guidelines'],
                'packages' => [
                    'basic'    => ['Mini identity', 'Logo plus typography and color palette.',                              80,  7, 2],
                    'standard' => ['Brand kit',     'Logo suite, palette, typography, and mini guide.',                    180, 5, 3],
                    'premium'  => ['Full identity',  'Full brand kit with social templates and guide.',                    320, 3, 4],
                ],
            ],
            [
                'category' => $programming,
                'subcategory' => $webDevelopment,
                'title' => 'I will fix bugs in your Laravel or React app',
                'description' => 'Targeted bug fixing for frontend and backend issues with clear handoff notes.',
                'tags' => ['bug-fix', 'laravel', 'react'],
                'packages' => [
                    'basic'    => ['1 bug fix',        'Fix one isolated bug or UI issue.',                                 40,  5, 1],
                    'standard' => ['3 bug fixes',      'Resolve multiple issues across one project area.',                 110, 3, 2],
                    'premium'  => ['Deep fix sprint',  'Priority debugging pass for complex app issues.',                  240, 1, 3],
                ],
            ],
            [
                'category' => $marketing,
                'subcategory' => $seo,
                'title' => 'I will prepare an SEO audit and action plan',
                'description' => 'Technical and on-page SEO audit with a prioritized roadmap for faster growth.',
                'tags' => ['seo-audit', 'keyword-research', 'growth'],
                'packages' => [
                    'basic'    => ['Mini audit',    'Website review with quick fixes and summary.',                         50,  6, 1],
                    'standard' => ['Growth audit',  'Detailed audit with issues and recommendations.',                     125, 4, 2],
                    'premium'  => ['SEO roadmap',   'Audit, action plan, and implementation priority matrix.',             240, 2, 3],
                ],
            ],
            [
                'category' => $writing,
                'subcategory' => $copywriting,
                'title' => 'I will write SEO blog posts for your niche',
                'description' => 'Search-friendly blog content tailored to your product, niche, and audience.',
                'tags' => ['blog-writing', 'seo-content', 'articles'],
                'packages' => [
                    'basic'    => ['1 article',       'One optimized article up to 1000 words.',                           35,  6, 1],
                    'standard' => ['3 articles',      'Three optimized blog posts with metadata.',                         95,  4, 2],
                    'premium'  => ['Content bundle',  'Five blog posts with internal-link suggestions.',                   170, 2, 3],
                ],
            ],
            [
                'category' => $video,
                'subcategory' => $videoEditing,
                'title' => 'I will edit youtube videos with clean pacing',
                'description' => 'Long-form YouTube editing with cuts, b-roll placeholders, subtitles, and polish.',
                'tags' => ['youtube', 'video-editing', 'content'],
                'packages' => [
                    'basic'    => ['Single edit',     'Edit one video up to 8 minutes.',                                   70,  7, 1],
                    'standard' => ['Channel bundle',  'Edit two polished videos with captions.',                           160, 5, 2],
                    'premium'  => ['Creator pack',    'Edit four videos with style consistency and polish.',               320, 3, 3],
                ],
            ],
            [
                'category' => $graphics,
                'subcategory' => $logoDesign,
                'title' => 'I will design social media brand posts',
                'description' => 'Branded social graphics for launches, promotions, announcements, and campaigns.',
                'tags' => ['social-media', 'templates', 'branding'],
                'packages' => [
                    'basic'    => ['5 posts',  'Five branded post designs for one campaign.',                              30,  6, 1],
                    'standard' => ['12 posts', 'Twelve branded post templates with resizing.',                             75,  4, 2],
                    'premium'  => ['20 posts', 'Full monthly visual content kit with campaign consistency.',               140, 2, 3],
                ],
            ],
            [
                'category' => $programming,
                'subcategory' => $webDevelopment,
                'title' => 'I will create a conversion focused business website',
                'description' => 'Business website build with responsive design, sections, CTAs, and inquiry form.',
                'tags' => ['business-website', 'web-design', 'development'],
                'packages' => [
                    'basic'    => ['Starter site',   'Up to 3 sections and mobile responsiveness.',                        150, 8, 2],
                    'standard' => ['Business site',  'Full multi-section site with inquiry form.',                         320, 6, 3],
                    'premium'  => ['Premium site',   'Advanced layout, animations, and conversion polish.',                550, 4, 4],
                ],
            ],
            [
                'category' => $marketing,
                'subcategory' => $seo,
                'title' => 'I will optimize your local SEO profile',
                'description' => 'Local SEO optimization for small businesses including profile cleanup and citation guidance.',
                'tags' => ['local-seo', 'google-business', 'ranking'],
                'packages' => [
                    'basic'    => ['Profile cleanup', 'Google Business Profile optimization basics.',                       45,  6, 1],
                    'standard' => ['Local growth',    'Profile optimization plus competitor review.',                      110, 4, 2],
                    'premium'  => ['Local authority', 'Full local SEO package with citation plan.',                        210, 2, 3],
                ],
            ],
            [
                'category' => $writing,
                'subcategory' => $copywriting,
                'title' => 'I will write product descriptions that sell',
                'description' => 'Compelling product copy focused on benefits, differentiation, and conversion.',
                'tags' => ['product-copy', 'ecommerce', 'sales-copy'],
                'packages' => [
                    'basic'    => ['5 products',  'Descriptions for five products.',                                        30,  6, 1],
                    'standard' => ['15 products', 'Descriptions for fifteen products with tone consistency.',               85,  4, 2],
                    'premium'  => ['30 products', 'Large product-copy batch with category messaging support.',              160, 2, 3],
                ],
            ],
            [
                'category' => $video,
                'subcategory' => $videoEditing,
                'title' => 'I will make an engaging promo video edit',
                'description' => 'Promo video assembly with music, pacing, captions, and punchy transitions.',
                'tags' => ['promo-video', 'ads', 'editing'],
                'packages' => [
                    'basic'    => ['15-second promo',       'Short promotional video edit for ads or socials.',             50,  6, 1],
                    'standard' => ['30-second promo',       'Polished ad or promo video with captions.',                   120, 4, 2],
                    'premium'  => ['60-second campaign promo', 'Longer promo edit with multiple format exports.',          230, 2, 3],
                ],
            ],
        ];

        foreach ($sellers as $seller) {
            $gigLimit = $this->resolveGigLimitForSeller($seller);
            $seedCount = min($gigLimit, count($definitions));

            foreach (array_slice($definitions, 0, $seedCount) as $definition) {
                $this->seedGig(
                    seller: $seller,
                    category: $definition['category'],
                    subcategory: $definition['subcategory'],
                    title: $definition['title'],
                    description: $definition['description'],
                    tags: $definition['tags'],
                    packages: $definition['packages'],
                );
            }

            $this->command?->info(sprintf(
                'Seeded %d gigs for seller %s (limit: %d).',
                $seedCount,
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

    private function seedGig(
        User $seller,
        Category $category,
        Category $subcategory,
        string $title,
        string $description,
        array $tags,
        array $packages,
    ): void {
        $gig = Gig::query()->updateOrCreate(
            [
                'user_id' => $seller->id,
                'title' => $title,
            ],
            [
                'category_id' => $category->id,
                'subcategory_id' => $subcategory->id,
                'description' => $description,
                'tags' => $tags,
                'status' => 'active',
                'approval_status' => 'approved',
                'rejection_reason' => null,
                'approved_at' => now(),
                'rejected_at' => null,
            ]
        );

        foreach ($packages as $tier => [$packageTitle, $packageDescription, $price, $deliveryDays, $revisionCount]) {
            $gig->packages()->updateOrCreate(
                ['tier' => $tier],
                [
                    'title' => $packageTitle,
                    'description' => $packageDescription,
                    'price' => $price,
                    'delivery_days' => $deliveryDays,
                    'revision_count' => $revisionCount,
                ]
            );
        }
    }
}
