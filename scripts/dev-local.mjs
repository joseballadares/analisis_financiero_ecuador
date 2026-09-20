// Entorno local completo: base de datos de prueba + servidor del sitio en http://localhost:3000
// Uso:  npm run dev:local     (Ctrl+C para detener todo)
import { spawn } from "node:child_process";
import { LOCAL_URL, startLocalDb } from "./localdb.mjs";

const server = await startLocalDb();
console.log(`Base local lista. Abriendo el sitio en http://localhost:3000 …`);

const env = { ...process.env, NETLIFY_DB_URL: LOCAL_URL };
delete env.NETLIFY_DB_DRIVER;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3000"], { stdio: "inherit", env });

let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  next.kill();
  await server.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", stop);
