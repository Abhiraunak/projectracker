"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TopBar } from "@/components/dashboard/TopBar";
import { ProjectAccessProvider, useMyAccess } from "@/hooks/useProjectAccess";
import { AccessGate } from "@/components/access/AccessGate";
import { useAuth } from "@/hooks/useAuth";
import { roleOf } from "@/lib/auth/home";
// import { useLiveUpdates } from "@/hooks/useLiveUpdates";

/**
 * Hides the scrollbar itself. Scrolling still works the normal ways: mouse wheel, trackpad, touch, and the
 * keyboard (arrow keys, Page Down, Space) once you have clicked or tabbed into the content.
 * To show a thin bar instead, swap this for "[scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent]".
 */
const HIDE_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * The staff app: one bar across the top (ProjectTracker, the bell, the person's menu with the other pages and
 * Log out), and the page below it. There is no sidebar.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useAuth();
  // Client accounts have their own portal; the staff app (and its menus) is never shown to them.
  // Known from the role when "who am I" carries it; otherwise from the server refusing the staff access check (403).
  const roleSaysClient = roleOf(user) === "CLIENT";
  // What this person may do (company-wide): decides the menu, the pages and the buttons. Not asked for a client.
  const access = useMyAccess({ enabled: !roleSaysClient });
  const isClient = roleSaysClient || access.isClientAccount;
  // useLiveUpdates(!!user && !isClient); // the bell and the client payments page update by themselves

  // replace, not push: the back button shouldn't return to a page the account can't use
  // Not signed in (for example the installed app opening on /dashboard): to the sign-in page, back here after
  useEffect(() => {
    if (!isUserLoading && !user) router.replace(`/signin?next=${encodeURIComponent(pathname || "/dashboard")}`);
  }, [isUserLoading, user, pathname, router]);

  useEffect(() => {
    if (isClient) router.replace("/client");
  }, [isClient, router]);

  // Still checking who this is, signed out (on the way to sign in), or a client (on the way to their portal)
  if (isUserLoading || !user || isClient) return <div aria-busy="true" className="min-h-dvh bg-[#F7F7F5]" />;

  return (
    <ProjectAccessProvider value={access}>
      <div className="min-h-dvh bg-[#F7F7F5] text-stone-950 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
        <TopBar />
      
        <div className="lg:min-h-0 lg:flex-1">
          <main
            id="main-content"
            tabIndex={-1}
            className={`relative min-w-0 px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:h-full lg:py-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-8 ${HIDE_SCROLLBAR}`}
          >
            <div className="mx-auto w-full max-w-330">
              {/* A new account nobody has given access yet sees only the welcome page */}
              <AccessGate>{children}</AccessGate>
            </div>
          </main>
        </div>
      </div>
    </ProjectAccessProvider>
  );
}