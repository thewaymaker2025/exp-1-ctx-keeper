export type BaseResponseType<T> = {
  message: string
  data?: T
}

export const extractAxiosResponseData = <T>(
  res: any | null,
  type: "success" | "error"
) => {
  if (type === "error") {
    return res?.response?.data as BaseResponseType<T>
  }
  return res as BaseResponseType<T>
}

export function formatRawString(str: string) {
  try {
    return str
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\") // Process escaped backslashes last
  } catch (error) {
    console.error("Error formatting string:", error)
    return str
  }
}

export async function copyAndPaste(
  textToCopy: string,
  targetElement: HTMLElement
) {
  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy)

    // Immediately paste to target element
    if (
      targetElement.tagName === "INPUT" ||
      targetElement.tagName === "TEXTAREA"
    ) {
      targetElement.value = textToCopy
      targetElement.focus()
    } else {
      targetElement.innerHTML = textToCopy
    }

    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: textToCopy
    })
    targetElement.dispatchEvent(inputEvent)

    // Trigger events to simulate real paste
    targetElement.dispatchEvent(new Event("paste", { bubbles: true }))
    targetElement.dispatchEvent(new Event("input", { bubbles: true }))
  } catch (error) {
    console.error("Copy/paste failed:", error)
  }
}
