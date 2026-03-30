
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'clinic_admin' THEN 2
      WHEN 'patient' THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;
