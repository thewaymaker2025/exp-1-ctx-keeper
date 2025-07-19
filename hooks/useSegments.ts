import { useEffect, useState } from "react"

import { getContextSegments } from "~helpers/api"
import { extractAxiosResponseData } from "~utils"

interface Thread {
  id: string
  name: string
  summary: string
  status: string
  is_reinjected: boolean
  token_count: number
  created_at: string
  updated_at: string
}

interface Segment {
  id: string
  theme: string
  topics: string[]
  created_at: string
  updated_at: string
  threads_count: number
  threads: Thread[]
}

interface SegmentsResponse {
  message: string
  data: {
    segments: Segment[]
    pagination: {
      limit: number
      next_cursor: string | null
      has_more: boolean
    }
    metadata: {
      session_id: string
      total_segments: number
      total_threads: number
      include_threads: boolean
    }
  }
}

interface UseSegmentsState {
  segments: Segment[]
  loading: boolean
  error: string | null
  metadata: SegmentsResponse["data"]["metadata"] | null
}

export function useSegments(sessionId: string | null) {
  const [state, setState] = useState<UseSegmentsState>({
    segments: [],
    loading: false,
    error: null,
    metadata: null
  })

  const fetchSegments = async (sessionId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const response = await getContextSegments(sessionId)
      const data = extractAxiosResponseData(response, "success")
        ?.data as unknown as SegmentsResponse["data"]

      setState({
        segments: data.segments,
        loading: false,
        error: null,
        metadata: data.metadata
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch segments"
      }))
    }
  }

  const refetch = () => {
    if (sessionId) {
      fetchSegments(sessionId)
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchSegments(sessionId)
    } else {
      setState({
        segments: [],
        loading: false,
        error: null,
        metadata: null
      })
    }
  }, [sessionId])

  return {
    ...state,
    refetch
  }
}

export type { Segment, Thread, UseSegmentsState }
