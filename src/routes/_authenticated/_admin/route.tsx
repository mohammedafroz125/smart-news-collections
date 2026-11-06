import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-identity";

// Admin-only gate: every route in this section requires a signed-in user with the
// admin role. Non-admins are bounced to the public home page.
export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
