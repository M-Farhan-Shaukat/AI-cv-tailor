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
        Schema::create('daily_traffic', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->unsignedInteger('page_views')->default(0);
            $table->unsignedInteger('visitors')->default(0);
            $table->unsignedInteger('scans')->default(0);
            $table->unsignedInteger('server_errors')->default(0);
            $table->timestamps();
        });

        Schema::create('daily_visitors', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->char('visitor_hash', 64);

            $table->unique(['date', 'visitor_hash']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_visitors');
        Schema::dropIfExists('daily_traffic');
    }
};
