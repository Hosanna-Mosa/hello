import { Spinner } from "@/components/ui/Spinner";

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center text-primary">
      <Spinner size="lg" />
    </div>
  );
}
