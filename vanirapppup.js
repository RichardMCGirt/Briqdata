const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1500 });

  console.log('🚀 Navigating to login page...');
  await page.goto('https://admin.crewiq.us/dashboard', {
    waitUntil: 'networkidle2'
  });

  await page.waitForSelector('#userNameOrEmailAddress', { visible: true });

  console.log('⌨️ Typing username...');
  await page.type('#userNameOrEmailAddress', 'admin@vanir.com', { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('⌨️ Typing password...');
  await page.type('#password', '123qwe', { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('🖱️ Clicking login button...');
  await page.click('button.loginBtn');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const containerSelector = '.ant-layout-content';
  await page.waitForSelector(containerSelector);

  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  let segment = 1;

  while (true) {
    console.log(`📸 Capturing segment ${segment}...`);

    const container = await page.$(containerSelector);
    await container.screenshot({
      path: path.join(screenshotDir, `segment-${segment}.png`)
    });

    const canScroll = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
      
        const maxScroll = el.scrollHeight - el.clientHeight;
        const beforeScroll = el.scrollTop;
        el.scrollTop = beforeScroll + el.clientHeight;
      
        return el.scrollTop > beforeScroll && el.scrollTop < maxScroll;
      }, containerSelector);
      
      const scrollInfo = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollTop: el.scrollTop
        };
      }, containerSelector);
      
      console.log(`🔍 Scroll height: ${scrollInfo.scrollHeight}, visible: ${scrollInfo.clientHeight}`);
      
    if (!canScroll) break;

    await new Promise(resolve => setTimeout(resolve, 1000));
    segment++;
  }

  console.log('✅ Finished capturing full page in segments.');
  await browser.close();
})();
