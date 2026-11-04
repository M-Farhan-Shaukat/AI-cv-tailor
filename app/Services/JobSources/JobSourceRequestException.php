<?php

namespace App\Services\JobSources;

use RuntimeException;
use Throwable;

class JobSourceRequestException extends RuntimeException
{
    public function __construct(string $message, public readonly ?int $statusCode = null, ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
