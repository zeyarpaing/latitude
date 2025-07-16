import CacheManager from '$lib/cache_manager'
import QueryResult from '@latitude-data/query_result'
import { QueryRequest } from '@latitude-data/source-manager'

class QueryCache {
  private cache: CacheManager

  constructor() {
    this.cache = new CacheManager()
  }

  public find({ queryPath, params }: QueryRequest, ttl?: number) {
    const key = this.createKey({ queryPath, params })

    try {
      const json = this.cache.find(key, ttl)
      if (!json) {
        return null
      }

      const result = QueryResult.fromJSON(json)

      // Additional validation: check if result is suspiciously empty when we expected cached data
      if (
        result.rowCount === 0 &&
        result.rows.length === 0 &&
        result.fields.length === 0
      ) {
        console.warn(
          'Cache returned empty QueryResult - possible corruption for query:',
          queryPath,
        )
      }

      return null
    } catch (error) {
      return null
    }
  }

  public set({ queryPath, params }: QueryRequest, queryResult: QueryResult) {
    const key = this.createKey({ queryPath, params })

    try {
      if (queryResult.rowCount === 0 && queryResult.rows.length === 0) {
        console.warn(
          'Attempting to cache empty QueryResult for query:',
          queryPath,
          'SKIPPING',
        )
        return
      }

      const jsonString = queryResult.toJSON()
      this.cache.set(key, jsonString)
    } catch (error) {
      console.error('Cache set operation failed for query:', queryPath, error)
    }
  }

  private createKey({ queryPath, params }: QueryRequest) {
    return `${queryPath}__${Object.entries(params ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join('__')}`
  }
}

export default new QueryCache()
