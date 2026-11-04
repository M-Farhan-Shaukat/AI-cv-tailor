<?php

namespace App\Services\JobSources;

use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

/**
 * Resolves the configured job sources, so adding a provider only requires a config entry.
 */
class JobSourceManager
{
    public function __construct(protected Container $container) {}

    /**
     * @return array<string, JobSource>
     */
    public function all(): array
    {
        $sources = [];

        foreach ((array) config('job_scan.sources', []) as $name => $class) {
            $sources[$name] = $this->container->make($class);
        }

        return $sources;
    }

    /**
     * Sources that have their credentials/configuration in place.
     *
     * @return array<string, JobSource>
     */
    public function configured(): array
    {
        return array_filter($this->all(), fn (JobSource $source): bool => $source->isConfigured());
    }

    /**
     * @param  array<int, string>  $names  Empty means "all configured sources".
     * @return array<string, JobSource>
     */
    public function only(array $names): array
    {
        $all = $this->all();

        if ($names === []) {
            return $all;
        }

        $unknown = array_values(array_diff($names, array_keys($all)));

        if ($unknown !== []) {
            throw new InvalidArgumentException('Unknown job source(s): '.implode(', ', $unknown));
        }

        return array_intersect_key($all, array_flip($names));
    }
}
