import { useParams } from "react-router";

import { AsyncContent } from "@/components/ui/AsyncContent";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserActivityCard } from "@/features/users/UserActivityCard";
import { UserPaymentsCard } from "@/features/users/UserPaymentsCard";
import { UserPremiumCard } from "@/features/users/UserPremiumCard";
import { UserProfileCard } from "@/features/users/UserProfileCard";
import { UserSafetyCard } from "@/features/users/UserSafetyCard";
import { useAsync } from "@/hooks/useAsync";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usersService } from "@/services/admin.service";
import type { AdminUserDetail } from "@/types/admin";

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const { data, error, loading, reload, setData } = useAsync(() => usersService.get(id), [id]);
  // An action answers with the user as the server now has it; show exactly that.
  const changed = (next?: AdminUserDetail) => (next ? setData(next) : reload());
  usePageTitle(data?.name || "User");

  return (
    <>
      <PageHeader
        title="User details"
        actions={
          <ButtonLink to="/users" icon={<Icon name="arrowLeft" size={16} />}>
            All users
          </ButtonLink>
        }
      />
      <AsyncContent data={data} loading={loading} error={error} onRetry={reload}>
        {(user) => (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <UserProfileCard user={user} />
              <UserPaymentsCard payments={user.payments} />
            </div>
            <div className="flex flex-col gap-6">
              <UserSafetyCard user={user} onChanged={changed} />
              <UserPremiumCard user={user} onChanged={changed} />
              <UserActivityCard counts={user.counts} />
            </div>
          </div>
        )}
      </AsyncContent>
    </>
  );
}
