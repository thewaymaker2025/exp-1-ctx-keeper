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
