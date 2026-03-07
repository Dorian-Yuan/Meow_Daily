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
        reminder_cycles: {
            nail_clipping: 14,
            litter_change: 30,
            deworming: 90
        }
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
        } catch (e) {
            console.error('解析本地数据失败:', e);
            dbState = { ...DEFAULT_DB };
        }
    } else {
        // 首次使用，初始化示例
        dbState = { ...DEFAULT_DB };
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
