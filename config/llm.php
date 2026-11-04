<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Daily LLM Budgets
    |--------------------------------------------------------------------------
    |
    | A value of 0 disables that limit. Budgets are checked before every call
    | so a runaway scan cannot exhaust the shared Groq quota.
    |
    */

    'daily_token_limit' => (int) env('LLM_DAILY_TOKEN_LIMIT', 2000000),
    'daily_user_token_limit' => (int) env('LLM_DAILY_USER_TOKEN_LIMIT', 200000),
    'daily_request_limit' => (int) env('LLM_DAILY_REQUEST_LIMIT', 1000),
    'daily_user_request_limit' => (int) env('LLM_DAILY_USER_REQUEST_LIMIT', 200),

    /*
    |--------------------------------------------------------------------------
    | Cost Estimates
    |--------------------------------------------------------------------------
    |
    | Used by the admin dashboard to estimate spend. Leave at 0 for free tiers.
    |
    */

    'input_cost_per_million_tokens' => (float) env('LLM_INPUT_COST_PER_MILLION', 0),
    'output_cost_per_million_tokens' => (float) env('LLM_OUTPUT_COST_PER_MILLION', 0),

];
