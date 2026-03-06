// tests/load/processor.js
module.exports = {
  // 随机字符串生成
  randomString: function (userContext, events, done) {
    const str = Math.random().toString(36).substring(7);
    return done(null, str);
  },
};
