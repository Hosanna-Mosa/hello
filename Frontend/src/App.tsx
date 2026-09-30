/**
 * Routes. The paths are the URLs entered in the Play Console, so they are
 * stable: /privacy-policy, /terms, /delete-account, /child-safety.
 * Common alternative spellings redirect rather than 404.
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { site } from "@/config/site";
import { childSafety } from "@/content/childSafety";
import { guidelines } from "@/content/guidelines";
import { privacyPolicy } from "@/content/privacy";
import { terms } from "@/content/terms";
import ContactPage from "@/pages/ContactPage";
import DeleteAccountPage from "@/pages/DeleteAccountPage";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import PolicyPage from "@/pages/PolicyPage";
import SafetyPage from "@/pages/SafetyPage";

const ALIASES: Record<string, string> = {
  "/privacy": "/privacy-policy",
  "/terms-and-conditions": "/terms",
  "/tos": "/terms",
  "/account-deletion": "/delete-account",
  "/csae": "/child-safety",
  "/guidelines": "/community-guidelines",
  "/support": "/contact",
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="privacy-policy" element={<PolicyPage doc={privacyPolicy} email={site.privacyEmail} />} />
          <Route path="terms" element={<PolicyPage doc={terms} />} />
          <Route path="delete-account" element={<DeleteAccountPage />} />
          <Route path="child-safety" element={<PolicyPage doc={childSafety} email={site.safetyEmail} />} />
          <Route path="community-guidelines" element={<PolicyPage doc={guidelines} />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="contact" element={<ContactPage />} />
          {Object.entries(ALIASES).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
