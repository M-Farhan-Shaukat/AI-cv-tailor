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
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->string('client_ip', 45)->nullable()->after('user_id');
            $table->index(['client_ip', 'created_at']);
            $table->index(['session_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->dropIndex(['client_ip', 'created_at']);
            $table->dropIndex(['session_id', 'created_at']);
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropColumn('client_ip');
        });
    }
};
