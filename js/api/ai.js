/**
 * ai.js - ChatAnywhere API 封装
 * 负责将自然语言解析为结构化 JSON
 * 全局强制 Asia/Shanghai 时区
 */
import { getConfig } from '../store.js';

/** 获取北京时间 Date 对象 */
function getBJTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

/** 格式化为 YYYY-MM-DD HH:mm */
function fmtBJ(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 请求 AI 解析文本
 */
export async function parseTextWithAI(text) {
    const config = getConfig();
    const { aiKey, aiModel, prompts } = config;

    if (!aiKey) throw new Error('请先在设置中配置 AI API Key');

    const defaultSystemPrompt = `你是一个严格的宠物日记数据提取API。请将用户的自然语言转化为精确的JSON格式。不要生成任何绝对时间戳（时间戳由前端系统自动生成）。
必须严格遵守以下JSON结构返回，缺失的数据用null表示：
{
  "category": "必须是以下枚举值之一：routine(日常护理), food(饮食), weight(体重), medical(医疗)",
  "parsed_data": {
    // 若 category=weight，必须包含: "weight_kg"(数字), "note"(字符串)
    // 若 category=routine，必须包含: "type"(如驱虫、洗澡、换猫砂等), "note"(字符串)
    // 若 category=food，必须包含: "brand"(品牌), "type"(干粮/罐头等), "daily_intake_g"(数字)
    // 若 category=medical，必须包含: "hospital"(医院), "symptom"(症状), "treatment"(治疗方案), "cost"(数字金额)
  },
  "mentioned_time": "提取用户话语中提及的时间状语（如'昨天晚上8点'、'刚刚'），若未提及则返回空字符串。"
}
严禁输出任何多余的解释性纯文本。`;

    const systemPrompt = (prompts && prompts.parser) ? prompts.parser : defaultSystemPrompt;

    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: aiModel || 'gpt-3.5-turbo',
            response_format: { "type": "json_object" },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ]
        })
    });

    if (!response.ok) throw new Error('AI 解析请求失败，请检查 API Key 或模型配置');

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
}

/**
 * 处理提及的时间状语，返回 YYYY-MM-DD HH:mm (北京时间)
 */
export function processMentionedTime(mentionedTime) {
    const now = getBJTime();

    if (!mentionedTime || mentionedTime.includes('刚才') || mentionedTime.includes('刚刚')) {
        return fmtBJ(now);
    }

    if (mentionedTime.includes('昨天')) {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        // 尝试提取具体时间
        const hourMatch = mentionedTime.match(/(\d{1,2})\s*[点时]/);
        if (hourMatch) y.setHours(parseInt(hourMatch[1]), 0);
        return fmtBJ(y);
    }

    if (mentionedTime.includes('前天')) {
        const d = new Date(now);
        d.setDate(now.getDate() - 2);
        return fmtBJ(d);
    }

    // 默认使用当前北京时间
    return fmtBJ(now);
}
