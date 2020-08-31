const path = require('path');
const { exec, getCurrentChannel, replyFn } = require('../../base');

/**
 * 订阅规则：
 *  {
 *    pattern: '频道关键字 频道关键字1...', // 必须字段
 *    entry: 脚本入口地址, // 必须字段
 *    adapter: fun(chat) 脚本执行适配函数, // 必须字段
 *    ... ...
 *  }
 */
exports.pattern = '前端 private'
exports.entry = path.resolve(__dirname, './index.js')
exports.regGitlab = /https?:\/\/eatools\.bytedance\.net\/gitlab\/[^\t\n\s]+\/\d+\b/g
exports.targetUser = ['吴勇生', '所有人'] // 消息点名列表 @xxx
exports.lgfmStore = [] // 已经lgfm的url
exports.lgfmQueue = [] // 需要lgfm队列 { name, content, channel, url }

// 内容适配器 传入消息体 调用入口脚本
exports.adapter = async function adapter ({ name, content, channel}, page) {
  let { regGitlab, targetUser, lgfmQueue, lgfmStore, entry } = this
  // 对话内容中包含 @targetUser 时触发
  if (
    content && !content.includes('链接打不开')
    && targetUser.some(user => content.includes('@' + user))
    && targetUser.every(user => name != user)
  ) {
    console.log('%s %s: "%s"', new Date().toLocaleString(), name, content)
    // 提取lgfm链接
    let matchs = content.match(regGitlab) || []
    if (matchs.length) {
      matchs = Array.from(new Set(matchs)).filter(url => {
        return lgfmStore.indexOf(url) < 0
      })
      matchs.length && console.log('匹配到 urls: %O\n', matchs, ' \n')
    }
    const lgfmQueueFn = () => {
      let url = ''
      while ((url = matchs.shift())) {
        lgfmQueue.push({ name, content, channel, url })
      }
    }
    if (lgfmQueue.length)  {
      lgfmQueueFn()
      return
    } else {
      lgfmQueueFn()
    }

    let lgfm = null
    while ((lgfm = lgfmQueue.shift())) {
      lgfmStore.push(lgfm.url)
      if (lgfmStore.length > 100) lgfmStore.shift()
    
      try {
        await exec(`node ${entry} ${lgfm.url}`);
      } catch (e) {
        if (e.code == 404) {
          const id = lgfmStore.indexOf(lgfm.url)
          if(id > 0) lgfmStore.splice(id, 1)

          const cur = await getCurrentChannel(page)
          if (cur && cur === lgfm.channel) {
            await replyFn(page, lgfm.url + ' 链接打不开[无辜笑]', lgfm.name)
          }
        }
      }
    }
  }
}