
/**
 * 订阅规则：
 * [
 *  {
 *    pattern: '频道关键字 频道关键字1...', // 必须字段
 *    entry: 脚本入口地址, // 必须字段
 *    adapter: fun(chat) 脚本执行适配函数, // 必须字段
 *    ... ...
 *  }
 * ]
 */
const modulesPath = './modules'
module.exports = [
  require(modulesPath + '/jobsign/subscriber.js'),
  require(modulesPath + '/lgfm/subscriber.js'),
]