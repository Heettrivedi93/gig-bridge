<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Graphics & Design',
                'slug' => 'graphics-design',
                'subcategories' => [
                    'Logo Design',
                    'Brand Identity Design',
                    'Social Media Design',
                    'Illustration',
                    'Packaging Design',
                    'Flyer & Poster Design',
                    'UI/UX Design',
                    'Presentation Design',
                ],
            ],
            [
                'name' => 'Programming & Tech',
                'slug' => 'programming-tech',
                'subcategories' => [
                    'Web Development',
                    'Mobile App Development',
                    'E-commerce Development',
                    'API Development & Integration',
                    'Bug Fixing',
                    'Website Maintenance',
                    'DevOps & Cloud',
                    'AI & Machine Learning',
                ],
            ],
            [
                'name' => 'Digital Marketing',
                'slug' => 'digital-marketing',
                'subcategories' => [
                    'Social Media Marketing',
                    'SEO',
                    'Search Engine Marketing (SEM)',
                    'Email Marketing',
                    'Content Marketing',
                    'Influencer Marketing',
                    'Marketing Strategy',
                ],
            ],
            [
                'name' => 'Writing & Translation',
                'slug' => 'writing-translation',
                'subcategories' => [
                    'Blog & Article Writing',
                    'Copywriting',
                    'Technical Writing',
                    'Translation',
                    'Proofreading & Editing',
                    'Resume Writing',
                    'Creative Writing',
                ],
            ],
            [
                'name' => 'Video & Animation',
                'slug' => 'video-animation',
                'subcategories' => [
                    'Video Editing',
                    'Animation',
                    'Whiteboard Animation',
                    'Explainer Videos',
                    'Intro & Outro Videos',
                    'Visual Effects',
                ],
            ],
            [
                'name' => 'Music & Audio',
                'slug' => 'music-audio',
                'subcategories' => [
                    'Voice Over',
                    'Music Production',
                    'Audio Editing',
                    'Podcast Editing',
                    'Sound Design',
                ],
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'subcategories' => [
                    'Virtual Assistant',
                    'Business Plans',
                    'Market Research',
                    'Project Management',
                    'Data Entry',
                    'Customer Support',
                ],
            ],
            [
                'name' => 'Lifestyle',
                'slug' => 'lifestyle',
                'subcategories' => [
                    'Online Tutoring',
                    'Fitness Coaching',
                    'Life Coaching',
                    'Astrology & Readings',
                    'Gaming',
                ],
            ],
        ];

        foreach ($categories as $data) {
            $parent = Category::firstOrCreate(
                ['slug' => $data['slug']],
                ['name' => $data['name'], 'status' => 'active']
            );

            foreach ($data['subcategories'] as $subName) {
                Category::firstOrCreate(
                    ['slug' => Str::slug($subName), 'parent_id' => $parent->id],
                    ['name' => $subName, 'status' => 'active']
                );
            }
        }
    }
}
