/**
 * Account deletion — the URL entered in Play Console's "Delete account URL".
 * Google Play requires it to name the app, give the steps, and say what is
 * deleted, what is kept, and for how long. All four are on this page.
 */

import { PageHero } from "@/components/legal/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/config/site";
import { DataFateCard } from "@/features/deleteAccount/DataFateCard";
import { DeleteAccountForm } from "@/features/deleteAccount/DeleteAccountForm";
import { InAppSteps } from "@/features/deleteAccount/InAppSteps";
import { usePageTitle } from "@/hooks/usePageTitle";

const DELETED = [
  "Your profile — name, birthday, gender, avatar, interests and bio",
  "Your phone number and location",
  "Your matches, likes and message requests",
  "Your messages, voice messages and call history",
  "Your settings and sign-in sessions",
];

const KEPT = [
  "Reports you filed or that were filed about you — kept only as long as needed for safety and legal obligations",
  "Records we must keep by law, such as purchase records held by Google Play",
];

export default function DeleteAccountPage() {
  usePageTitle("Delete your account");

  return (
    <>
      <PageHero
        eyebrow="Your data"
        title={`Delete your ${site.appName} account`}
        summary={`You can delete your ${site.appName} account and its data at any time — in the app, or right here on the web.`}
        meta={<>Developer: {site.company} · App: {site.appName} ({site.androidPackage})</>}
      />
      <Section>
        <Container className="grid items-start gap-6 lg:grid-cols-2">
          <InAppSteps />
          <DeleteAccountForm />
        </Container>
      </Section>
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="What happens next"
            title="What's deleted, and when"
            description={`Your profile disappears and you're signed out immediately. After ${site.deletionGraceDays} days, everything below is permanently erased. Sign in again within those ${site.deletionGraceDays} days to restore your account.`}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <DataFateCard icon="trash" tone="danger" title={`Erased after ${site.deletionGraceDays} days`} items={DELETED} />
            <DataFateCard icon="shield" tone="secondary" title="Kept for safety or by law" items={KEPT} />
          </div>
          <p className="mt-8 text-sm text-muted">
            Want your data deleted without deleting your account, or need help? Email{" "}
            <a className="font-medium text-primary-deep hover:underline" href={`mailto:${site.privacyEmail}`}>
              {site.privacyEmail}
            </a>{" "}
            from a message that includes your account's phone number.
          </p>
        </Container>
      </Section>
    </>
  );
}
