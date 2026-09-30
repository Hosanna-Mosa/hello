import { AsyncContent } from "@/components/ui/AsyncContent";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { UserFilters } from "@/features/users/UserFilters";
import { UsersTable } from "@/features/users/UsersTable";
import { useAsync } from "@/hooks/useAsync";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { usersService } from "@/services/admin.service";
import type { UserStatus } from "@/types/admin";

const KEYS = ["search", "status"] as const;

export default function UsersPage() {
  usePageTitle("Users");
  const { values, page, set } = useSearchParamState(KEYS);
  const status = values.status as UserStatus | "";

  const { data, error, loading, reload } = useAsync(
    () => usersService.list({ page, search: values.search, status }),
    [page, values.search, status],
  );

  return (
    <>
      <PageHeader title="Users" description="Every account in the database. Select one to see its details." />
      <Card padded={false} className="overflow-hidden">
        <UserFilters search={values.search} status={values.status} onChange={set} />
        <AsyncContent data={data} loading={loading} error={error} onRetry={reload}>
          {(result) => (
            <>
              <UsersTable users={result.items} />
              {result.total > 0 && (
                <Pagination page={result.page} pages={result.pages} total={result.total} limit={result.limit} onChange={(p) => set({ page: p })} />
              )}
            </>
          )}
        </AsyncContent>
      </Card>
    </>
  );
}
