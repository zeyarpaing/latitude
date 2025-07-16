import Adapter from './adapter'
import fs from 'fs'
import { createHash } from 'crypto'

const CACHE_ROOT = process.env['LATITUDE_PROJECT_ROOT'] || '/tmp'

export default class FileAdapter extends Adapter {
  private root: string

  constructor(root: string = CACHE_ROOT) {
    super()

    this.root = `${root}/.latitude`

    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root)
    }
  }

  public get(key: string, ttl?: number) {
    try {
      const cachePath = `${this.root}/${this.getHashedKey(key)}`
      console.log('Cache Path : ', cachePath)
      if (ttl) {
        console.log('TTL : ', ttl)
        const stats = fs.statSync(cachePath)
        if (Date.now() - stats.mtimeMs > ttl * 1000) {
          console.log('Cache expired for key:', key)
          return null
        }
      }
      console.log('Reading file : ', cachePath)
      const content = fs.readFileSync(cachePath, 'utf8')

      if (!content || content.trim().length === 0) {
        console.error('Cache file is empty for key:', key)
        return null
      }

      try {
        JSON.parse(content)
      } catch (parseError) {
        console.error(
          'Cache file contains invalid JSON for key:',
          key,
          'Error:',
          parseError,
        )

        try {
          fs.unlinkSync(cachePath)
          console.log('Deleted corrupted cache file:', cachePath)
        } catch (deleteError) {
          console.error('Failed to delete corrupted cache file:', deleteError)
        }
        return null
      }

      return content
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException
      if (fsError.code === 'ENOENT') {
        console.log('Cache file not found for key:', key)
        return null
      }

      console.error(
        'Cache read error for key:',
        key,
        'Error code:',
        fsError.code,
        'Message:',
        fsError.message,
      )

      return null
    }
  }

  public set(key: string, value: string | Blob) {
    const hashKey = this.getHashedKey(key)
    const cachePath = `${this.root}/${hashKey}`
    const content = value.toString()

    try {
      if (!content || content.trim().length === 0) {
        console.error('Attempting to cache empty content for key:', key)
        return
      }

      // Write to temporary file first, then rename (atomic operation)
      const tempPath = `${cachePath}.tmp`
      fs.writeFileSync(tempPath, content)
      fs.renameSync(tempPath, cachePath)

      console.log(
        'Successfully cached content for key:',
        hashKey,
        'Size:',
        content.length,
        'bytes',
      )
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException
      const errorCode = fsError.code
      const errorMessage = fsError.message

      console.error(
        'Cache write failed for key:',
        key,
        'Error code:',
        errorCode,
        'Message:',
        errorMessage,
      )

      if (errorCode === 'ENOSPC') {
        console.error(
          'CRITICAL: No space left on device for cache. This may cause 0 rows responses!',
        )
      } else if (errorCode === 'EMFILE' || errorCode === 'ENFILE') {
        console.error(
          'CRITICAL: Too many open files. This may cause cache failures!',
        )
      } else if (errorCode === 'EACCES') {
        console.error(
          'CRITICAL: Permission denied writing to cache. Check file permissions!',
        )
      }

      try {
        const tempPath = `${cachePath}.tmp`
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath)
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }
  }

  private getHashedKey(key: string) {
    return createHash('sha256').update(key).digest('hex')
  }
}
