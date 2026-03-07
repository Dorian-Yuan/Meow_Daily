/**
 * github.js - GitHub REST API 封装
 * 实现 Pull-Merge-Push 同步逻辑
 */

/**
 * 获取云端最新文件及其 SHA
 */
export async function fetchCloudDB(config) {
    const { githubToken, githubRepo } = config;
    const url = `https://api.github.com/repos/${githubRepo}/contents/db.json`;
    
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    if (res.status === 404) {
        // 如果文件不存在，返回空 DB 和 null SHA
        return { db: null, sha: null };
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`无法获取云端数据: ${res.status} ${errorData.message || ''}`);
    }
    
    const data = await res.json();
    // GitHub 返回的内容是 base64 编码的
    try {
        const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
        return {
            db: JSON.parse(content),
            sha: data.sha
        };
    } catch (e) {
        console.error('Base64 解析失败:', e);
        throw new Error('云端数据格式错误，解析失败');
    }
}

/**
 * 将合并后的数据推送到云端
 */
export async function pushCloudDB(config, db, sha) {
    const { githubToken, githubRepo } = config;
    const url = `https://api.github.com/repos/${githubRepo}/contents/db.json`;
    
    // 强制 UTF-8 编码为 Base64
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2))));

    const payload = {
        message: `Update db.json via Meow_Daily PWA`,
        content: content
    };

    // 如果是更新文件，必须提供 sha
    if (sha) {
        payload.sha = sha;
    }

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`推送失败: ${res.status} ${errorData.message || ''}`);
    }
    return await res.json();
}
