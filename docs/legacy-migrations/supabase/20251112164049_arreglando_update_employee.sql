
  create policy "Employees same company delete"
  on "public"."employees"
  as permissive
  for delete
  to authenticated
using ((company_id = public.get_company_for_user(auth.uid())));



  create policy "Employees same company insert"
  on "public"."employees"
  as permissive
  for insert
  to authenticated
with check ((company_id = public.get_company_for_user(auth.uid())));



  create policy "Employees same company update"
  on "public"."employees"
  as permissive
  for update
  to authenticated
using ((company_id = public.get_company_for_user(auth.uid())))
with check ((company_id = public.get_company_for_user(auth.uid())));



