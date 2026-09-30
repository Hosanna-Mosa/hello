import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NotFoundPage() {
  usePageTitle("Not found");
  return (
    <Card>
      <EmptyState
        icon="alert"
        title="Page not found"
        description="That page doesn't exist in the admin panel."
        action={<ButtonLink to="/" variant="primary">Back to dashboard</ButtonLink>}
      />
    </Card>
  );
}
