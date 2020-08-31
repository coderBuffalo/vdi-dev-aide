const { getBrowser, exitProcess } = require('../../base');
const CONF = require('./env.js');

// 参数字符串
const ARGV = process.argv.slice(2).join(' ')
// 读取CAPTCHA
const CAPTCHA = (ARGV.match(/\d{6}/) || [])[0]
// 上下班
const ON_DUTY = !ARGV.includes(CONF.off_duty_pattern)
;(async () => {

  try {
    // 实例化browser
    let browser = await getBrowser({ headless: false })
    // 实例化page
    const page = await browser.newPage()

    // 进入打卡页面
    await page.goto(CONF.jobSignUrl, {waitUntil: 'networkidle2'});

    // 如果路径是登录页， 则填写登录手机号与验证码
    if (page.url() == CONF.jobSignLoginUrl) {
      await page.click('.longin-select > .otherButton:nth-child(2)');
      await page.waitFor(300);
      await page.type('.ivu-form-item .inp-nub input.ivu-input', CONF.mobile);

      if (!CAPTCHA) {
        await page.click('form.ivu-form .code .otherButton');
        await page.waitFor(300);
        return exitProcess(page)
      }
      
      await page.type('.ivu-form-item .code input.ivu-input', CAPTCHA);
      await Promise.all([
        page.waitForNavigation(),
        page.click('form.ivu-form > .otherButton'),
      ]);
    }

    // 点击上下班按钮
    const cardlist = '.cardlist';
    await page.waitForSelector(cardlist);
    const btns = await page.$$(cardlist + ' .crtlbtn.btn')
    // ON_DUTY 上班按钮 0  下班按钮 1
    if (btns.length > 1) await btns[ON_DUTY ? 0 : 1].click({ delay: 300 })
    await page.waitFor(500);

    exitProcess(page)
  } catch (error) {
    console.error(error)
    exitProcess(page, 500)
  }
})();