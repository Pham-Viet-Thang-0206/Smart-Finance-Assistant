const fs = require('fs');
const path = require('path');

const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

async function main() {
  const response = await fetch(NGROK_API);
  if (!response.ok) {
    throw new Error(`Ngrok API error: ${response.status}`);
  }

  const data = await response.json();
  const tunnels = Array.isArray(data.tunnels) ? data.tunnels : [];
  const httpsTunnel =
    tunnels.find((tunnel) => tunnel.public_url?.startsWith('https://')) ?? tunnels[0];

  if (!httpsTunnel?.public_url) {
    throw new Error('No active ngrok tunnel found. Run "ngrok http 4000" first.');
  }

  const envPath = path.resolve(__dirname, '..', '.env');
  const nextLine = `EXPO_PUBLIC_API_BASE_URL=${httpsTunnel.public_url}`;

  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  }

  let found = false;
  lines = lines.map((line) => {
    if (line.startsWith('EXPO_PUBLIC_API_BASE_URL=')) {
      found = true;
      return nextLine;
    }
    return line;
  });

  if (!found) {
    lines.push(nextLine);
  }

  const trimmed = lines.filter((line, index) => {
    if (index === lines.length - 1) {
      return line.trim().length > 0;
    }
    return true;
  });

  fs.writeFileSync(envPath, `${trimmed.join('\n')}\n`);
  console.log(`Updated .env -> ${httpsTunnel.public_url}`);
}

main().catch((error) => {
  console.error('Failed to update .env:', error.message);
  process.exit(1);
});
