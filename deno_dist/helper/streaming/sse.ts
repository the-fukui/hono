import type { Context } from '../../context.ts'
import { StreamingApi } from '../../utils/stream.ts'

export interface SSEMessage {
  data: string
  event?: string
  id?: string
  retry?: number
}

export class SSEStreamingApi extends StreamingApi {
  constructor(writable: WritableStream, readable: ReadableStream) {
    super(writable, readable)
  }

  async writeSSE(message: SSEMessage) {
    const data = message.data
      .split('\n')
      .map((line) => {
        return `data: ${line}`
      })
      .join('\n')

    const sseData =
      [
        message.event && `event: ${message.event}`,
        data,
        message.id && `id: ${message.id}`,
        message.retry && `retry: ${message.retry}`,
      ]
        .filter(Boolean)
        .join('\n') + '\n\n'

    await this.write(sseData)
  }
}

const setSSEHeaders = (context: Context) => {
  context.header('Transfer-Encoding', 'chunked')
  context.header('Content-Type', 'text/event-stream')
  context.header('Cache-Control', 'no-cache')
  context.header('Connection', 'keep-alive')
}

export const streamSSE = (c: Context, cb: (stream: SSEStreamingApi) => Promise<void>) => {
  const { readable, writable } = new TransformStream()
  const stream = new SSEStreamingApi(writable, readable)
  cb(stream).finally(() => stream.close())
  setSSEHeaders(c)
  return c.newResponse(stream.responseReadable)
}
