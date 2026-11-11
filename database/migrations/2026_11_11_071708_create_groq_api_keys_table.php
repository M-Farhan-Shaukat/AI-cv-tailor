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
        Schema::create('groq_api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->text('key');
            $table->char('fingerprint', 16)->unique();
            $table->char('last_four', 4);
            $table->boolean('is_active')->default(true)->index();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('groq_api_keys');
    }
};
