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
        Schema::create('job_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('session_id')->nullable()->index();
            $table->char('matcher_key', 64);
            $table->char('resume_hash', 64);
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('score')->default(0);
            $table->json('breakdown')->nullable();
            $table->json('matched_keywords')->nullable();
            $table->json('missing_keywords')->nullable();
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->unique(['matcher_key', 'job_posting_id']);
            $table->index(['matcher_key', 'score']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_matches');
    }
};
