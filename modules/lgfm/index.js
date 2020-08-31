const { getBrowser, getPage, exitProcess } = require('../../base');
const clipboardy = require('clipboardy');

const CONF = require('./env.js');
// console.log(CONF)

(async () => {

  // 读取剪切板url
  let URL_TARGET = process.argv[2]
  if (!URL_TARGET) URL_TARGET = await clipboardy.read();
  if (!URL_TARGET || URL_TARGET.indexOf(CONF.gitlab) < 0) throw Error('请拷贝正确的gitlab地址后重试')

  // 实例化browser
  let browser = await getBrowser({ headless: false })
  // 实例化page
  const page = await browser.newPage();
  await page.goto(URL_TARGET, {waitUntil: 'networkidle2'});
  // 如果路径是登录页， 则填写登录账号与密码
  if (page.url().indexOf(CONF.login) > -1) {
    await page.waitForSelector('#new_ldap_user input.btn-save');
    await page.click('a[href="#ldapmain"]');

    await page.type('#username', CONF.username);
    await page.type('#password', CONF.password);

    await page.click('#remember_me');
    await Promise.all([
      page.waitForNavigation(),
      page.click('#new_ldap_user input.btn-save'),
    ]);
  }

  const note = '.discussion-form-container #note_note';
  let success = true
  try {
    await page.waitForSelector(note, { timeout: 500 });
  } catch (e) {
    success = false
  }

  if (success) {
    // 切换到评论页
    await page.click('ul.merge-request-tabs a[data-target="#notes"]');
    // 等待 150ms
    await page.waitFor(150)
    // 判断是否已评论 在列表中查找 账号名称
    let listContent = await page.$eval('.main-notes-list', el => el.textContent)
    if (!listContent.includes(CONF.username)) {
      // 输入LGFM
      const txt = await page.$(note);
      await txt.click({ clickCount: 3 })
      await txt.type(CONF.lgfm);
      // 提交
      await page.click('.note-form-actions input.comment-btn');
    }
  }
  // 退出
  exitProcess(page, success ? 0 : 404)
})();