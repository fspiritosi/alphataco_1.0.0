-- Ticket 690: visibilidad de las solicitudes de mantenimiento de equipamientos por tipo.
-- Se configura por rol (role_hidden_equipment_types, opt-out: sin fila = lo ve) y se puede
-- ajustar por usuario (user_equipment_type_visibility), igual que role_permissions /
-- user_permissions. Sin datos iniciales: al publicar, todos siguen viendo todo.

-- CreateTable
CREATE TABLE "public"."role_hidden_equipment_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" BIGINT NOT NULL,
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_hidden_equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_equipment_type_visibility" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "is_visible" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_equipment_type_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_role_hidden_equipment_types_type_id" ON "public"."role_hidden_equipment_types"("type_id");
CREATE UNIQUE INDEX "role_hidden_equipment_types_role_id_type_id_key" ON "public"."role_hidden_equipment_types"("role_id", "type_id");
CREATE INDEX "idx_user_equipment_type_visibility_type_id" ON "public"."user_equipment_type_visibility"("type_id");
CREATE UNIQUE INDEX "user_equipment_type_visibility_user_id_type_id_key" ON "public"."user_equipment_type_visibility"("user_id", "type_id");

-- AddForeignKey
ALTER TABLE "public"."role_hidden_equipment_types" ADD CONSTRAINT "role_hidden_equipment_types_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."role_hidden_equipment_types" ADD CONSTRAINT "role_hidden_equipment_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."user_equipment_type_visibility" ADD CONSTRAINT "user_equipment_type_visibility_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."user_equipment_type_visibility" ADD CONSTRAINT "user_equipment_type_visibility_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Solo se leen y escriben desde el servidor con Prisma. RLS sin políticas para que
-- ningún cliente pueda tocarlas con la anon key (mismo criterio que external_api_clients).
ALTER TABLE "public"."role_hidden_equipment_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_equipment_type_visibility" ENABLE ROW LEVEL SECURITY;
