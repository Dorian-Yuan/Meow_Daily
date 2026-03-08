/**
 * daily_job.js
 * 每天被 GitHub Actions 触发，读取 db.json 并发送提醒
 */
import fs from 'fs';
import path from 'path';

// 从环境变量获取密钥 (由 GitHub Actions 注入)
const BARK_KEY = process.env.BARK_KEY;
const AI_KEY = process.env.CHATANYWHERE_API_KEY;

const DB_PATH = path.resolve('./db.json');

async function main() {
    if (!BARK_KEY) {
        console.error('❌ 未配置 BARK_KEY，跳过推送');
        return;
    }

    console.log('🐾 开始读取岁岁的日记...');
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const cat = db.cats[0];
    const records = db.records[cat.cat_id] || {};

    let reminders = [];
    const now = new Date();
    
    // 北京时间适配
    const todayStr = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })).toISOString().split('T')[0];
    const todayDate = new Date(todayStr.replace(/-/g, '/'));
    const tMonth = todayDate.getMonth();
    const tDay = todayDate.getDate();

    // 0. 纪念日检测
    if (cat.birth_date) {
        const birthDate = new Date(cat.birth_date.replace(/-/g, '/'));
        if (birthDate.getMonth() === tMonth && birthDate.getDate() === tDay) {
            const age = todayDate.getFullYear() - birthDate.getFullYear();
            reminders.push(`今天是岁岁的 ${age} 岁生日！快准备好吃的罐罐！🎂`);
        }
    }

    if (cat.adoption_date) {
        const adoptDate = new Date(cat.adoption_date.replace(/-/g, '/'));
        if (adoptDate.getMonth() === tMonth && adoptDate.getDate() === tDay) {
            const years = todayDate.getFullYear() - adoptDate.getFullYear();
            if (years > 0) {
                reminders.push(`今天是岁岁来到家里的第 ${years} 周年纪念日！🏠`);
            }
        }
    }

    // 1. 检查日常护理动态提醒
    const routines = records.routine || [];
    const customReminders = db.settings.reminders || [];
    
    // 兼容旧版 reminder_cycles
    if (customReminders.length === 0 && db.settings.reminder_cycles) {
        for (const [key, days] of Object.entries(db.settings.reminder_cycles)) {
            let label = key;
            if (key === 'nail_clipping') label = '剪指甲';
            if (key === 'litter_change') label = '换猫砂';
            if (key === 'deworming') label = '驱虫';
            customReminders.push({ label, days });
        }
    }

    for (const rm of customReminders) {
        // 找到该任务最后一次记录
        const lastTask = routines.filter(r => r.type === rm.label).sort((a, b) => new Date(b.timestamp.replace(/-/g, '/')) - new Date(a.timestamp.replace(/-/g, '/')))[0];
        
        if (lastTask) {
            const lastDate = new Date(lastTask.timestamp.split(' ')[0].replace(/-/g, '/'));
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= rm.days) {
                reminders.push(`岁岁已经 ${diffDays} 天没有【${rm.label}】了！(设定周期: ${rm.days}天)`);
            }
        } else {
            reminders.push(`还没有岁岁【${rm.label}】的记录哦，该安排了！`);
        }
    }

    // 如果没有提醒，直接退出
    if (reminders.length === 0) {
        console.log('✅ 今天一切正常，岁岁没有需要操心的事。');
        return;
    }

    console.log(`⚠️ 发现待办事项: \n${reminders.join('\n')}`);

    // 2. 调用 AI 生成傲娇的宠物视角文案
    let finalMessage = reminders.join('\n');
    if (AI_KEY) {
        try {
            console.log('🧠 正在请 AI 转换成岁岁的语气...');
            
            const defaultPrompt = '你是一只叫“岁岁”的傲娇小猫。你的主人设置了提醒。请根据提供的任务列表，用简短、傲娇、可爱的语气催促主人（铲屎官）去干活。如果今天是你的生日或纪念日，记得要礼物！字数控制在 60 字以内，多用 emoji。';
            const systemPrompt = (db.settings && db.settings.prompts && db.settings.prompts.daily) ? db.settings.prompts.daily : defaultPrompt;

            const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: reminders.join('\n') }
                    ]
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0]) {
                finalMessage = data.choices[0].message.content;
                console.log(`🤖 AI 润色结果: ${finalMessage}`);
            }
        } catch (e) {
            console.error('❌ AI 转换失败，使用默认文案', e);
        }
    }

    // 3. 通过 Bark 推送
    const title = encodeURIComponent('🐾 岁岁的专属提醒');
    const body = encodeURIComponent(finalMessage);
    const barkUrl = `https://api.day.app/${BARK_KEY}/${title}/${body}?icon=https://raw.githubusercontent.com/yinyanghui/Meow_Daily/main/assets/icons/meow-ip.png`;

    console.log('📱 正在发送 Bark 推送...');
    try {
        const res = await fetch(barkUrl);
        if (res.ok) {
            console.log('✅ 推送成功！');
        } else {
            console.error('❌ 推送失败', await res.text());
        }
    } catch (e) {
        console.error('❌ Bark 请求异常', e);
    }
}

main().catch(err => console.error('脚本执行崩溃:', err));
