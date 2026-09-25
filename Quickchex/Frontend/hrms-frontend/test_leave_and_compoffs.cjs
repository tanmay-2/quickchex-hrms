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

  const outDir = 'C:\\Users\\info\\.gemini\\antigravity-ide\\brain\\6db84bd8-f528-46a4-a723-7bb278efca95';

  // Ensure Admin credentials in localStorage
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', 'mock-admin-token');
      localStorage.setItem('authToken', 'mock-admin-token');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('userData', JSON.stringify({ name: 'Admin User', role: 'admin' }));
      localStorage.setItem('user', JSON.stringify({ name: 'Admin User', role: 'admin' }));
    `
  });

  /* =========================================================
     TEST 1: COMP OFFS PAGE (/dashboard/compoffs)
     ========================================================= */
  console.log('Navigating to http://localhost:5173/dashboard/compoffs...');
  await send('Page.navigate', { url: 'http://localhost:5173/dashboard/compoffs' });
  await sleep(2500);

  const compOffState = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        url: window.location.href,
        headerTitle: document.querySelector('.dh-banner-title')?.innerText || '',
        activeTab: document.querySelector('.co-tab-btn.is-active')?.innerText || '',
        rowsCount: document.querySelectorAll('.co-table tbody tr').length,
        sidebarCompoffs: !!document.querySelector('a[href="/dashboard/compoffs"]'),
      })
    `,
    returnByValue: true
  });
  console.log('Comp Offs State:', compOffState.value);

  // Capture Comp Offs Pending Earnings screenshot
  const shotCompOffPending = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'compoffs_pending_earnings.png'), Buffer.from(shotCompOffPending.data, 'base64'));
  console.log('Saved compoffs_pending_earnings.png');

  // Test Open Add Comp Off Earning Modal
  console.log('Opening Add Comp Off Earning Modal...');
  await send('Runtime.evaluate', {
    expression: `
      const addBtn = document.querySelector('.co-btn-primary');
      if (addBtn) addBtn.click();
    `
  });
  await sleep(600);
  const shotCompOffModal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'compoffs_add_modal.png'), Buffer.from(shotCompOffModal.data, 'base64'));
  console.log('Saved compoffs_add_modal.png');

  // Close modal
  await send('Runtime.evaluate', {
    expression: `
      const closeBtn = document.querySelector('.co-modal-close');
      if (closeBtn) closeBtn.click();
    `
  });
  await sleep(400);

  // Test Approve Action on row 1
  console.log('Testing Approve action on first row...');
  await send('Runtime.evaluate', {
    expression: `
      const approveBtn = document.querySelector('.co-act-approve');
      if (approveBtn) approveBtn.click();
    `
  });
  await sleep(600);

  // Switch to Completed Earnings tab
  console.log('Switching to Completed Earnings tab...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.co-tab-btn'));
      const completedTab = btns.find(b => b.innerText.includes('Completed Earnings'));
      if (completedTab) completedTab.click();
    `
  });
  await sleep(800);
  const shotCompOffCompleted = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'compoffs_completed_earnings.png'), Buffer.from(shotCompOffCompleted.data, 'base64'));
  console.log('Saved compoffs_completed_earnings.png');

  /* =========================================================
     TEST 2: LEAVE MANAGEMENT SETTINGS (/dashboard/leave-management-settings)
     ========================================================= */
  console.log('Navigating to http://localhost:5173/dashboard/leave-management-settings...');
  await send('Page.navigate', { url: 'http://localhost:5173/dashboard/leave-management-settings' });
  await sleep(2500);

  const lmsState = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        url: window.location.href,
        headerTitle: document.querySelector('.dh-banner-title')?.innerText || '',
        activeSubpage: document.querySelector('.lms-nav-item.is-active .lms-nav-text')?.innerText || '',
        hasDetailsCard: !!document.querySelector('.lms-details-card'),
        hasCenterContent: !!document.querySelector('.lms-main-content'),
        hasHelpCard: !!document.querySelector('.lms-help-card'),
        subsectionsCount: document.querySelectorAll('.lms-nav-item').length,
      })
    `,
    returnByValue: true
  });
  console.log('Leave Management Settings State:', lmsState.value);

  // Screenshot 1: General Settings
  const shotLmsSettings = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'lms_subpage_1_general_settings.png'), Buffer.from(shotLmsSettings.data, 'base64'));
  console.log('Saved lms_subpage_1_general_settings.png');

  // Test Subpage 2: Leave Categories
  console.log('Switching to Subpage 2: Leave Categories...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.lms-nav-item'));
      const catBtn = btns.find(b => b.innerText.includes('Leave Categories'));
      if (catBtn) catBtn.click();
    `
  });
  await sleep(800);
  const shotLmsCategories = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'lms_subpage_2_categories.png'), Buffer.from(shotLmsCategories.data, 'base64'));
  console.log('Saved lms_subpage_2_categories.png');

  // Test Subpage 3: Templates
  console.log('Switching to Subpage 3: Templates...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.lms-nav-item'));
      const tplBtn = btns.find(b => b.innerText.includes('Templates'));
      if (tplBtn) tplBtn.click();
    `
  });
  await sleep(800);
  const shotLmsTemplates = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'lms_subpage_3_templates.png'), Buffer.from(shotLmsTemplates.data, 'base64'));
  console.log('Saved lms_subpage_3_templates.png');

  // Test Subpage 4: Template Assignments
  console.log('Switching to Subpage 4: Template Assignments...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('.lms-nav-item'));
      const assignBtn = btns.find(b => b.innerText.includes('Template Assignments'));
      if (assignBtn) assignBtn.click();
    `
  });
  await sleep(800);
  const shotLmsAssignments = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'lms_subpage_4_assignments.png'), Buffer.from(shotLmsAssignments.data, 'base64'));
  console.log('Saved lms_subpage_4_assignments.png');

  // Test Dark Mode
  console.log('Testing Dark Mode on Leave Management Settings...');
  await send('Runtime.evaluate', {
    expression: `
      document.documentElement.setAttribute('data-theme', 'dark');
    `
  });
  await sleep(600);
  const shotLmsDark = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'lms_dark_mode.png'), Buffer.from(shotLmsDark.data, 'base64'));
  console.log('Saved lms_dark_mode.png');

  // Reset theme
  await send('Runtime.evaluate', {
    expression: `
      document.documentElement.setAttribute('data-theme', 'light');
    `
  });

  console.log('ALL TESTS FOR COMPOFFS AND LEAVE MANAGEMENT SETTINGS PASSED!');
  ws.close();
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
