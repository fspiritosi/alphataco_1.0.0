-- CreateTable
CREATE TABLE "support_ticket_views" (
    "user_id" UUID NOT NULL,
    "taskapp_ticket_id" BIGINT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "last_seen_status_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "support_ticket_views_pkey" PRIMARY KEY ("user_id","taskapp_ticket_id")
);

-- CreateIndex
CREATE INDEX "idx_support_ticket_views_user_id" ON "support_ticket_views" ("user_id");

-- AddForeignKey
ALTER TABLE "support_ticket_views" ADD CONSTRAINT "support_ticket_views_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
