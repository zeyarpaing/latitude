import handleError from '$lib/errors/handler'
import findOrCompute from '$lib/query_service/find_or_compute'
import getQueryParams from './getQueryParams'
import { Logger } from '@latitude-data/logger'
type Props = { params: { query?: string }; url: URL }

export async function GET({ params: args, url }: Props) {
  try {
    const { params, force, download } = await getQueryParams(url)
    const query = args.query ?? ''
    const logger = new Logger()
    const timeStart = performance.now()
    const { queryResult } = await findOrCompute({
      query,
      queryParams: params,
      force,
    })
    const timeEnd = performance.now()
    logger.log(`>> Query ${query} took ${timeEnd - timeStart}ms`)

    if (download) {
      return new Response(queryResult.toCSV(), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${
            query ?? 'query'
          }.csv"`,
        },
        status: 200,
      })
    } else {
      return new Response(queryResult.toJSON(), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      })
    }
  } catch (e) {
    return handleError(e as Error)
  }
}
