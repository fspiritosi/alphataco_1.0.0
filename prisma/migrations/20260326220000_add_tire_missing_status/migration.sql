-- Add MISSING to TireStatus enum
ALTER TYPE "public"."TireStatus" ADD VALUE IF NOT EXISTS 'MISSING';

-- Add MISSING_REPORT to TireServiceAction enum
ALTER TYPE "public"."TireServiceAction" ADD VALUE IF NOT EXISTS 'MISSING_REPORT';
