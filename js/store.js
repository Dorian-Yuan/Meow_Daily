/**
 * store.js - Meow_Daily 本地状态管理中心
 * 
 * 核心逻辑：
 * 1. 维护内存中的 DB 状态
 * 2. 处理 LocalStorage 持久化
 * 3. 管理“岁岁”等默认示例数据
 */

const STORAGE_KEY = 'meow_daily_db';
const CONFIG_KEY = 'meow_daily_config';

// 默认空数据库结构 (基于 Spec)
const DEFAULT_DB = {
    cats: [
        {
            cat_id: "c_sui_sui",
            name: "岁岁",
            gender: "neutered_male",
            birth_date: "2021-05-20",
            adoption_date: "2021-08-01",
            neutering_date: "2021-12-15"
        }
    ],
    records: {
        "c_sui_sui": {
            routine: [],
            food: [],
            weight: [],
            medical: []
        }
    },
    settings: {
        reminders: [
            { id: "rm_1", label: "剪指甲", days: 14, icon: "✂️" },
            { id: "rm_2", label: "换猫砂", days: 30, icon: "🧹" },
            { id: "rm_3", label: "驱虫", days: 90, icon: "💊" }
        ],
        routine_tags: ['剪指甲', '换猫砂', '驱虫', '洗澡', '梳毛', '刷牙'],
        version: "2.6.2"
    }
};

let dbState = null;

/**
 * 初始化存储
 */
export async function initStore() {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
        try {
            dbState = JSON.parse(localData);
            // 兼容性迁移: 升级旧版的 reminder_cycles 到 reminders
            if (dbState.settings && dbState.settings.reminder_cycles && !dbState.settings.reminders) {
                dbState.settings.reminders = [
                    { id: "rm_" + Date.now() + 1, label: "剪指甲", days: dbState.settings.reminder_cycles.nail_clipping || 14, icon: "✂️" },
                    { id: "rm_" + Date.now() + 2, label: "换猫砂", days: dbState.settings.reminder_cycles.litter_change || 30, icon: "🧹" },
                    { id: "rm_" + Date.now() + 3, label: "驱虫", days: dbState.settings.reminder_cycles.deworming || 90, icon: "💊" }
                ];
                delete dbState.settings.reminder_cycles;
                saveToLocal();
            }
            // 兼容性迁移: 初始化 routine_tags
            if (dbState.settings && !dbState.settings.routine_tags) {
                dbState.settings.routine_tags = ['剪指甲', '换猫砂', '驱虫', '洗澡', '梳毛', '刷牙'];
                saveToLocal();
            }
            // 强制覆盖最新版本号，避免 localStorage 缓存的旧版本号带来展示错误
            if (dbState.settings) {
                dbState.settings.version = DEFAULT_DB.settings.version;
            }
        } catch (e) {
            console.error('解析本地数据失败:', e);
            dbState = { ...DEFAULT_DB };
        }
    } else {
        // 首次使用或换新浏览器，尝试拉取静态托管的 db.json
        try {
            const res = await fetch('./db.json?t=' + Date.now());
            if (res.ok) {
                const cloudData = await res.json();
                dbState = cloudData;
                console.log('🐾 成功从公开环境拉取基础数据');
            } else {
                throw new Error('db.json 返回非 200 状态');
            }
        } catch (e) {
            console.log('🐾 无法拉取公开数据，使用默认模板初始化', e);
            dbState = { ...DEFAULT_DB };
        }
        saveToLocal();
    }
    return dbState;
}

/**
 * 获取当前数据库状态
 */
export function getDB() {
    return dbState;
}

/**
 * 持久化到 LocalStorage (暂存)
 */
export function saveToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
}

/**
 * 获取配置 (PAT, API Key 等)
 */
export function getConfig() {
    const config = localStorage.getItem(CONFIG_KEY);
    return config ? JSON.parse(config) : { 
        githubToken: '', 
        githubRepo: '', // 将在设置页自动尝试填充
        aiKey: '',
        aiModel: 'gpt-3.5-turbo' // 默认值
    };
}

/**
 * 保存配置
 */
export function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * 增加/更新记录 (CRUD 原子操作)
 * @param {string} catId 
 * @param {string} category routine|food|weight|medical
 * @param {object} record 
 */
export function addOrUpdateRecord(catId, category, record) {
    if (!dbState.records[catId]) {
        dbState.records[catId] = { routine: [], food: [], weight: [], medical: [] };
    }
    
    const records = dbState.records[catId][category];
    const index = records.findIndex(r => r.record_id === record.record_id);
    
    if (index > -1) {
        records[index] = record; // 更新
    } else {
        records.push(record); // 新增
    }
    
    saveToLocal();
}

/**
 * 删除记录
 */
export function deleteRecord(catId, category, recordId) {
    if (dbState.records[catId] && dbState.records[catId][category]) {
        dbState.records[catId][category] = dbState.records[catId][category].filter(r => r.record_id !== recordId);
        saveToLocal();
    }
}

/**
 * 更新猫咪档案信息
 */
export function updateCatProfile(catId, updates) {
    const cat = dbState.cats.find(c => c.cat_id === catId);
    if (cat) {
        Object.assign(cat, updates);
        saveToLocal();
    }
}

/**
 * 替换整个 DB 状态 (用于同步后的合并)
 */
export function setDB(newDB) {
    dbState = newDB;
    saveToLocal();
}

/**
 * 合并本地与云端数据 (Pull-Merge 策略)
 * cats/settings 以本地为准，records 取并集 (同 ID 保留本地)
 */
export function mergeDB(localDB, remoteDB) {
    if (!remoteDB || !remoteDB.records) return localDB;
    const merged = JSON.parse(JSON.stringify(localDB));
    for (const catId of Object.keys(remoteDB.records)) {
        if (!merged.records[catId]) {
            merged.records[catId] = { routine: [], food: [], weight: [], medical: [] };
        }
        for (const cat of ['routine', 'food', 'weight', 'medical']) {
            const localRecs = merged.records[catId][cat] || [];
            const remoteRecs = (remoteDB.records[catId]?.[cat]) || [];
            const localIds = new Set(localRecs.map(r => r.record_id));
            for (const r of remoteRecs) {
                if (!localIds.has(r.record_id)) localRecs.push(r);
            }
            merged.records[catId][cat] = localRecs;
        }
    }
    return merged;
}
