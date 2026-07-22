import { PrivacyShell } from "@/components/PrivacyShell";

const configuredIdleMinutes = Number(
  process.env.NEXT_PUBLIC_PRIVACY_IDLE_MINUTES ?? 15,
);
const idleTimeoutMinutes =
  Number.isFinite(configuredIdleMinutes) && configuredIdleMinutes > 0
    ? configuredIdleMinutes
    : 0;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivacyShell idleTimeoutMinutes={idleTimeoutMinutes}>
      {children}
    </PrivacyShell>
  );
}
