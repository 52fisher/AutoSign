# 全自动签到助手（专业重构版）

## 项目介绍

全自动签到助手是一个功能强大的油猴脚本，能够自动为多个网站执行签到操作，帮助用户轻松获取各种网站的签到奖励。

- **统一架构**：采用模块化设计，代码结构清晰
- **无冗余**：高效的代码实现，避免重复逻辑
- **全网站支持**：支持大量热门网站的自动签到
- **高可扩展**：易于添加新的网站签到支持

## 功能特性

- 自动识别当前网站并执行相应的签到操作
- 支持多种签到方式：直接点击、iframe签到、URL跳转签到等
- 智能路径匹配，确保在正确的页面执行签到
- 安全点击机制，避免执行错误导致脚本崩溃
- 完善的错误处理，确保脚本稳定运行
- 支持超过50个热门网站的自动签到

## 支持的网站

- 吾爱破解 (52pojie.cn)
- 飘云阁 (chinapyg.com)
- 网易云音乐 (music.163.com)
- AcFun (acfun.cn)
- 文叔叔 (wenshushu.cn)
- IT天空 (itsk.com)
- 卡饭论坛 (bbs.kafan.cn)
- 冰枫论坛 (bingfong.com)
- 鱼C论坛 (fishc.com.cn)
- 数码之家 (mydigit.cn)
- 塞班论坛 (bbs.binmt.cc)
- 深影论坛 (sybbs.vip)
- 樱花萌ACG (jiuyh.com)
- HiFiTi (hifiti.com)
- 致美化 (zhutix.com)
- 天使动漫 (tsdm39.net)
- 什么值得买 (smzdm.com)
- 阡陌居 (1000qm.com)
- 宽带技术网 (chinadsl.net)
- 尘缘轻水 (chenyuanqingshui.com)
- LittleSkin (littleskin.cn)
- 4K世界 (4ksj.org)
- iKuuu (ikuuu.me)
- 国语视界 (cnlang.org)
- 幻天领域 (acgns.cc)
- 调侃网 (tiaokanwang.com)
- 知轩藏书 (zxcsol.com)
- 51cto (blog.51cto.com)
- 布谷TV (bugutv.vip)
- 典尚三维 (3d.jzsc.net)
- 知末网 (znzmo.com)
- 母带吧 (mudaiba.com)
- 知音人 (zyrhires.com)
- 枫の主题社 (winmoes.com)
- 游蝶网单 (ydwgames.com)
- 离线啦 (lixianla.com)
- 70Games (70games.net)
- 大海资源库 (vip.lzzcc.cn)
- 苹果软件站 (iios.club)
- V次元 (66ccff.cc)
- OpenEdv (openedv.com)
- 掘金 (juejin.cn)
- X64论坛 (ome.x64bbs.cn)
- 工控人家园 (ymmfa.com)
- 补档冰室 (manhuabudangbbs.com)
- 理想股票 (55188.com)
- 星空论坛 (seikuu.com)
- 菁优网 (jyeoo.com)
- 多看聚影 (duokan.club)
- 飞浆 (aistudio.baidu.com)
- 洛谷 (luogu.com.cn)
- 小白游戏网 (xbgame.net)
- apk.tw (apk.tw)
- fotor (fotor.com)
- 菜玩社区 (caigamer.cn)
- MineBBS (minebbs.com)
- 三宫六院 (sglynp.com)
- 绯月 (kfpromax.com)
- 精易论坛 (bbs.125.la)
- 鲲Galgame (kungal.com)
- 雨中小町 (rainkmc.com)
- 人人影视 (yysub.net)
- 141华人社区 (141love.net)
- 夸父资源社 (kuafuzys.com)
- JoinQuant (joinquant.com)
- HadSky (hadsky.com)
- 杉果游戏 (sonkwo.cn)
- 再漫画 (zaimanhua.com)
- 不忘初心 (pc528.net)
- 恩山无线 (right.com.cn)
- 更多网站...

## 安装方法

1. 确保您的浏览器已安装 [Tampermonkey](https://www.tampermonkey.net/) 或其他油猴脚本管理器
2. 点击 [这里](https://raw.githubusercontent.com/yourusername/autosign/master/AutoSign.user.js) 安装脚本（请替换为实际的安装链接）
3. 在脚本管理器中启用该脚本

## 使用说明

1. 安装完成后，脚本会自动在支持的网站上运行
2. 当您访问支持的网站时，脚本会自动检测并执行签到操作
3. 签到成功后，通常会在控制台显示相应的提示信息
4. 部分网站可能需要您先登录，脚本会在未登录时提示您

## 扩展指南

如果您想添加对新网站的支持，可以按照以下步骤操作：

1. 在 `SIGN_CONFIG` 对象中添加新的网站配置
2. 配置格式如下：

```javascript
"example.com": {
    excludePaths: ["不需要执行签到的路径"],
    executePaths: ["需要执行签到的路径"],
    handler(helper) {
        // 签到逻辑
    }
}
```

3. 可以使用 `helper` 对象提供的方法：
   - `safeClick(selector, options)` - 安全点击元素
   - `iframeSign(url)` - 在iframe中执行签到
   - `urlJumpSign(url, once)` - 通过URL跳转执行签到
   - `discuzSign(options)` - Discuz论坛通用签到
   - `textClick(containText, selector)` - 根据文本内容点击元素
   - `delay(fn, timeout)` - 延迟执行函数
   - `isMatch(rule)` - 检查当前URL是否匹配规则
   - `checkPath(excludePaths, executePaths)` - 检查是否应该执行签到

4. 保存修改后，脚本会在下次访问该网站时自动执行签到

## 常见问题

### 签到失败怎么办？
1. 确保您已登录目标网站
2. 检查该网站是否在支持列表中
3. 查看浏览器控制台是否有错误信息
4. 可能是网站结构发生了变化，需要更新签到逻辑

### 如何禁用某个网站的签到？
可以在 `SIGN_CONFIG` 中找到对应网站的配置，将其 `handler` 设为一个空函数，或直接删除该网站的配置。

### 脚本会收集我的个人信息吗？
不会，本脚本仅在本地执行签到操作，不会收集或上传任何个人信息。

## 贡献

如果您发现脚本有任何问题或有新的网站需要支持，欢迎提交 issue 或 pull request。

## 许可证

本项目采用 Apache-2.0 许可证。

## 致谢

- 原作者 Fxy29
- 重构优化 52fisher
- 所有为项目做出贡献的开发者

---

**注意**：请合理使用本脚本，遵守各网站的用户协议和相关规定。脚本仅用于个人使用，请勿用于商业目的。
