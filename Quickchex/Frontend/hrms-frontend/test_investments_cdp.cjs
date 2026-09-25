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
        if (page && page.webSocketDebuggerUrl) {
          resolve(page.webSocketDebuggerUrl);
        } else {
          reject(new Error('No page target found'));
        }
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

  return new Promise((resolve) => {
    ws.onopen = () => resolve({ ws, send });
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const wsUrl = await getWsUrl();
  console.log('Connecting to Chrome CDP at:', wsUrl);
  const { ws, send } = await createCdpClient(wsUrl);

  await send('Page.enable');
  await send('Runtime.enable');

  // Set auth tokens in localStorage to stay logged in as Admin
  console.log('Setting admin auth tokens...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', 'mock-admin-token-investments');
      localStorage.setItem('authToken', 'mock-admin-token-investments');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('userData', JSON.stringify({ name: 'Admin User', role: 'admin' }));
      localStorage.setItem('user', JSON.stringify({ name: 'Admin User', role: 'admin' }));
    `
  });

  // Navigate to /dashboard/investments
  console.log('Navigating to http://localhost:5173/dashboard/investments...');
  await send('Page.navigate', { url: 'http://localhost:5173/dashboard/investments' });
  await sleep(2500);

  // Check current URL and DOM
  const checkState = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        url: window.location.href,
        title: document.title,
        hasHeaderTitle: document.querySelector('.dh-banner-title')?.innerText || '',
        hasHeaderSub: document.querySelector('.dh-banner-sub')?.innerText || '',
        hasDetailsCard: !!document.querySelector('.inv-details-card'),
        hasCenterContent: !!document.querySelector('.inv-main-content'),
        hasHelpCard: !!document.querySelector('.inv-help-card'),
        activeNavItem: document.querySelector('.inv-nav-item.is-active .inv-nav-text')?.innerText || '',
        settingsTitle: document.querySelector('.inv-content-title')?.innerText || '',
        sidebarInvestments: !!document.querySelector('a[href="/dashboard/investments"]'),
      })
    `,
    returnByValue: true
  });
  console.log('Page State (General Settings):', checkState.value);

  // Take screenshot of General Settings
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const outDir = 'C:\\Users\\info\\.gemini\\antigravity-ide\\brain\\6db84bd8-f528-46a4-a723-7bb278efca95';
  fs.writeFileSync(path.join(outDir, 'investments_subpage_settings.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved investments_subpage_settings.png');

  // Test Subpage 2: Templates
  console.log('Switching to Subpage 2: Templates...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.inv-nav-item'));
      const tplBtn = btns.find(b => b.innerText.includes('Templates'));
      if (tplBtn) tplBtn.click();
    `
  });
  await sleep(1000);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_subpage_templates.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Saved investments_subpage_templates.png');

  // Open Add Template modal
  console.log('Opening Add Template Modal...');
  await send('Runtime.evaluate', {
    expression: `
      const addBtn = Array.from(document.querySelectorAll('.inv-btn-primary')).find(b => b.innerText.includes('Add Template'));
      if (addBtn) addBtn.click();
    `
  });
  await sleep(600);
  const shotModal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_modal_add_template.png'), Buffer.from(shotModal.data, 'base64'));
  console.log('Saved investments_modal_add_template.png');

  // Close modal
  await send('Runtime.evaluate', {
    expression: `
      const closeBtn = document.querySelector('.inv-modal-close');
      if (closeBtn) closeBtn.click();
    `
  });
  await sleep(500);

  // Test Subpage 3: Template Assignments
  console.log('Switching to Subpage 3: Template Assignments...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.inv-nav-item'));
      const assignBtn = btns.find(b => b.innerText.includes('Template Assignments'));
      if (assignBtn) assignBtn.click();
    `
  });
  await sleep(1000);
  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_subpage_assignments.png'), Buffer.from(shot3.data, 'base64'));
  console.log('Saved investments_subpage_assignments.png');

  // Test Subpage 4: Sections & Limits
  console.log('Switching to Subpage 4: Investment Sections & Limits...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.inv-nav-item'));
      const secBtn = btns.find(b => b.innerText.includes('Sections'));
      if (secBtn) secBtn.click();
    `
  });
  await sleep(1000);
  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_subpage_sections.png'), Buffer.from(shot4.data, 'base64'));
  console.log('Saved investments_subpage_sections.png');

  // Test Subpage 5: Submissions & Proofs
  console.log('Switching to Subpage 5: Submissions & Proofs...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.inv-nav-item'));
      const subBtn = btns.find(b => b.innerText.includes('Submissions'));
      if (subBtn) subBtn.click();
    `
  });
  await sleep(1000);
  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_subpage_submissions.png'), Buffer.from(shot5.data, 'base64'));
  console.log('Saved investments_subpage_submissions.png');

  // Open Review modal on first submission
  console.log('Opening Review modal on submission...');
  await send('Runtime.evaluate', {
    expression: `
      const reviewBtn = document.querySelector('.inv-btn-review');
      if (reviewBtn) reviewBtn.click();
    `
  });
  await sleep(700);
  const shotReview = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_modal_review_proof.png'), Buffer.from(shotReview.data, 'base64'));
  console.log('Saved investments_modal_review_proof.png');

  // Close review modal
  await send('Runtime.evaluate', {
    expression: `
      const closeBtn = document.querySelector('.inv-modal-close');
      if (closeBtn) closeBtn.click();
    `
  });
  await sleep(500);

  // Test Dark Mode
  console.log('Testing Dark Mode...');
  await send('Runtime.evaluate', {
    expression: `
      document.documentElement.setAttribute('data-theme', 'dark');
    `
  });
  await sleep(700);
  const shotDark = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'investments_dark_mode.png'), Buffer.from(shotDark.data, 'base64'));
  console.log('Saved investments_dark_mode.png');

  // Reset theme
  await send('Runtime.evaluate', {
    expression: `
      document.documentElement.setAttribute('data-theme', 'light');
    `
  });

  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
  ws.close();
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
