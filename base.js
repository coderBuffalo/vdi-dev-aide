const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const puppeteer = require('puppeteer-core');
const axios = require("axios");
const findChrome = require('./node_modules/carlo/lib/find_chrome');

const { endpoint, userDataDir } = require(path.resolve(__dirname, './env.js'));

// export promisify
exports.exec = exec

// custom module loader
exports.include = function (p) {
  return require(path.resolve(__dirname, p))
}

// 退出函数
exports.exitProcess = async function (pageOrBrowser, code = 0 ) {
  if (pageOrBrowser) await pageOrBrowser.close()
  process.exit(code);
}

// 获取浏览器实例
exports.getBrowser = async function (CONF = { args: [] }, launch = false) {
  // 获取webSocketDebuggerUrl
  let wsEndpoint;
  try {
    wsEndpoint = await axios.get(endpoint);
    wsEndpoint = wsEndpoint.data && wsEndpoint.data.webSocketDebuggerUrl;
  } catch (e) {}
  // 实例化browser
  let browser;
  if (!launch && wsEndpoint) {
    browser = await puppeteer.connect({
      defaultViewport: null, ignoreHTTPSErrors: true,
      browserWSEndpoint: wsEndpoint,
      ...CONF
    });
  } else {
    // 查找系统chrome安装路径
    const findChromePath = await findChrome({});
    const executablePath = findChromePath.executablePath;
    browser = await puppeteer.launch({
      defaultViewport: null, headless: true, 
      executablePath, userDataDir,
      ...CONF
    });
  }

  return browser
}

// 获取浏览器已打开的page
exports.getPage = async function (browser, urls = []) {
  // 实例化browser
  let page;
  const targets = await browser.targets()
  let target = null
  for (const url of urls) {
    const tar = targets.find(t => t.url().indexOf(url) > -1)
    if (tar) {
      target = tar
      break
    }
  }

  if (target) page = await target.page()
  else page = await browser.newPage();

  return page
}

// 获取当前打开的对话框标题
exports.getCurrentChannel = async function (page) {
  let curChannel = null
  try {
    curChannel = await page.$eval('.feedCard_active .feedCardName-text-tag', el => el.textContent)
  } catch (e) {}
  return curChannel
}

// 对话内容提取函数
exports.chatExtract = async function (page) {
  let chat = { name: '', content: '' }
  try {
    chat = await page.$$eval('.messageList .message-right', (messageList) => {
      let sectionSelector = '.message-section .richTextContainer', 
        nameSelector = '.message-info .name',
        name = null, text = null, res = [],
        id = messageList.length - 1;
      for(; id >= 0; id--) {
          const m = messageList[id];
          text = m.querySelector(sectionSelector)
          text && res.push(text.textContent) // 对话内容
          name = m.querySelector(nameSelector); // 包含人名的span是否存在
          if (name) {
            name = name.textContent
            break;
          }
      }
      return { name, content: res.reverse().join('\n')}
    })
  } catch (error) { console.error('chatExtract function error -> ', error) }

  return chat
}

function promiseSchedule (promise) {
  if (promise && promise.then) promiseSchedule.queue.push(promise)

  if (promise !== true && promiseSchedule.scheduling) return
  promiseSchedule.scheduling = true

  promise = promiseSchedule.queue.shift()
  if (promise) {
    promise.finally(() => promiseSchedule(true))
  } else promiseSchedule.scheduling = false
}
promiseSchedule.queue = []
promiseSchedule.scheduling = false
// 队列处理函数
exports.promiseSchedule = promiseSchedule

// 回复消息函数
exports.replyFn = async function (page, msg = '', at = '') {
  if (!msg || !page) return
  await page.focus('pre.lark-editor')
  await page.keyboard.type(msg)

  if(at) {
    await page.keyboard.type('  @' + at)
    await page.keyboard.press('ArrowRight');
    try {
      await page.waitForSelector('.lark-mention-box', { timeout: 500 })  
      await page.click('.lark-mention-box .select-item.active')
    } catch (e) {}
  }
  await page.focus('pre.lark-editor');
  await page.keyboard.type(String.fromCharCode(13));
}

// get map key
exports.getMapKey = async function (map = {}) {
  let keys = Object.keys(map).reduce((arr, k) => {
    arr.concat(k.split(' '))
    return arr
  }, [])
  return Array.from(new Set(keys))
}

// 筛选频道订阅者
exports.getSubscriber = function (subscriptions = [], channel = '') {
  if (channel == null || channel === '') return []
  return subscriptions.filter(s => {
    return s.pattern.split(' ').some(p => channel.toLowerCase().includes(p.toLowerCase()))
  })
}