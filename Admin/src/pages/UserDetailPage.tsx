import { useParams } from "react-router";

import { AsyncContent } from "@/components/ui/AsyncContent";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserActivityCard } from "@/features/users/UserActivityCard";
import { UserProfileCard } from "@/features/users/UserProfileCard";
import { UserSafetyCard } from "@/features/users/UserSafetyCard";
import { useAsync } from "@/hooks/useAsync";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usersService } from "@/services/admin.service";

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const { data, error, loading, reload } = useAsync(() => usersService.get(id), [id]);
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
            <div className="lg:col-span-2">
              <UserProfileCard user={user} />
            </div>
            <div className="flex flex-col gap-6">
              <UserActivityCard counts={user.counts} />
              <UserSafetyCard user={user} onChanged={reload} />
            </div>
          </div>
        )}
      </AsyncContent>
    </>
  );
}
