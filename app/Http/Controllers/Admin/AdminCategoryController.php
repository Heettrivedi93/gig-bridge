<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminCategoryController extends Controller
{
    public function index()
    {
        $categories = Category::whereNull('parent_id')
            ->with('subcategories')
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $parentId = $request->input('parent_id');
        if ($parentId === '' || $parentId === 'none') {
            $request->merge(['parent_id' => null]);
        }

        $data = $request->validate([
            'name'      => ['required', 'string', 'max:100'],
            'parent_id' => ['nullable', 'exists:categories,id'],
            'status'    => ['required', 'in:active,inactive'],
        ]);

        $data['slug'] = $this->uniqueSlug(Str::slug($data['name']));

        Category::create($data);

        return back()->with('success', 'Category created.');
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name'   => ['required', 'string', 'max:100'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $newSlug = Str::slug($data['name']);
        if ($newSlug !== $category->slug) {
            $data['slug'] = $this->uniqueSlug($newSlug, $category->id);
        }

        $category->update($data);

        return back()->with('success', 'Category updated.');
    }

    public function destroy(Category $category)
    {
        DB::transaction(function () use ($category) {
            $this->deleteWithDescendants($category);
        });

        return back()->with('success', 'Category deleted.');
    }

    private function deleteWithDescendants(Category $category): void
    {
        $category->loadMissing('subcategories');

        foreach ($category->subcategories as $subcategory) {
            $this->deleteWithDescendants($subcategory);
        }

        $category->delete();
    }

    private function uniqueSlug(string $slug, ?int $ignoreId = null): string
    {
        $original = $slug;
        $i = 1;

        while (
            Category::where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $original.'-'.$i++;
        }

        return $slug;
    }
}
