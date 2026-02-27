import { inngest } from "./client";

export const welcomeEmail = inngest.createFunction(
  { id: "welcome-email" },
  { event: "user/signed-up" },
  async ({ event }) => {
    return { sent: true, userId: event.data.userId };
  }
);

export const handleSubscriptionUpgrade = inngest.createFunction(
  { id: "subscription-upgrade" },
  { event: "subscription/updated" },
  async ({ event }) => {
    return { updated: true, userId: event.data.userId };
  }
);

export const monthlyUsageReset = inngest.createFunction(
  { id: "monthly-usage-reset" },
  { cron: "0 0 1 * *" },
  async () => {
    return { reset: true };
  }
);

export const functions = [welcomeEmail, handleSubscriptionUpgrade, monthlyUsageReset];
