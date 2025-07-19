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

const MAX_BYTES_PER_BATCH = 80 * 1024 // 80KB

function getByteLength(pair: { user: string; assistant: string }): number {
  const encoder = new TextEncoder()
  return (
    encoder.encode(pair.user || "").length +
    encoder.encode(pair.assistant || "").length
  )
}

export function batchMessagePairsByByteLength(
  messagePairs: { user: string; assistant: string; final_hash: string }[],
  maxBytes = MAX_BYTES_PER_BATCH
) {
  const batches: (typeof messagePairs)[] = []
  let currentBatch: typeof messagePairs = []
  let currentBytes = 0

  for (const pair of messagePairs) {
    const pairBytes = getByteLength(pair)

    // If pair is too large, push existing batch and isolate this pair
    if (pairBytes > maxBytes) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
        currentBytes = 0
      }
      batches.push([pair])
      continue
    }

    if (currentBytes + pairBytes > maxBytes) {
      batches.push(currentBatch)
      currentBatch = []
      currentBytes = 0
    }

    currentBatch.push(pair)
    currentBytes += pairBytes
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  return batches
}
