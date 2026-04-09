/**
 * app.js - 修复导航逻辑
 */
import { initStore } from './store.js';
import { switchTab, initAIEntry, initSyncButton } from './modules/ui.js';
import { initMeowPhoneTrigger } from './modules/meow_phone.js';

window.addEventListener('DOMContentLoaded', async () => {
    // 初始化数据
    const db = await initStore();
    const version = db.settings?.version || "3.2.5";
    
    console.log(`🐾 Meow_Daily V${version} Build 启动...`);

    // 强制渲染首页
    switchTab('home');
    initAIEntry();
    initSyncButton();
    initMeowPhoneTrigger();

    // 绑定底部导航 (使用事件委派确保可靠性)
    document.querySelector('.bottom-tabbar').addEventListener('click', (e) => {
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const tabName = tabItem.dataset.tab;
            switchTab(tabName);
        }
    });
});
