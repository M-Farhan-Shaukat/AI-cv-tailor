<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 50)->index();
            $table->string('external_id', 191)->nullable();
            $table->char('fingerprint', 64)->unique();
            $table->string('title');
            $table->string('company')->nullable();
            $table->string('location')->nullable();
            $table->boolean('is_remote')->default(false);
            $table->string('employment_type', 50)->nullable();
            $table->unsignedInteger('salary_min')->nullable();
            $table->unsignedInteger('salary_max')->nullable();
            $table->char('currency', 3)->nullable();
            $table->longText('description');
            $table->text('apply_url');
            $table->json('keywords')->nullable();
            $table->char('keywords_hash', 64)->nullable()->index();
            $table->timestamp('posted_at')->nullable()->index();
            $table->timestamp('last_seen_at')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->index(['is_active', 'posted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_postings');
    }
};
