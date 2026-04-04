export const GROUP_CONVERSATION_ID = "group";
export const ONLINE_THRESHOLD_MS = 90 * 1000;

export function getDirectConversationId(userId) {
  return `direct:${Number(userId)}`;
}

export function isUserOnline(lastSeenAt) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;
}

export function serializeTimestamp(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}
