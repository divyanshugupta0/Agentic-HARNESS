import { CONVERSATION_GROUPS } from '../constants/navigation';

/**
 * Groups an array of conversations by relative timeframe (Today, Yesterday, Previous 7 Days, Older)
 * @param {Array} conversations - List of conversation items with updatedAt timestamps
 * @returns {Object} Grouped conversations dictionary
 */
export function groupConversationsByDate(conversations = []) {
  const groups = {
    [CONVERSATION_GROUPS.TODAY]: [],
    [CONVERSATION_GROUPS.YESTERDAY]: [],
    [CONVERSATION_GROUPS.PREVIOUS_7_DAYS]: [],
    [CONVERSATION_GROUPS.OLDER]: []
  };

  const now = new Date();
  const todayStr = now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updatedAt || Date.now());
    const convDateStr = convDate.toDateString();

    if (convDateStr === todayStr) {
      groups[CONVERSATION_GROUPS.TODAY].push(conv);
    } else if (convDateStr === yesterdayStr) {
      groups[CONVERSATION_GROUPS.YESTERDAY].push(conv);
    } else if (convDate > sevenDaysAgo) {
      groups[CONVERSATION_GROUPS.PREVIOUS_7_DAYS].push(conv);
    } else {
      groups[CONVERSATION_GROUPS.OLDER].push(conv);
    }
  });

  return groups;
}

/**
 * Formats a timestamp into a friendly short clock time (e.g. "04:30 PM")
 */
export function formatClockTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
