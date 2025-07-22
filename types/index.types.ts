export type ReinjectionResponse = {
  _rjc: string
  suggestion: {
    id: string
    similarity: number
    theme: string
    topics: string[]
    session: {
      id: string
      platform: string
    }
    threads_count: number
    threads: Array<{
      id: string
      name: string
      summary: string
      status: string
      created_at: string
      token_count: number
    }>
    created_at: string
  }
}
