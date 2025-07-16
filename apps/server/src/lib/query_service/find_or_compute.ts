import QueryResult from '@latitude-data/query_result'
import sourceManager from '$lib/server/sourceManager'
import { type CompiledQuery } from '@latitude-data/source-manager'
import cache from './query_cache'

export default async function findOrCompute({
  query,
  queryParams,
  force,
}: {
  query: string
  queryParams: Record<string, unknown>
  force: boolean
}): Promise<{
  queryResult: QueryResult
  compiledQuery: CompiledQuery
}> {
  const source = await sourceManager.loadFromQuery(query)
  const { config } = await source.getMetadataFromQuery(query)
  const compiledQuery = await source.compileQuery({
    queryPath: query,
    params: queryParams,
  })

  const request = {
    queryPath: compiledQuery.sql,
    params: compiledQuery.accessedParams,
  }

  const compute = async () => {
    const queryResult = await source.runCompiledQuery(compiledQuery)
    cache.set(request, queryResult)
    return queryResult
  }

  let queryResult
  if (force) {
    queryResult = await compute()
  } else {
    const cacheResult = cache.find(request, config.ttl)
    if (cacheResult) {
      console.log('Cache Hit : Returning cached result')
      queryResult = cacheResult
    } else {
      console.log('Cache Miss : Running the query')
      const timeStart = performance.now()
      const computeResult = await compute()
      const timeEnd = performance.now()
      console.log(`>> Query ${query} took ${timeEnd - timeStart}ms`)
      queryResult = computeResult
    }
  }

  return {
    queryResult,
    compiledQuery,
  }
}
