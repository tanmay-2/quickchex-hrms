const fs = require('fs');
const path = require('path');
const http = require('http');

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const pages = JSON.parse(data);
        const page = pages.find(p => p.type === 'page' && p.url.includes('localhost:5173')) || pages.find(p => p.type === 'page');
        if (page && page.webSocketDebuggerUrl) resolve(page.webSocketDebuggerUrl);
        else reject(new Error('No page target found'));
      });
    }).on('error', reject);
  });
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };
  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };
  return new Promise((resolve) => { ws.onopen = () => resolve({ ws, send }); });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const wsUrl = await getWsUrl();
  const { ws, send } = await createCdpClient(wsUrl);
  const outDir = 'C:\\Users\\info\\.gemini\\antigravity-ide\\brain\\6db84bd8-f528-46a4-a723-7bb278efca95';

  await send('Page.enable');
  await send('Runtime.enable');

  // Direct navigate with ?tab=assignments
  console.log('Navigating directly to ?tab=assignments...');
  await send('Page.navigate', { url: 'http://localhost:5173/dashboard/leave-management-settings?tab=assignments' });
  await sleep(2500);

  const res = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        url: window.location.href,
        contentTitle: document.querySelector('.lms-content-title')?.innerText || '',
        activeText: document.querySelector('.lms-nav-item.is-active .lms-nav-text')?.innerText || '',
        rowsCount: document.querySelectorAll('.lms-table tbody tr').length,
      })
    `,
    returnByValue: true
  });
  console.log('Subpage 4 evaluation:', res.value);

  const shotAssign = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'lms_subpage_4_assignments.png'), Buffer.from(shotAssign.data, 'base64'));
  console.log('Saved lms_subpage_4_assignments.png');

  ws.close();
}

main().catch(console.error);
