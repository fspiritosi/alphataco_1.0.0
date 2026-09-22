CREATE TRIGGER controlar_alertas_employees_insert AFTER INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.trg_controlar_alertas_employees();

CREATE TRIGGER controlar_alertas_vehicles_insert AFTER INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.trg_controlar_alertas_vehicles();


