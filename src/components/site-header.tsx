import { auth } from "@/auth";
import { getPublicPortalLink } from "@/src/lib/auth/public-nav";
import { SiteHeaderClient } from "@/src/components/site-header-client";

export async function SiteHeader() {
  const session = await auth();
  const portalLink = getPublicPortalLink(session);

  return <SiteHeaderClient portalLink={portalLink} />;
}
