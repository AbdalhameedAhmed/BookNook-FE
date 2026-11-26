/**
 * "Ask Instinct": opens the user's own Instinct chat on WhatsApp or Telegram with a ready message that
 * sends the assistant to Rfoof's home page (public, no sign-in) to pick books with links.
 * Rfoof sends nothing itself: the user picks the chat and presses send.
 */
export const ASSISTANT_NAME = 'Instinct';

export type ChatApp = 'whatsapp' | 'telegram';

export const MAX_INTERESTS = 300;

export function buildInstinctMessage({ interests, siteUrl, governorateName, language }: {
  interests: string;
  siteUrl: string;
  governorateName?: string;
  language: 'en' | 'ar';
}) {
  const wish = interests.trim().replace(/\s+/g, ' ').slice(0, MAX_INTERESTS);
  if (language === 'ar') {
    return [
      `أهلاً ${ASSISTANT_NAME}! بدوّر على كتب مستعملة على رفوف.`,
      `اللي بحب أقراه: ${wish}`,
      governorateName ? `أنا في ${governorateName}، فياريت تفضّل الكتب اللي هناك علشان أقدر أستلمها.` : '',
      `ادخل على الموقع وشوف الكتب المتاحة دلوقتي: ${siteUrl}`,
      'واقترح عليا أنسب ٣ إلى ٥ كتب ليا، مع سبب قصير لكل كتاب ولينك صفحته على رفوف. لو مفيش حاجة مناسبة قولّي.',
    ].filter(Boolean).join('\n');
  }
  return [
    `Hi ${ASSISTANT_NAME}! I’m looking for used books on Rfoof.`,
    `What I like to read: ${wish}`,
    governorateName ? `I’m in ${governorateName}, so please prefer books there so I can pick them up.` : '',
    `Please open the site and look at the books available right now: ${siteUrl}`,
    'Then suggest the 3 to 5 books that suit me best, with a short reason and the Rfoof link for each. If nothing fits, tell me.',
  ].filter(Boolean).join('\n');
}

/** Opens the app's share screen with the message filled in; the user picks their Instinct chat. */
export function chatShareUrl(app: ChatApp, message: string, siteUrl: string) {
  if (app === 'whatsapp') return `https://wa.me/?text=${encodeURIComponent(message)}`;
  // Telegram's share link needs a url; the message already carries it, so the text goes alongside.
  return `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(message)}`;
}
