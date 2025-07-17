import md5 from "md5"

export function conversationsWithHashes(
  props: Array<{
    user: string
    assistant: string
  }>
) {
  return props.map((item) => ({
    ...item,
    final_hash: md5(item.user + item.assistant)
  }))
}
