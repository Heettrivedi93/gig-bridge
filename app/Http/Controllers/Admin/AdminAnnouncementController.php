<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminAnnouncementController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/announcements/index', [
            'announcements' => Announcement::query()
                ->with('creator:id,name')
                ->latest('id')
                ->get()
                ->map(fn (Announcement $announcement) => [
                    'id' => $announcement->id,
                    'message' => $announcement->message,
                    'audience' => $announcement->audience,
                    'status' => $announcement->status,
                    'expires_at' => $announcement->expires_at?->toIso8601String(),
                    'created_at' => $announcement->created_at?->toIso8601String(),
                    'created_by_name' => $announcement->creator?->name ?? 'System',
                ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateAnnouncement($request);

        Announcement::create([
            'created_by' => $request->user()?->id,
            ...$this->payload($data),
        ]);

        return back()->with('success', 'Announcement created successfully.');
    }

    public function update(Request $request, Announcement $announcement)
    {
        $data = $this->validateAnnouncement($request);

        $announcement->update($this->payload($data));

        return back()->with('success', 'Announcement updated successfully.');
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return back()->with('success', 'Announcement deleted successfully.');
    }

    private function validateAnnouncement(Request $request): array
    {
        return $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'audience' => ['required', Rule::in(['all', 'buyers', 'sellers'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'expires_at' => [
                'nullable',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $expiresAt = $this->parseExpiryDate($value);

                    if ($expiresAt === null) {
                        $fail('Please enter a valid date and time.');

                        return;
                    }

                    if ($expiresAt->lessThanOrEqualTo(now())) {
                        $fail('The expiry date and time must be in the future.');
                    }
                },
            ],
        ]);
    }

    private function payload(array $data): array
    {
        return [
            'message' => trim($data['message']),
            'audience' => $data['audience'],
            'status' => $data['status'],
            'expires_at' => filled($data['expires_at'] ?? null)
                ? $this->parseExpiryDate($data['expires_at'])
                : null,
        ];
    }

    private function parseExpiryDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $formats = ['Y-m-d\\TH:i', 'Y-m-d H:i:s', 'Y-m-d H:i'];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $value);
            } catch (\Throwable) {
                continue;
            }
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
