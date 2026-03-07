/**
 * github.js - GitHub REST API 封装
 * 实现 Pull-Merge-Push 同步逻辑
 */

/**
 * 获取云端最新文件及其 SHA
 */
export async function fetchCloudDB(config) {
    const { githubToken, githubRepo } = config;
    // 移除可能导致 400 错误的查询参数
    const url = `https://api.github.com/repos/${githubRepo}/contents/db.json`; 
    
    const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store', // 使用原生 fetch 缓存控制，避免触发 CORS 预检失败
        headers: {
            'Authorization': `Bearer ${githubToken}`, // 恢复为标准 Bearer
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (res.status === 404) {
        return { db: null, sha: null };
    }

    if (!res.ok) {
        // 尝试获取更具体的错误消息
        let errorMsg = '请求失败';
        try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
        } catch(e) {}
        throw new Error(`云端拉取失败 (${res.status}): ${errorMsg}`);
    }
    
    const data = await res.json();
    try {
        const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
        return {
            db: JSON.parse(content),
            sha: data.sha
        };
    } catch (e) {
        throw new Error('云端数据解析失败，请检查 db.json 格式');
    }
}

/**
 * 将合并后的数据推送到云端
 */
export async function pushCloudDB(config, db, sha) {
    const { githubToken, githubRepo } = config;
    const url = `https://api.github.com/repos/${githubRepo}/contents/db.json`;
    
    const jsonStr = JSON.stringify(db, null, 2);
    const content = btoa(unescape(encodeURIComponent(jsonStr)));

    const payload = {
        message: `Update db.json via Meow_Daily PWA [${new Date().toLocaleString()}]`,
        content: content
    };

    if (sha) {
        payload.sha = sha;
    }

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        let errorMsg = '上传失败';
        try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
        } catch(e) {}
        throw new Error(`同步推送失败 (${res.status}): ${errorMsg}`);
    }
    return await res.json();
}
