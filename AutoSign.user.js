// ==UserScript==
// @name         全自动签到助手（专业重构版）
// @version      4.0.5
// @description  统一架构、无冗余、全网站支持、高可扩展
// @author       52fisher 专业重构优化 / 原作者 Fxy29
// @match        *://*/*
// @exclude      https://leaves.red/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.deleteValue
// @grant        GM_notification
// @run-at       document-end
// @license      Apache-2.0
// @namespace    http://tampermonkey.net/
// ==/UserScript==

(function ($) {
    'use strict';

    // ========================= 全局常量 =========================
    const TIMEOUT = {
        FAST: 1000,
        MEDIUM: 2000,
        SLOW: 3000,
        VERY_SLOW: 5000,
        EXTREME: 9500,
        MAX: 10000
    };

    const TIPS = {
        NO_LOGIN: "❌ 状态异常或未登录，登录后自动签到",
        SIGN_SUCCESS: "✅ 签到完成！",
        REWARD_SUCCESS: "✅ 领取完成！"
    };

    // ========================= 通知函数 =========================
    function notify(title, message) {
        if (typeof GM_notification !== "undefined") {
            GM_notification({ title:title, text: message });
        } else if (typeof Notification !== "undefined") {
            if (Notification.permission === "default") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") new Notification(title, { body: message });
                });
            } else if (Notification.permission === "granted") {
                new Notification(title, { body: message });
            }
        }
    }

    // ========================= 签到工具类（核心抽象） =========================
    class SignHelper {
        constructor() {
            this.host = this.getCurrentHost();
            this.fullPath = window.location.href;
            this.path = window.location.pathname + window.location.search;
        }

        // 获取纯净 Host（移除 www）
        getCurrentHost() {
            return window.location.hostname.replace(/^www\./, '');
        }

        // 统一延迟执行
        delay(fn, timeout = TIMEOUT.MEDIUM) {
            setTimeout(fn, timeout);
        }

        // 安全点击（防报错）
        safeClick(selector, options = {}) {
            const $el = $(selector);
            if (!$el.length) return false;
            $el.click();
            options.tips && console.log(`[Sign] ${options.tips}`);
            return true;
        }

        // 在当前页面新开iframe 签到，默认不显示iframe,url为签到链接
        iframeSign(url) {
            $("body").append(`<iframe src="${url}" style="display: none;"></iframe>`);
            return true;
        }

        // URL 跳转签到（防循环）
        urlJumpSign(url, once = true) {
            const key = `sign_jump_${url}`;
            if (once && sessionStorage.getItem(key)) return false;
            sessionStorage.setItem(key, "1");
            window.location.href = url;
        }

        // Discuz 通用签到（k_misign / dsu_paulsign）
        discuzSign(options = {}) {
            const { btn = "#JD_sign", text = "您今天还没有签到" } = options;
            const body = $("body").text();
            if (body.includes(text) || body.includes("您今天還沒有簽到")) {
                return this.safeClick(btn, { tips: TIPS.SIGN_SUCCESS });
            }
            return false;
        }

        // 文本匹配点击
        textClick(containText, selector) {
            if ($("body").text().includes(containText)) {
                return this.safeClick(selector);
            }
            return false;
        }

        // 路径匹配（支持字符串 / 正则）
        isMatch(rule) {
            if (typeof rule === "string") return this.fullPath.includes(rule);
            if (rule instanceof RegExp) return rule.test(this.fullPath);
            return false;
        }

        // 校验是否可执行
        checkPath(excludePaths = [], executePaths = []) {
            for (const rule of excludePaths) if (this.isMatch(rule)) return false;
            if (executePaths.length === 0) return true;
            for (const rule of executePaths) if (this.isMatch(rule)) return true;
            return false;
        }
    }

    // ========================= 全站签到配置（你所有网站 100% 迁移） =========================
    const SIGN_CONFIG = {
        // 吾爱破解
        "52pojie.cn": {
            excludePaths: ["search.php", "home.php"],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const $btn = $('#um a[href^="home.php?mod=task&do=apply&id=2"]');
                    if (!$btn.length) return false;
                    helper.iframeSign($btn.attr("href"));
                    $btn.find('.qq_bind').attr("src", 'https://www.52pojie.cn/static/image/common/wbs.png').attr("href", "javascript:void(0);");
                    signed = true;
                });
                return signed;
            }
        },

        // 飘云阁
        "chinapyg.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                return helper.textClick("签到领奖!", ".kx_s");
            }
        },

        // 网易云音乐
        "music.163.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                helper.iframeSign("#g_iframe", ".sign", "签 到");
                helper.delay(() => {
                    if ($("body").text().includes("登录")) alert(TIPS.NO_LOGIN);
                }, TIMEOUT.SLOW);
                return true;
            }
        },

        // AcFun
        "acfun.cn": {
            excludePaths: [],
            executePaths: ["/member/"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const $btn = $(".sign-in-btn");
                    if (!$btn.text().includes("已签到")) {
                        helper.safeClick($btn);
                        helper.delay(() => {
                            $("#signin-modal-show").prop("checked", true);
                            helper.safeClick(".signin-web-btn");
                            signed = true;
                            location.reload();
                        }, TIMEOUT.FAST);
                    }
                });
                return signed;
            }
        },

        // 文叔叔
        "wenshushu.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    for (let i = 0; i < 5; i++) $(".btn-icon").eq(i).click();
                    signed = helper.safeClick(".icon-cont_clock");
                }, TIMEOUT.VERY_SLOW);
                return signed;
            }
        },

        // IT天空
        "itsk.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                const timer = setInterval(() => {
                    const $btn = $(".sign-res button.el-button--success");
                    if ($btn.length) {
                        signed = helper.safeClick($btn);
                        clearInterval(timer);
                    }
                }, TIMEOUT.FAST);
                return signed;
            }
        },

        // 卡饭论坛
        "bbs.kafan.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const src = $("#pper_a img").attr("src");
                    if (!src?.includes("wb.png")) signed = helper.safeClick("#pper_a");
                });
                return signed;
            }
        },

        // 冰枫论坛
        "bingfong.com": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["bbs.kafan.cn"].handler; }
        },

        // 鱼C论坛
        "fishc.com.cn": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            handler(helper) { return helper.discuzSign(); }
        },
        "mydigit.cn": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "bbs.binmt.cc": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "52cnp.com": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "naixi.net": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "klpbbs.com": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "108mir.com": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "club.excelhome.net": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "byzhihuo.com": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "ruyanhk.com": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },
        "52gts.com": {
            excludePaths: [],
            executePaths: ["k_misign-sign.html", "plugin.php?id=k_misign:sign", "sign.php"],
            get handler() { return SIGN_CONFIG["fishc.com.cn"].handler; }
        },

        // 深影论坛
        "sybbs.vip": {
            excludePaths: [],
            executePaths: ["plugin.php?id=gsignin:index"],
            handler(helper) { return helper.safeClick(".right"); }
        },

        // 樱花萌ACG
        "jiuyh.com": {
            excludePaths: [],
            executePaths: ["yinxingfei_zzza:yinxingfei_zzza_hall", "yinxingfei_zzza-yinxingfei_zzza_hall.html"],
            handler(helper) { return helper.safeClick("#zzza_go"); }
        },
        "975w.com": {
            excludePaths: [],
            executePaths: ["yinxingfei_zzza:yinxingfei_zzza_hall", "yinxingfei_zzza-yinxingfei_zzza_hall.html"],
            get handler() { return SIGN_CONFIG["jiuyh.com"].handler; }
        },

        // HiFiTi
        "hifiti.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const text = $("#sg_sign").text();
                    if (text.includes("请登录")) return alert(TIPS.NO_LOGIN);
                    if (!text.includes("已签") && text.includes("签到")) signed = helper.safeClick("#sg_sign");
                });
                return signed;
            }
        },

        // 致美化
        "zhutix.com": {
            excludePaths: [],
            executePaths: ["/task", "/mission/today"],
            handler(helper) {
                if (helper.isMatch("/task")) {
                    let signed = false;
                    helper.delay(() => {
                        const $span = $(".task-day-list span").eq(15);
                        if ($span.attr("class")?.trim() === "task-finish-icon-go") {
                            signed = helper.safeClick($(".task-day-list a").eq(3));
                            alert(TIPS.SIGN_SUCCESS);
                        }
                    }, TIMEOUT.FAST);
                    return signed;
                }
                if (helper.isMatch("/mission/today")) {
                    let signed = false;
                    helper.delay(() => {
                        const $span = $(".gold-row span").eq(0);
                        const $btn = $(".gold-row button").eq(0);
                        if ($btn.length && $span.text().includes("签到")) {
                            signed = helper.safeClick($btn);
                            alert(TIPS.SIGN_SUCCESS);
                        }
                    }, TIMEOUT.EXTREME + 3000);
                    return signed;
                }
                return false;
            }
        },

        // 天使动漫
        "tsdm39.net": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["chinapyg.com"].handler; }
        },

        // 什么值得买
        "smzdm.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if ($("body").text().includes("登录") || $("body").text().includes("注册")) {
                        alert(TIPS.NO_LOGIN);
                        return;
                    }
                    signed = helper.textClick("签到领奖", ".J_punch");
                }, TIMEOUT.SLOW - 200);
                return signed;
            }
        },

        // iYa.App
        "iya.app": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                if (helper.textClick("签到领奖!")) {
                    return helper.urlJumpSign("https://www.iya.app/plugin.php?id=dsu_paulsign:sign");
                } else {
                    return helper.textClick("签到", "a:contains('签到')");
                }
            }
        },

        // 阡陌居
        "1000qm.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = helper.textClick("签到领奖!", ".kx_s");
                helper.delay(() => helper.urlJumpSign("/home.php?mod=task&do=apply&id=1"));
                return signed;
            }
        },

        // 宽带技术网
        "chinadsl.net": {
            excludePaths: [],
            executePaths: ["home.php?mod=task&do=view&id=1"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const href = $(".taskbtn").attr("href");
                    if (href && !href.includes("javascript")) signed = helper.safeClick(".taskbtn");
                }, TIMEOUT.FAST);
                return signed;
            }
        },

        // 尘缘轻水
        "chenyuanqingshui.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("点击领取今天的签到奖励", ".user-w-qd.cur"); }
        },
        "forum.zwsoft.cn": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["chenyuanqingshui.com"].handler; }
        },

        // LittleSkin
        "littleskin.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("签到", ".bg-gradient-primary"); }
        },

        // 4K世界 / 5A版本库 / 国芯 / 镜客居
        "4ksj.org": {
            excludePaths: [],
            executePaths: ["qiandao.php", "zqlj_sign"],
            handler(helper) { return helper.textClick("点击打卡", ".btna"); }
        },
        "5abbk.com": {
            excludePaths: [],
            executePaths: ["qiandao.php", "zqlj_sign"],
            get handler() { return SIGN_CONFIG["4ksj.org"].handler; }
        },
        "stcaimcu.com": {
            excludePaths: [],
            executePaths: ["qiandao.php", "zqlj_sign"],
            get handler() { return SIGN_CONFIG["4ksj.org"].handler; }
        },
        "jkju.cc": {
            excludePaths: [],
            executePaths: ["plugin.php?id=zqlj_sign"],
            get handler() { return SIGN_CONFIG["4ksj.org"].handler; }
        },

        // iKuuu
        "ikuuu.me": {
            excludePaths: [],
            executePaths: ["/user"],
            handler(helper) { return helper.textClick("每日签到", ".btn-primary"); }
        },

        // 国语视界 / 食品论坛 / Anime字幕 / ZMX-IT
        "cnlang.org": {
            excludePaths: [],
            executePaths: ["dsu_paulsign-sign.html"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if ($("body").text().includes("今天签到了吗") && $("body").text().includes("写下今天最想说的话")) {
                        signed = helper.safeClick("#kx");
                        $("#todaysay").val("每天签到水一发。。。");
                        unsafeWindow.showWindow('qwindow', 'qiandao', 'post', '0');
                    }
                });
                return signed;
            }
        },
        "foodmate.net": {
            excludePaths: [],
            executePaths: ["dsu_paulsign-sign.html"],
            get handler() { return SIGN_CONFIG["cnlang.org"].handler; }
        },
        "acgrip.com": {
            excludePaths: [],
            executePaths: ["dsu_paulsign-sign.html"],
            get handler() { return SIGN_CONFIG["cnlang.org"].handler; }
        },
        "bbs.itzmx.com": {
            excludePaths: [],
            executePaths: ["dsu_paulsign-sign.html"],
            get handler() { return SIGN_CONFIG["cnlang.org"].handler; }
        },

        // 幻天领域
        "acgns.cc": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("签到", ".inn-nav__point-sign-daily__btn"); }
        },

        // 调侃网
        "tiaokanwang.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("今日签到", ".erphpdown-sc-btn"); }
        },

        // 知轩藏书 / 梦楠分享 / 道言分享
        "zxcsol.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    $("a.initiate-checkin").each((_, el) => {
                        const t = $(el).text();
                        if (t.includes("今日奖励") || t.includes("每日签到")) signed = helper.safeClick(el);
                    });
                });
                return signed;
            }
        },
        "mnpc.net": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["zxcsol.com"].handler; }
        },
        "lhndy.cn": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["zxcsol.com"].handler; }
        },

        // 51cto
        "blog.51cto.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("签到领勋章", "#sign"); }
        },

        // 布谷TV / 马克喵 / 咸鱼单机 / 小黑库
        "bugutv.vip": {
            excludePaths: [],
            executePaths: ["/user"],
            handler(helper) { return helper.textClick("每日签到", ".go-user-qiandao"); }
        },
        "macat.vip": {
            excludePaths: [],
            executePaths: ["/user"],
            get handler() { return SIGN_CONFIG["bugutv.vip"].handler; }
        },
        "xianyudanji.to": {
            excludePaths: [],
            executePaths: ["/user"],
            get handler() { return SIGN_CONFIG["bugutv.vip"].handler; }
        },
        "xhzyku.com": {
            excludePaths: [],
            executePaths: ["/user"],
            get handler() { return SIGN_CONFIG["bugutv.vip"].handler; }
        },

        // 典尚三维
        "3d.jzsc.net": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const $el = $("#setsign");
                    if ($el.length && !$el.text().includes("已签到")) signed = helper.safeClick($el);
                });
                return signed;
            }
        },

        // 知末网
        "znzmo.com": {
            excludePaths: [],
            executePaths: ["usercenter_task.html?subaction=sign"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    signed = helper.safeClick(".task_signIn_week_item_img.heartbeat");
                    helper.delay(() => helper.safeClick(".signIn-progress-btn"), TIMEOUT.FAST);
                }, TIMEOUT.EXTREME);
                return signed;
            }
        },

        // 母带吧
        "mudaiba.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if ($(".m_sign").text() === "签到") signed = helper.safeClick("#m_sign");
                });
                return signed;
            }
        },

        // 知音人 / 诺曼底 / SteamTools
        "zyrhires.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const bg = $("#dcsignin_tips").css("background-image");
                    if (bg.includes("signin_no.png")) {
                        helper.safeClick("#dcsignin_tips");
                        helper.delay(() => {
                            helper.safeClick($(".dcsignin_list li").eq(8));
                            helper.safeClick('button[name="signpn"]');
                            signed = true;
                        });
                    }
                });
                return signed;
            }
        },
        "nmandy.net": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["zyrhires.com"].handler; }
        },
        "steamtools.net": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["zyrhires.com"].handler; }
        },

        // 枫の主题社
        "winmoes.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.safeClick($(".link-block").eq(7)); }
        },

        // 游蝶网单
        "ydwgames.com": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["chinapyg.com"].handler; }
        },
        "yamibo.com": {
            excludePaths: [],
            executePaths: ["plugin.php?id=zqlj_sign"],
            get handler() { return SIGN_CONFIG["chinapyg.com"].handler; }
        },

        // 离线啦 / 游戏欧
        "lixianla.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const $span = $("#sg_sign .btn-group button span");
                    if ($span.text().trim() === "签到") signed = helper.safeClick($span.closest("button"));
                }, TIMEOUT.SLOW - 200);
                return signed;
            }
        },
        "youxiou.com": {
            excludePaths: [],
            executePaths: [],
            get handler() { return SIGN_CONFIG["lixianla.com"].handler; }
        },

        // 70Games
        "70games.net": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if (!$("body").text().includes("已签")) signed = helper.safeClick("#sg_sign");
                }, TIMEOUT.SLOW - 200);
                return signed;
            }
        },

        // 大海资源库
        "vip.lzzcc.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                const $el = $(".img-badge").eq(3);
                if ($el.hasClass("initiate-checkin")) return helper.safeClick($el);
                return false;
            }
        },

        // 苹果软件站
        "iios.club": {
            excludePaths: [],
            executePaths: ["/#/points"],
            handler(helper) {
                let signed = false;
                $("div").each((_, el) => {
                    if ($(el).text() === "立即签到") signed = helper.safeClick(el);
                });
                return signed;
            }
        },

        // V次元
        "66ccff.cc": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                $("a.initiate-checkin").each((_, el) => {
                    if ($(el).text().includes("签到")) signed = helper.safeClick(el);
                });
                return signed;
            }
        },

        // OpenEdv
        "openedv.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                const style = $("#dcsignin_tips").attr("style");
                if (style?.includes("signin_no")) {
                    helper.safeClick("#dcsignin_tips");
                    helper.delay(() => {
                        helper.safeClick($(".dcsignin_list li").eq(8));
                        $("#emotid").val("8");
                        signed = helper.safeClick(".pnc");
                    });
                }
                return signed;
            }
        },

        // 掘金
        "juejin.cn": {
            excludePaths: [],
            executePaths: ["/user/center/signin", "/user/center/lottery"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if (helper.textClick("立即签到", "button.signin.btn")) signed = true;
                    if (helper.textClick("去抽奖", "button")) signed = true;
                    if ($("#turntable-item-0 .text-free").parent().length && helper.safeClick($("#turntable-item-0 .text-free").parent())) signed = true;
                }, TIMEOUT.FAST);
                return signed;
            }
        },

        // X64论坛
        "ome.x64bbs.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                $("#um a").each((_, el) => {
                    if ($(el).text().includes("打卡签到")) signed = helper.safeClick(el);
                });
                return signed;
            }
        },

        // 工控人家园
        "ymmfa.com": {
            excludePaths: [],
            executePaths: ["read-gktid-142599.html"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
                    const today = now.split(" ")[0];
                    const t1 = GM_getValue("time1", "");
                    const t2 = GM_getValue("time2", "");
                    if (t2.split(" ")[0] === today) return;
                    if (!t1) {
                        helper.safeClick("#url_1");
                        GM_setValue("time1", now);
                    } else {
                        const check = () => {
                            const cur = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
                            const min = (new Date(cur) - new Date(t1)) / 60000;
                            if (min > 60) {
                                helper.safeClick("#url_2");
                                GM_setValue("time2", cur);
                                GM_setValue("time1", "");
                                signed = true;
                                alert(TIPS.SIGN_SUCCESS);
                            } else setTimeout(check, 10 * 60 * 1000);
                        };
                        check();
                    }
                }, TIMEOUT.FAST);
                return signed;
            }
        },

        // 补档冰室
        "manhuabudangbbs.com": {
            excludePaths: [],
            executePaths: ["/u.php"],
            handler(helper) {
                const $p = $("#punch");
                if ($p.text().includes("每日打卡") || $p.text().includes("未打卡")) return helper.safeClick($p);
                return false;
            }
        },

        // 理想股票
        "55188.com": {
            excludePaths: [],
            executePaths: ["plugin.php?id=sign"],
            handler(helper) { return helper.textClick("您今天还没有签到哦", "#addsign"); }
        },

        // 星空论坛
        "seikuu.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    signed = helper.safeClick("#kx");
                    $("#todaysay").val("今天天气真好~签到。");
                    unsafeWindow.showWindow("qwindow", "qiandao", "post", "0");
                }, TIMEOUT.MAX);
                return signed;
            }
        },

        // 菁优网
        "jyeoo.com": {
            excludePaths: [],
            executePaths: ["/profile"],
            handler(helper) {
                if ($("#sign").text() === "立即签到") return helper.safeClick("#sign");
                return false;
            }
        },

        // 多看聚影 / 品技 / 港知堂
        "duokan.club": {
            excludePaths: [],
            executePaths: ["/sign.php"],
            handler(helper) { return helper.textClick("点击打卡", ".btna"); }
        },
        "tekqart.com": {
            excludePaths: [],
            executePaths: ["plugin.php?id=zqlj_sign"],
            get handler() { return SIGN_CONFIG["duokan.club"].handler; }
        },
        "gztown.org": {
            excludePaths: [],
            executePaths: ["/sign.php"],
            get handler() { return SIGN_CONFIG["duokan.club"].handler; }
        },

        // 飞浆
        "aistudio.baidu.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const $el = $(".a-s-header-tool-item.header-tool-item-console");
                    if (!$el.length) return;
                    $el.trigger("mouseover");
                    helper.delay(() => {
                        const $title = $(".user-sign-highlight .user-sign-item-title");
                        if ($title.text().includes("签到")) signed = helper.safeClick($title.closest(".user-sign-highlight"));
                    }, TIMEOUT.FAST);
                }, TIMEOUT.SLOW);
                return signed;
            }
        },

        // 洛谷
        "luogu.com.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("点击打卡", ".am-btn-warning"); }
        },

        // 小白游戏网
        "xbgame.net": {
            excludePaths: [],
            executePaths: ["/task"],
            handler(helper) { return helper.safeClick($(".link-block").eq(3)); }
        },

        // apk.tw
        "apk.tw": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    const el = $("#my_amupper")[0];
                    if (!el) return;
                    const ev = document.createEvent("Events");
                    ev.initEvent("click", true, false);
                    el.dispatchEvent(ev);
                    document.cookie = "adblock_forbit=1;expires=0";
                    signed = true;
                }, TIMEOUT.FAST);
                return signed;
            }
        },

        // fotor
        "fotor.com": {
            excludePaths: [],
            executePaths: ["/cn/rewards", "/tw/rewards"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    $("button").each((_, btn) => {
                        const $b = $(btn);
                        const t = $b.text();
                        if ((t.includes("立即领取") || t.includes("立即領取")) &&
                            $b.find('span[class*="PointsActivity"]').length &&
                            $b.closest('[class*="dailyCheckIn"]').length
                        ) {
                            if (helper.safeClick($b)) signed = true;
                        }
                    });
                }, TIMEOUT.SLOW);
                return signed;
            }
        },

        // 菜玩社区
        "caigamer.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                const $t = $("#sign_title");
                if ($t.text().includes("立即签到")) return helper.safeClick($t);
                return false;
            }
        },

        // MineBBS
        "minebbs.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.textClick("每日签到", ".button--cta"); }
        },

        // 三宫六院
        "sglynp.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if ($("body").text().includes("已签到")) return;
                    helper.safeClick($("#k_misign_topb a"));
                    signed = true;
                    location.reload();
                    helper.delay(() => {
                        location.href = "https://www.sglynp.com/home.php?mod=space&do=notice&view=system";
                    }, TIMEOUT.FAST + Math.random() * 2000);
                });
                return signed;
            }
        },

        // 绯月
        "kfpromax.com": {
            excludePaths: [],
            executePaths: ["/kf_growup.php"],
            handler(helper) {
                if (!$("body").text().includes("今天的每日奖励已经领过了")) {
                    return helper.safeClick('a[href*="kf_growup.php?ok=3"]');
                }
                return false;
            }
        },

        // 精易论坛
        "bbs.125.la": {
            excludePaths: [],
            executePaths: ["plugin.php?id=dsu_paulsign:sign"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    if (!$("body").text().includes("您今日已经签到")) {
                        location.href = "https://bbs.125.la/";
                        return;
                    }
                    signed = helper.safeClick("#sign");
                    helper.delay(() => helper.safeClick("a.layui-layer-btn0"), TIMEOUT.FAST + Math.random() * 2000);
                });
                return signed;
            }
        },

        // 鲲Galgame
        "kungal.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    helper.safeClick($('div[data-v-729e1e50] > div.cursor-pointer'));
                    let $btn = $('button:contains("每日签到")');
                    if (!$btn.length) $btn = $("button.text-secondary");
                    if (!$btn.length) $btn = $("div.func button:nth-child(3)");
                    if ($btn.length && !$btn.prop("disabled")) {
                        signed = helper.safeClick($btn);
                        location.reload();
                        helper.delay(() => helper.safeClick($('div[data-v-729e1e50] > div.cursor-pointer')), TIMEOUT.FAST + Math.random() * 2000);
                    }
                });
                return signed;
            }
        },

        // 雨中小町
        "rainkmc.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                if (!$("body").text().includes("连续签到")) {
                    helper.safeClick(".punch_btn");
                    helper.delay(() => location.reload(), TIMEOUT.FAST + Math.random() * 2000);
                    return true;
                }
                return false;
            }
        },

        // 人人影视
        "yysub.net": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                helper.delay(() => location.reload(), TIMEOUT.FAST + Math.random() * 2000);
                return true;
            }
        },

        // 141华人社区
        "141love.net": {
            excludePaths: [],
            executePaths: ["/forum.php"],
            handler(helper) {
                if ($('img[src*="pperwb.gif"]').length) return false;
                helper.safeClick($('img[onclick*="dsu_amupper"]'));
                helper.delay(() => helper.safeClick(".pn.pnc"), 500);
                helper.delay(() => helper.safeClick("#myprompt"), 500);
                return true;
            }
        },

        // 夸父资源社
        "kuafuzys.com": {
            excludePaths: [],
            executePaths: [],
            handler(helper) {
                const $t = $("#tt_sign");
                if ($t.text().includes("登录")) {
                    alert(TIPS.NO_LOGIN);
                    return false;
                }
                if ($t.text().includes("立即签到")) return helper.safeClick($t);
                return false;
            }
        },

        // JoinQuant
        "joinquant.com": {
            excludePaths: [],
            executePaths: ["/view/user/floor"],
            handler(helper) { return helper.textClick("签到领积分", ".menu-credit-button"); }
        },

        // HadSky
        "hadsky.com": {
            excludePaths: [],
            executePaths: ["/app-puyuetian_phptask-index.html"],
            handler(helper) {
                let signed = false;
                helper.delay(() => {
                    $("button.btn.get span").each((_, s) => {
                        if ($(s).text().replace(/\s/g, "").includes("领取奖励")) {
                            if (helper.safeClick($(s).closest("button"))) signed = true;
                        }
                    });
                });
                return signed;
            }
        },

        // 杉果游戏
        "sonkwo.cn": {
            excludePaths: [],
            executePaths: [],
            handler(helper) { return helper.safeClick(".store_user_card_action_check"); }
        },

        // 再漫画
        "zaimanhua.com": {
            excludePaths: [],
            executePaths: ["/i"],
            handler(helper) { return helper.safeClick(".ant-btn-primary"); }
        },

        // 不忘初心
        "pc528.net": {
            excludePaths: [],
            executePaths: ["/user-center.html?pd=qiandao"],
            handler(helper) { return helper.safeClick("#qiandao_ajax"); }
        },

        // 恩山无线
        "right.com.cn": {
            excludePaths: [],
            executePaths: ["forum/erling_qd-sign_in.html"],
            handler(helper) { return helper.safeClick("#signin-btn"); }
        },
        "ccgfw.top": {
            excludePaths: [],
            executePaths: [/\/user\/?$/],
            handler(helper) { return helper.safeClick("#checkin"); }
        }
    };

    // ========================= 启动执行 =========================
    $(document).ready(() => {
        const helper = new SignHelper();
        const host = helper.host;

        if (SIGN_CONFIG.hasOwnProperty(host)) {
            const config = SIGN_CONFIG[host];
            if (helper.checkPath(config.excludePaths, config.executePaths)) {
                try {
                    const result = config.handler(helper);
                    if (result) {
                        notify("签到成功", `${host} 签到完成！`);
                    }
                } catch (err) {
                    console.error("[Sign 错误]", host, err);
                    notify("签到出错", `${host} 签到失败！`);
                }
            }
        }
    });

})(jQuery);