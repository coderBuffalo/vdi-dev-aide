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
exports.pattern = 'private'
exports.entry = path.resolve(__dirname, './index.js')

// 内容适配器 传入消息体 调用入口脚本
exports.adapter = async function adapter ({ name, content, channel}, page) {
  const { entry } = this
  const sign = '打卡'
  // 对话内容中包含 '上班', '下班'关键字时 触发
  content = content.split('\n').pop()
  if (content && !content.includes(sign) && ['上班', '下班'].some(k => content.includes(k))) {
    const cur = await getCurrentChannel(page)
    try {
      await exec(`node ${entry} ${content}`);
      if (
        cur && cur === channel && 
        (content.match(/\d{6}/) || content.includes('下班'))
      ) await replyFn(page, `${sign}成功`, name)
    } catch (e)  {
      if (cur && cur === channel && e.code == 500) await replyFn(page, `${sign}失败`, name)
    }
  }
}