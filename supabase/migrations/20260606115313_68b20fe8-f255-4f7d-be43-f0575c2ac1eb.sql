
-- Assign superadmin (and admin for backward compat) to vays.art@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('fcc4afc2-d8ce-4166-a5db-1b81513ccea0', 'superadmin'),
       ('fcc4afc2-d8ce-4166-a5db-1b81513ccea0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Replace user_roles policies: superadmin can manage all; admin can view
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Superadmins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
