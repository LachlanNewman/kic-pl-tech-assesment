import { execSync } from 'child_process';
import path from 'path';

export default function setup() {
  const root = path.resolve(__dirname, '..');
  execSync('./node_modules/.bin/prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
    cwd: root,
    stdio: 'inherit',
  });
}
