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
        Schema::create('saved_search_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saved_search_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['saved_search_id', 'job_posting_id']);
            $table->index(['saved_search_id', 'sent_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_search_notifications');
    }
};
