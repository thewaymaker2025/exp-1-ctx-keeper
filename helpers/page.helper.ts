import { CHATGPT_PAGE_SELECTOR_PATH } from "~constant/page-extractor"

export function monitorProseMirrorInput(
  cb: (userQuery: string) => void,
  platform: "chatgpt" = "chatgpt"
) {
  const findAndAttachListener = () => {
    const platformInputSelector = {
      chatgpt: CHATGPT_PAGE_SELECTOR_PATH.prompt_input_selector
    }
    const proseMirrorDiv = document.querySelector(
      platformInputSelector[platform]
    ) as HTMLElement

    if (proseMirrorDiv && !proseMirrorDiv.hasAttribute("data-ctx-listener")) {
      proseMirrorDiv.setAttribute("data-ctx-listener", "true")

      // Store the current content as user types
      let currentContent = ""

      proseMirrorDiv.addEventListener("input", () => {
        currentContent = proseMirrorDiv.textContent?.trim() || ""
      })

      proseMirrorDiv.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          // Use the stored content from before the clear
          const userQuery = currentContent

          console.log("🎯 User sending message:", userQuery)

          if (userQuery) {
            setTimeout(() => {
              cb(userQuery)
            }, 1200)
          }
        }
      })

      console.log("✅ Attached listener to ProseMirror editor")
      return true
    }
    return false
  }

  // Try to find the editor immediately
  if (!findAndAttachListener()) {
    // If not found, wait for it to appear
    const observer = new MutationObserver(() => {
      if (findAndAttachListener()) {
        observer.disconnect()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
}

export function getChatPlatform(href: string) {
  let platform: "chatgpt" | "claude" | "grok" = "chatgpt"
  if (href.includes("chat.openai.com")) {
    platform = "chatgpt"
  } else if (href.includes("claude.ai")) {
    platform = "claude"
  } else if (href.includes("grok.ai")) {
    platform = "grok"
  }
  return platform
}
