/**
 * weekly_report.js
 * 每周日运行，生成岁岁的本周总结
 */
import fs from 'fs';
import path from 'path';

const BARK_KEY = process.env.BARK_KEY;
const AI_KEY = process.env.CHATANYWHERE_API_KEY;
const DB_PATH = path.resolve('./db.json');

async function main() {
    if (!BARK_KEY) return;

    console.log('📊 开始生成本周总结...');
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const cat = db.cats[0];
    const records = db.records[cat.cat_id] || {};

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. 提取过去 7 天的数据
    const weekData = {
        routineCount: 0,
        foodCost: 0,
        medicalCost: 0,
        weightLogs: [],
        rawLogs: []
    };

    const filterWeek = (list) => (list || []).filter(r => new Date(r.timestamp) >= oneWeekAgo);

    const thisWeekRoutines = filterWeek(records.routine);
    const thisWeekFood = filterWeek(records.food);
    const thisWeekMedical = filterWeek(records.medical);
    const thisWeekWeight = filterWeek(records.weight);

    weekData.routineCount = thisWeekRoutines.length;
    thisWeekFood.forEach(r => weekData.foodCost += (r.cost || 0));
    thisWeekMedical.forEach(r => weekData.medicalCost += (r.cost || 0));
    weekData.weightLogs = thisWeekWeight.map(r => `${r.timestamp}: ${r.weight_kg}kg`);

    // 汇总给 AI 的原始信息
    const summaryInfo = `
        猫咪名称: ${cat.name}
        本周日常护理次数: ${weekData.routineCount}
        本周饮食开销: ￥${weekData.foodCost}
        本周医疗开销: ￥${weekData.medicalCost}
        体重记录: ${weekData.weightLogs.join(', ') || '无记录'}
    `;

    console.log('🤖 正在请求 AI 生成周报...');

    // 2. 调用 AI 生成治愈系周报
    let reportText = summaryInfo;
    if (AI_KEY) {
        try {
            const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: '你是一只叫“岁岁”的橘猫。请根据提供的本周数据，给主人写一封简短的本周总结。要求：语气治愈、偶尔傲娇，包含本周开销汇总和健康建议（如体重变化）。字数 150 字以内，多用 emoji。' },
                        { role: 'user', content: summaryInfo }
                    ]
                })
            });
            const data = await response.json();
            reportText = data.choices[0].message.content;
        } catch (e) {
            console.error('AI 报告生成失败', e);
        }
    }

    // 3. 推送
    const title = encodeURIComponent(`🐾 ${cat.name} 的本周总结`);
    const body = encodeURIComponent(reportText);
    const barkUrl = `https://api.day.app/${BARK_KEY}/${title}/${body}?group=MeowDaily&icon=https://raw.githubusercontent.com/Dorian-Yuan/Meow_Daily/main/assets/icons/meow-ip.png`;

    await fetch(barkUrl);
    console.log('✅ 周报已推送！');
}

main().catch(console.error);
