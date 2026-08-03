/**
 * MAX subscriptions and callback buttons are handled by the backend webhook.
 * Keeping a second long-polling consumer here would conflict with that active
 * subscription, so the bots container only records that webhook mode is on.
 */
export function startMaxBot(_token: string): void {
  console.log('[max-bot] Webhook mode enabled; updates are handled by backend');
}
