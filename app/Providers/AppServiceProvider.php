<?php

namespace App\Providers;

use App\Models\User;
use App\Services\MailConfigurationService;
use App\Support\PortalPermissions;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        app(MailConfigurationService::class)->apply();
        $this->configurePermissionDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    protected function configurePermissionDefaults(): void
    {
        Gate::before(function (User $user, string $ability) {
            if ($user->hasRole('super_admin')) {
                return true;
            }

            if (! PortalPermissions::isPortalPermission($ability)) {
                return null;
            }

            if (! $user->usesDefaultPortalPermissions()) {
                return null;
            }

            return in_array($ability, $user->effectivePortalPermissions(), true) ? true : null;
        });
    }
}
