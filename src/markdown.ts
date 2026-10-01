import path from "node:path"

export const root = path.join(import.meta.dir, "..")

export interface Document {
  readonly path: string
  readonly frontmatter: {
    readonly name?: string
    readonly description?: string
    readonly "disable-model-invocation"?: boolean
    readonly reminder?: string
  }
  readonly body: string
}

export async function readDocument(file: string): Promise<Document> {
  const text = await Bun.file(file).text()
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!match) return { path: file, frontmatter: {}, body: text }
  return { path: file, frontmatter: Bun.YAML.parse(match[1] ?? "") as Document["frontmatter"], body: text.slice(match[0].length) }
}
