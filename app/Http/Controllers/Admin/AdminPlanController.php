<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminPlanController extends Controller
{
    public function index()
    {
        $plans = Plan::query()
            ->orderBy('price')
            ->orderBy('name')
            ->get()
            ->map(fn (Plan $plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => (string) $plan->price,
                'duration_days' => $plan->duration_days,
                'gig_limit' => $plan->gig_limit,
                'features' => $plan->features ?? [],
                'status' => $plan->status,
            ]);

        return Inertia::render('admin/plans/index', [
            'plans' => $plans,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:plans,name'],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'gig_limit' => ['required', 'integer', 'min:1'],
            'features_text' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        Plan::create([
            'name' => $data['name'],
            'price' => $data['price'],
            'duration_days' => $data['duration_days'],
            'gig_limit' => $data['gig_limit'],
            'features' => $this->extractFeatures($data['features_text'] ?? null),
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Plan created successfully.');
    }

    public function update(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('plans', 'name')->ignore($plan->id)],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'gig_limit' => ['required', 'integer', 'min:1'],
            'features_text' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $plan->update([
            'name' => $data['name'],
            'price' => $data['price'],
            'duration_days' => $data['duration_days'],
            'gig_limit' => $data['gig_limit'],
            'features' => $this->extractFeatures($data['features_text'] ?? null),
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Plan updated successfully.');
    }

    public function destroy(Plan $plan)
    {
        $plan->delete();

        return back()->with('success', 'Plan deleted successfully.');
    }

    private function extractFeatures(?string $featuresText): array
    {
        if (! $featuresText) {
            return [];
        }

        return collect(preg_split('/\r\n|\r|\n/', $featuresText))
            ->map(fn ($feature) => trim((string) $feature))
            ->filter()
            ->values()
            ->all();
    }
}

