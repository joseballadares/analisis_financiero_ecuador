declare module "pg-copy-streams" {
  import type { Writable } from "node:stream";
  export function from(sql: string): Writable;
}
