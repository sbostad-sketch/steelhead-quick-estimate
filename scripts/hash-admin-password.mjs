import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash:admin -- '<password>'");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const derived = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${derived}`);
