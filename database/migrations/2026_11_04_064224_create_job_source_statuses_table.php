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
        Schema::create('job_source_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 50)->unique();
            $table->timestamp('last_attempt_at')->nullable();
            $table->timestamp('last_success_at')->nullable();
            $table->timestamp('last_error_at')->nullable();
            $table->unsignedSmallInteger('last_status_code')->nullable();
            $table->text('last_error_message')->nullable();
            $table->unsignedSmallInteger('consecutive_failures')->default(0);
            $table->timestamp('disabled_until')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_source_statuses');
    }
};
