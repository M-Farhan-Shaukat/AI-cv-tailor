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
        Schema::create('llm_usage_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('scope', 20)->index();
            $table->string('model', 100)->nullable();
            $table->string('status', 20)->default('success')->index();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->unsignedInteger('duration_ms')->default(0);
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('llm_usage_events');
    }
};
