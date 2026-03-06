/**
 * app.js - 修复导航逻辑
 */
import { initStore } from './store.js';
import { switchTab, initAIEntry } from './modules/ui.js';

window.addEventListener('DOMContentLoaded', async () => {
    console.log('🐾 Meow_Daily 重构版启动...');
    
    // 初始化数据
    await initStore();
    
    // 强制渲染首页
    switchTab('home');
    initAIEntry();

    // 绑定底部导航 (使用事件委派确保可靠性)
    document.querySelector('.bottom-tabbar').addEventListener('click', (e) => {
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const tabName = tabItem.dataset.tab;
            switchTab(tabName);
        }
    });
});
