import AuthPanel from "@/components/AuthPanel";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

const [authOpen, setAuthOpen] = useState(false);
<button
  onClick={() => setAuthOpen(true)}
  className="rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70"
>
  Account
</button>

{authOpen && (
  <AuthPanel
    onClose={() => setAuthOpen(false)}
    onLocationSet={(lat, lng, label) => {
      setCenter([lat, lng]);
      setPin([lat, lng]);
      setSearchLabel(label);
      setAuthOpen(false);
    }}
  />
)}
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
