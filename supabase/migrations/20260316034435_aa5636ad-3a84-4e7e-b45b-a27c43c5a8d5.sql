
-- Update handle_new_user to auto-assign admin role for admin emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'admin@anvaya.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
    END,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$function$;
