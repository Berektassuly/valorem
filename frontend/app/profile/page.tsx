import { ProfileView } from "@/components/views/profile-view";
import { getAuthSession } from "@/lib/marketplace/auth";
import { listProfileAuctions } from "@/lib/marketplace/auction-store";

export default async function ProfilePage() {
  const session = await getAuthSession();

  if (!session) {
    return <ProfileView session={null} lots={[]} />;
  }

  let lots: Awaited<ReturnType<typeof listProfileAuctions>> = [];
  let hasDatabaseError = false;

  try {
    lots = await listProfileAuctions(session.walletAddress);
  } catch {
    hasDatabaseError = true;
  }

  return (
    <ProfileView
      session={session}
      lots={lots}
      hasDatabaseError={hasDatabaseError}
    />
  );
}
