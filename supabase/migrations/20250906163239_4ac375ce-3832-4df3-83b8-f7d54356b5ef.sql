-- Fix security issues in database functions by setting proper search_path

-- Fix decrease_stock function
CREATE OR REPLACE FUNCTION public.decrease_stock(product_id_to_update uuid, quantity_to_decrease integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.products
  SET stock = stock - quantity_to_decrease
  WHERE id = product_id_to_update AND stock >= quantity_to_decrease;
END;
$function$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'admin'
  );
END;
$function$;

-- Fix is_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_admin_by_email(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN user_email = 'admin@atacadocanoa.com';
END;
$function$;