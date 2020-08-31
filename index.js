const { getBrowser, getCurrentChannel, exitProcess, chatExtract, getSubscriber } = require('./base');
const { messengerUrl, messageGateway } = require('./env');

const subscriptions = require('./subscriptions');

// 关闭浏览器窗口
let browser = null // 浏览器句柄
let isExiting = false
async function exitHandler(code = 0) {
  if (isExiting) return
  isExiting = true
  exitProcess(browser, code)
}
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
// 启动puppeteer
(async () => {
  // 实例化browser
  browser = await getBrowser({ 
    headless: false, 
    ignoreDefaultArgs: [
      '--enable-automation' // 禁止提示信息
    ] 
  }, true)
  // 实例化page
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 600 });
  // 启动 lark
  await page.goto(messengerUrl, {waitUntil: 'domcontentloaded'});
  // 上一次对话内容
  let lastChat = null
  // 处理推送信息
  const messageProcess = async () => {
    // 最新对话框
    const channelEl = await page.$('.feedCardName-text-tag')
    // 最新对话框标题
    const channel = await page.evaluate(el => el.textContent, channelEl)
    // 查询最新对话框订阅者
    const subscribers = getSubscriber(subscriptions, channel)
    // 最新对话框如果没有订阅者 直接返回
    if (subscribers.length < 1) return
    // 最新对话框标题与当前打开的对话框标题不一致，点击切换到最新对话框
    let curChannel = await getCurrentChannel(page)
    if (curChannel !== channel) {
      await channelEl.click({ delay: 300 })
      console.log('\n对话框切换到 "%s"', channel)
      // 点击后直接返回，因为点击切换后页面又会发起请求，重新进入response事件回调
      return
    }

    //console.log('1 =>', channel)
    // 触发订阅对话框后页面转到前台
    // await page.bringToFront()

    // 获取当前对话
    const chat = await chatExtract(page)
    // 如果对话内容没变 直接返回
    if (lastChat && chat.content === lastChat.content) return
    lastChat = chat

    for (const subscriber of subscribers) {
      // 触发订阅脚本
      try {
        subscriber.adapter.call(subscriber, {...chat, channel}, page)
      } catch (e) {console.error(e)}
    }
  }

  // handle 用来debounce，timeout时间内的连续推送消息, 
  // 最后一次推送消息时间点开始执行回调
  let handle = null
  page.on('response', response => {
    // 因为接口用的是protobuf协议，没找到解析协议的方法
    // 暂时粗糙用url过滤关键消息接口，然后从页面中提取数据
    if (response.url() == messageGateway){//console.log('0 =>')
      if (handle) clearTimeout(handle)
      handle = setTimeout(messageProcess, 500);
    }
  });

})();