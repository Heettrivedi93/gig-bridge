<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementDismissalController extends Controller
{
    public function store(Request $request, Announcement $announcement)
    {
        abort_unless(
            Announcement::query()
                ->whereKey($announcement->id)
                ->active()
                ->forUser($request->user())
                ->exists(),
            404
        );

        $announcement->dismissedBy()->syncWithoutDetaching([
            $request->user()->id => ['dismissed_at' => now()],
        ]);

        return back()->with('success', 'Announcement dismissed.');
    }
}
