/**
 * Chats screen — lives at the /chats URL.
 *
 * The root index (/) is now the landing page; this file owns the
 * chat-list route so it gets a clean URL and the desktop shell can
 * wrap it properly with the sidebar + split panel.
 */
import { ChatsScreen } from "./index";

export { ChatsListPanel } from "./index";

export default function ChatsRoute() {
  return <ChatsScreen />;
}
