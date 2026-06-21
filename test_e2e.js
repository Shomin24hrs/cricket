const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Simple HTTP Server to serve index.html statically
const PORT = 8080;
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'index.html');
  if (req.url === '/package.json') {
    filePath = path.join(__dirname, 'package.json');
  }
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    let contentType = 'text/html';
    if (filePath.endsWith('.json')) contentType = 'application/json';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`[Test] Local server started at http://localhost:${PORT}`);
  
  let browser;
  try {
    // 2. Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Log console errors/messages from the browser
    page.on('console', msg => console.log('[Browser Console]', msg.text()));
    page.on('pageerror', err => console.error('[Browser Error]', err.toString()));

    console.log('[Test] Navigating to page...');
    await page.goto(`http://localhost:${PORT}`);
    
    // Wait for the app to initialize (fbReadyPromise)
    await page.waitForFunction(() => window.__fbReadyFired === true, { timeout: 15000 });
    console.log('[Test] Firebase ready / fallback state resolved.');

    // Let the page settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Fill out registration form
    const firstName = `TestFirst${Date.now()}`;
    const lastName = `TestLast${Date.now()}`;
    
    console.log(`[Test] Filling name fields with ${firstName} ${lastName}...`);
    await page.type('#firstName', firstName);
    await page.type('#lastName', lastName);
    
    const clickHelper = async (selector) => {
      await page.waitForSelector(selector);
      await page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (el) el.click();
        else throw new Error(`Element not found: ${sel}`);
      }, selector);
    };

    console.log('[Test] Choosing "Batting"...');
    // Click on Batting choice
    await clickHelper('#q1Group .choice[data-value="batting"]');
    
    // Wait for follow up to be visible
    await page.waitForSelector('#followupBatting.open', { visible: true });
    
    console.log('[Test] Choosing "Yes" for bowling followup...');
    await clickHelper('#q2BattingGroup .choice[data-value="yes"]');
    
    console.log('[Test] Submitting form...');
    await clickHelper('#submitBtn');
    
    // Wait for success message
    console.log('[Test] Waiting for confirmation message...');
    await page.waitForSelector('#formMsg.show.ok', { timeout: 10000 });
    const successText = await page.$eval('#formMsg.show.ok', el => el.textContent);
    console.log('[Test] Success message text:', successText);
    
    if (!successText.includes('Registration confirmed')) {
      throw new Error(`Unexpected success message: ${successText}`);
    }
    
    // 4. Verify View Roster
    console.log('[Test] Opening View Roster modal...');
    await clickHelper('#openRosterModal');
    
    // Wait for password prompt
    await page.waitForSelector('#rosterModalBackdrop.show', { visible: true });
    console.log('[Test] Entering password "22"...');
    await page.type('#rosterPassword', '22');
    await clickHelper('#confirmRoster');
    
    // Wait for list to load
    await page.waitForSelector('#rosterListStep', { visible: true });
    const rosterText = await page.$eval('#rosterList', el => el.textContent);
    console.log('[Test] Roster list contents:', rosterText);
    
    if (!rosterText.includes(firstName) || !rosterText.includes(lastName)) {
      throw new Error('Registered player not found in roster list!');
    }
    
    console.log('[Test] Closing roster modal...');
    await clickHelper('#closeRosterModal');
    
    // 5. Verify Team Generation
    console.log('[Test] Opening Generate Teams modal...');
    await clickHelper('#openGenerateModal');
    
    await page.waitForSelector('#modalBackdrop.show', { visible: true });
    console.log('[Test] Entering password "22" for team shuffle...');
    await page.type('#adminPassword', '22');
    await clickHelper('#confirmGenerate');
    
    // Since we only have 1 registered player in local mode (unless firebase is active),
    // let's check if the modal displays the minimum players error message or generates.
    // Wait for either modal error or teams section to be visible.
    try {
      await page.waitForSelector('#modalMsg.show', { timeout: 3000 });
      const errorText = await page.$eval('#modalMsg', el => el.textContent);
      console.log('[Test] Received expected generator error (e.g. not enough players):', errorText);
    } catch (e) {
      // If teams are successfully generated (e.g. if we are connected to firebase and it has enough players)
      await page.waitForSelector('#teamsSection', { visible: true });
      console.log('[Test] Teams successfully generated and displayed!');
    }
    
    console.log('E2E test passed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('E2E test FAILED!', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
