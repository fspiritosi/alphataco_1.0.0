create extension if not exists "pg_cron" with schema "pg_catalog";


  create policy "Permitir todo 18nbqpx_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'preparte-img'::text));



  create policy "Permitir todo 18nbqpx_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'preparte-img'::text));



  create policy "Permitir todo 18nbqpx_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'preparte-img'::text));



  create policy "Permitir todo 18nbqpx_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'preparte-img'::text));



  create policy "Permitir todo 1bs1gex_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'avatar'::text));



  create policy "Permitir todo 1bs1gex_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'avatar'::text));



  create policy "Permitir todo 1bs1gex_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'avatar'::text));



  create policy "Permitir todo 1bs1gex_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'avatar'::text));



  create policy "Permitir todo 1jwpwg0_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'employee-photos'::text));



  create policy "Permitir todo 1jwpwg0_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'employee-photos'::text));



  create policy "Permitir todo 1jwpwg0_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'employee-photos'::text));



  create policy "Permitir todo 1jwpwg0_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'employee-photos'::text));



  create policy "Permitir todo 1la5rt7_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'daily-reports'::text));



  create policy "Permitir todo 1la5rt7_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'daily-reports'::text));



  create policy "Permitir todo 1la5rt7_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'daily-reports'::text));



  create policy "Permitir todo 1la5rt7_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'daily-reports'::text));



  create policy "Permitir todo 1zbfv_0 1zbfv_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'logo'::text));



  create policy "Permitir todo 1zbfv_0 1zbfv_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'logo'::text));



  create policy "Permitir todo 1zbfv_0 1zbfv_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'logo'::text));



  create policy "Permitir todo 1zbfv_0 1zbfv_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'logo'::text));



  create policy "Permitir todo 36p7lk_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'repair-images'::text));



  create policy "Permitir todo 36p7lk_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'repair-images'::text));



  create policy "Permitir todo 36p7lk_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'repair-images'::text));



  create policy "Permitir todo 36p7lk_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'repair-images'::text));



  create policy "Permitir todo 7ntqo5_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'document-files'::text));



  create policy "Permitir todo 7ntqo5_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'document-files'::text));



  create policy "Permitir todo 7ntqo5_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'document-files'::text));



  create policy "Permitir todo 7ntqo5_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'document-files'::text));



  create policy "Permitir todo dm0lod_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'contract-documents'::text));



  create policy "Permitir todo dm0lod_1"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'contract-documents'::text));



  create policy "Permitir todo dm0lod_2"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'contract-documents'::text));



  create policy "Permitir todo dm0lod_3"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'contract-documents'::text));



  create policy "Permitir todo rhc2hp_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'document-files-expired'::text));



  create policy "Permitir todo rhc2hp_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'document-files-expired'::text));



  create policy "Permitir todo rhc2hp_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'document-files-expired'::text));



  create policy "Permitir todo rhc2hp_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'document-files-expired'::text));



  create policy "Permitir todo xzv0aq_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'vehicle-photos'::text));



  create policy "Permitir todo xzv0aq_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'vehicle-photos'::text));



  create policy "Permitir todo xzv0aq_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'vehicle-photos'::text));



  create policy "Permitir todo xzv0aq_3"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'vehicle-photos'::text));



