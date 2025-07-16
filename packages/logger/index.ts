import fs from 'fs'
import path from 'path'

export class Logger {
  private readonly writer: fs.WriteStream | null

  constructor(outputPath?: string) {
    // const isDev = process.env.NODE_ENV === 'development'
    // if (!isDev) {
    //   this.writer = null
    // }

    const logPath =
      outputPath ||
      path.join(process.cwd(), `${new Date().toDateString()}-latitude.log`)
    this.writer = fs.createWriteStream(logPath, { flags: 'a' })
  }

  log(message: string) {
    this.writer?.write(`${new Date().toISOString()} | ${message}\n`)
  }

  finish() {
    this.writer?.end()
  }
}
