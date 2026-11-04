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
        Schema::create('saved_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('query', 120)->default('');
            $table->json('filters')->nullable();
            $table->unsignedTinyInteger('min_score')->default(60);
            $table->boolean('alerts_enabled')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'alerts_enabled']);
            $table->index('last_run_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_searches');
    }
};
