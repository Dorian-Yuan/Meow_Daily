/**
 * github.js - GitHub REST API 封装
 * 实现 Pull-Merge-Push 同步逻辑
 */

/**
 * 获取云端最新文件及其 SHA
 */
export async function fetchCloudDB(config) {
    const { githubToken, githubRepo } = config;
    const url = `https://api.github.com/repos/${githubRepo}/contents/db.json?t=${Date.now()}`; // 增加时间戳防止缓存
    
    const res = await fetch(url, {
        headers: {
            'Authorization': `token ${githubToken}`, // 兼容性更好的 token 前缀
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
        }
    });

    if (res.status === 404) {
        return { db: null, sha: null };
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`云端拉取失败: ${res.status} ${errorData.message || ''}`);
    }
    
    const data = await res.json();
    try {
        // 移除可能存在的换行符并解码
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
    
    // 严谨的 UTF-8 转 Base64 逻辑
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
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) {
        throw new Error(`上传失败: ${res.status} ${result.message || ''}`);
    }
    return result;
}
