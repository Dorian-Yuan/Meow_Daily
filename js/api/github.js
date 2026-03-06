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
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!res.ok) throw new Error('无法获取云端数据，请检查仓库路径与 Token');
    
    const data = await res.json();
    // GitHub 返回的内容是 base64 编码的
    const content = decodeURIComponent(escape(atob(data.content)));
    return {
        db: JSON.parse(content),
        sha: data.sha
    };
}

/**
 * 将合并后的数据推送到云端
 */
export async function pushCloudDB(config, db, sha) {
    const { githubToken, githubRepo } = config;
    const url = `https://api.github.com/repos/${githubRepo}/contents/db.json`;
    
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Update db.json via Meow_Daily PWA`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2)))),
            sha: sha
        })
    });

    if (!res.ok) throw new Error('推送失败，可能存在并发修改或权限不足');
    return await res.json();
}
