import { AsyncContent } from "@/components/ui/AsyncContent";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignupChart } from "@/features/dashboard/SignupChart";
import { StatsGrid } from "@/features/dashboard/StatsGrid";
import { UserBreakdown } from "@/features/dashboard/UserBreakdown";
import { useAsync } from "@/hooks/useAsync";
import { usePageTitle } from "@/hooks/usePageTitle";
import { statsService } from "@/services/admin.service";

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const { data, error, loading, reload } = useAsync(() => statsService.dashboard(), []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live figures, straight from the database."
        actions={
          <Button variant="secondary" onClick={reload} loading={loading} icon={<Icon name="refresh" size={16} />}>
            Refresh
          </Button>
        }
      />
      <AsyncContent data={data} loading={loading} error={error} onRetry={reload}>
        {(stats) => (
          <div className="flex flex-col gap-6">
            <StatsGrid stats={stats} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SignupChart data={stats.signups} />
              </div>
              <UserBreakdown users={stats.users} />
            </div>
          </div>
        )}
      </AsyncContent>
    </>
  );
}
