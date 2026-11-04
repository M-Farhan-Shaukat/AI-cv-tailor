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
        Schema::create('job_source_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 50)->index();
            $table->boolean('successful')->default(false)->index();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->text('message')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['provider', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_source_events');
    }
};
