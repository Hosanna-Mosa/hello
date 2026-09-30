import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { CodeStep } from "@/features/deleteAccount/CodeStep";
import { ConfirmStep } from "@/features/deleteAccount/ConfirmStep";
import { DoneStep } from "@/features/deleteAccount/DoneStep";
import { PhoneStep } from "@/features/deleteAccount/PhoneStep";
import { StepIndicator } from "@/features/deleteAccount/StepIndicator";
import { useAccountDeletion } from "@/features/deleteAccount/useAccountDeletion";

const STEP_INDEX = { phone: 0, code: 1, confirm: 2, done: 3 } as const;

/** Delete an account from the web — for anyone who no longer has the app installed. */
export function DeleteAccountForm() {
  const flow = useAccountDeletion();

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Delete on the web</h2>
      <p className="mt-1 mb-6 text-sm text-muted">No app needed — just the phone number on your account.</p>
      {flow.step !== "done" && <StepIndicator current={STEP_INDEX[flow.step]} />}
      {flow.error && (
        <div className="mb-4">
          <Alert tone="danger">{flow.error}</Alert>
        </div>
      )}
      {flow.step === "phone" && <PhoneStep initial={flow.phone} busy={flow.busy} onSubmit={flow.sendCode} />}
      {flow.step === "code" && (
        <CodeStep phone={flow.phone} busy={flow.busy} onSubmit={flow.verify} onResend={flow.resend} onBack={flow.restart} />
      )}
      {flow.step === "confirm" && <ConfirmStep busy={flow.busy} onConfirm={flow.confirm} onCancel={flow.restart} />}
      {flow.step === "done" && <DoneStep />}
    </Card>
  );
}
