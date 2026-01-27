import { EmailIntegration } from "./integrations/EmailIntegration";
import { DiscordIntegration } from "./integrations/DiscordIntegration";
import { SlackIntegration } from "./integrations/SlackIntegration";
import { CustomWebhookIntegration } from "./integrations/CustomWebhookIntegration";

export function NotificationChannelsConfig() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
      <EmailIntegration />
      <DiscordIntegration />
      <SlackIntegration />
      <CustomWebhookIntegration />
    </div>
  );
}
