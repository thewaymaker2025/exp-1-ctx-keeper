export const CHATGPT_PAGE_SELECTOR_PATH = {
  // Main conversation container
  conversation_container: `div.\\@thread-xl\\/thread\\:pt-header-height.flex.flex-col.text-sm.pb-25`,

  // All conversation articles (both user and assistant messages)
  all_messages: `article[data-testid*="conversation-turn"]`,

  // User message selectors
  user: {
    // All user messages - target the article containing user messages
    messages: `article[data-testid*="conversation-turn"]:has(div[data-message-author-role="user"])`,
    // Content selector - just get the article's innerText
    content_selector: ``
  },

  // Assistant message selectors
  assistant: {
    // All assistant messages - target the article containing assistant messages
    messages: `article[data-testid*="conversation-turn"]:has(div[data-message-author-role="assistant"])`,
    // Content selector - just get the article's innerText
    content_selector: ``,
    // Action buttons within assistant message containers
    action_buttons: `article[data-testid*="conversation-turn"] .agent-turn .mx-\\[var\\(--mini-thread-content-inset\\)\\]`
  }
}
