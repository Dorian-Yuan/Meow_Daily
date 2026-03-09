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

    const defaultSystemPrompt = `你是一个严格的宠物日记数据提取API。请将用户的自然语言转化为精确的JSON格式。
【重要】如果用户提到了具体日期（如"26年1月31号"），请结合当前时间 (当前时间: ${fmtBJ(getBJTime())})，计算出绝对日期并在 mentioned_time 中直接返回 "YYYY-MM-DD HH:mm" 格式。
【示例】用户说 "26年1月31号去医院"，你应返回 "mentioned_time": "2026-01-31 00:00" (如果没有具体时间，请设为 00:00)。
必须严格遵守以下JSON结构返回，缺失的数据用null表示：
{
  "category": "必须是以下枚举值之一：routine(日常护理), food(饮食), weight(体重), medical(医疗)",
  "parsed_data": {
    // 若 category=weight，必须包含: "weight_kg"(数字), "note"(字符串)
    // 若 category=routine，必须包含: "type"(如驱虫、洗澡、换猫砂等), "note"(字符串)
    // 若 category=food，必须包含: "brand"(品牌), "type"(干粮/罐头等), "daily_intake_g"(数字)
    // 若 category=medical，必须包含: "hospital"(医院), "symptom"(症状), "treatment"(治疗方案), "cost"(数字金额)
  },
  "mentioned_time": "提取用户话语中提及的时间，尽量直接返回 YYYY-MM-DD HH:mm。"
}
严禁输出任何多余的解释性纯文本。`;

    const systemPrompt = (prompts && prompts.parser) ? prompts.parser : defaultSystemPrompt;

    const nowStr = fmtBJ(getBJTime());
    const enrichedText = text + ` (当前时间: ${nowStr})`;

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
                { role: 'user', content: enrichedText }
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

    if (!mentionedTime) return fmtBJ(now);

    // 清理 AI 可能返回的冗余文字 (如 "提取的时间：2026-01-31")
    mentionedTime = mentionedTime.replace(/.*?(\d{2,4}[-年\/].*)/, '$1').trim();

    // 如果只有日期 YYYY-MM-DD，补全时间
    if (/^\d{4}-\d{2}-\d{2}$/.test(mentionedTime)) {
        return mentionedTime + " 00:00";
    }

    // 已经符合标准格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(mentionedTime)) {
        return mentionedTime;
    }

    // 刚才/刚刚
    if (mentionedTime.includes('刚才') || mentionedTime.includes('刚刚')) {
        return fmtBJ(now);
    }

    // 处理 YYYY年MM月DD日 或 YY年MM月DD日 或 MM月DD日
    const dateMatch = mentionedTime.match(/(?:(\d{2,4})年)?(\d{1,2})月(\d{1,2})[日号]?/);
    if (dateMatch) {
        const targetDate = new Date(now);

        let year = dateMatch[1] ? parseInt(dateMatch[1]) : now.getFullYear();
        if (year < 100) year += 2000;

        targetDate.setFullYear(year);
        targetDate.setMonth(parseInt(dateMatch[2]) - 1);
        targetDate.setDate(parseInt(dateMatch[3]));

        const timeMatch = mentionedTime.match(/(\d{1,2})[:点](\d{1,2})?/);
        if (timeMatch) {
            targetDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || 0), 0, 0);
        } else if (mentionedTime.includes('早上') || mentionedTime.includes('早晨')) {
            targetDate.setHours(8, 0, 0, 0);
        } else if (mentionedTime.includes('中午')) {
            targetDate.setHours(12, 0, 0, 0);
        } else if (mentionedTime.includes('下午')) {
            targetDate.setHours(15, 0, 0, 0);
        } else if (mentionedTime.includes('晚上')) {
            targetDate.setHours(20, 0, 0, 0);
        } else {
            targetDate.setHours(0, 0, 0, 0);
        }
        return fmtBJ(targetDate);
    }

    // 相对日期处理
    if (mentionedTime.includes('昨天')) {
        const d = new Date(now);
        d.setDate(now.getDate() - 1);
        const hourMatch = mentionedTime.match(/(\d{1,2})\s*[点时]/);
        if (hourMatch) {
            d.setHours(parseInt(hourMatch[1]), 0, 0, 0);
        } else if (mentionedTime.includes('下午')) {
            d.setHours(15, 0, 0, 0);
        } else if (mentionedTime.includes('晚上')) {
            d.setHours(20, 0, 0, 0);
        } else {
            d.setHours(0, 0, 0, 0);
        }
        return fmtBJ(d);
    }

    if (mentionedTime.includes('前天')) {
        const d = new Date(now);
        d.setDate(now.getDate() - 2);
        d.setHours(0, 0, 0, 0);
        return fmtBJ(d);
    }

    return fmtBJ(now);
}
