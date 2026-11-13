<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ProTrial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Opens or ends a Pro trial for every signed-in account at once.
 */
class ProTrialController extends Controller
{
    public function store(Request $request, ProTrial $proTrial): RedirectResponse
    {
        Gate::authorize('manage-site-settings');

        $validated = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:'.ProTrial::MAX_DAYS],
            'tailor_limit' => ['nullable', 'integer', 'min:0', 'max:'.ProTrial::MAX_TAILOR_LIMIT],
        ]);
        $days = (int) $validated['days'];

        $proTrial->start($days, isset($validated['tailor_limit']) ? (int) $validated['tailor_limit'] : null);

        return back()->with('status', "Every account now has Pro for {$days} day".($days === 1 ? '' : 's').'.');
    }

    public function destroy(ProTrial $proTrial): RedirectResponse
    {
        Gate::authorize('manage-site-settings');

        $proTrial->stop();

        return back()->with('status', 'The Pro trial for everyone has ended.');
    }
}
