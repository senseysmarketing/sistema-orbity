import { EmailIntegration } from "./integrations/EmailIntegration";

export function NotificationChannelsConfig() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1">
      <EmailIntegration />
    </div>
  );
}
