import { ProfileView } from "@/components/views/profile-view";
import { getAuthSession } from "@/lib/marketplace/auth";
import { listProfileAuctions } from "@/lib/marketplace/auction-store";

export default async function ProfilePage() {
  const session = await getAuthSession();

  if (!session) {
    return <ProfileView session={null} lots={[]} />;
  }

  try {
    const lots = await listProfileAuctions(session.walletAddress);
    return <ProfileView session={session} lots={lots} />;
  } catch {
    return <ProfileView session={session} lots={[]} hasDatabaseError />;
  }
}

