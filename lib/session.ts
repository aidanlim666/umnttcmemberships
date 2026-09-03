import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentMembership, type ActiveMembership } from "@/lib/eligibility";

export type Viewer = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  memberships: ActiveMembership[];
  /** The membership in force right now, or null. Drives the header badge. */
  membership: ActiveMembership | null;
};

/**
 * Server-side "who is looking at this page, and what do they already own".
 * Memberships are read fresh on every request so a purchase updates the header
 * badge immediately, rather than waiting for the JWT to be reissued.
 */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      memberships: { select: { tier: true, endsAt: true } },
    },
  });
  if (!user) return null;

  const memberships = user.memberships;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    memberships,
    membership: currentMembership(memberships),
  };
}

/**
 * The signed-in user's id, but only if that user still exists.
 *
 * A JWT stays valid for its full lifetime, so a session can outlive the row it points at
 * (a member removed from the roster, a database reset). Trusting the token alone lets the
 * app believe someone is signed in when they are not — which silently breaks the login
 * page and would fail on a foreign key the moment they tried to buy anything.
 */
export async function getViewerId(): Promise<string | null> {
  return (await getViewer())?.id ?? null;
}
