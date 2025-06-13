
import { User } from "@supabase/supabase-js";

interface UserProfileInfoProps {
  user: User;
}

export function UserProfileInfo({ user }: UserProfileInfoProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Email</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </div>
  );
}
