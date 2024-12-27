import prisma from '../lib/prisma';

export async function generateSlug(baseSlug: string): Promise<string> {
    // 轉換為小寫並移除特殊字符
    let slug = baseSlug
        .toLowerCase()
        // 將空格轉換為連字符
        .replace(/\s+/g, '-')
        // 只保留允許的字符
        .replace(/[^a-z0-9._-]/g, '')
        // 移除開頭和結尾的連字符
        .replace(/^-+|-+$/g, '')
        // 限制長度為 30 個字符
        .slice(0, 30);

    // 如果 slug 為空（例如全是特殊字符），生成隨機字符串
    if (!slug) {
        slug = Math.random().toString(36).substring(2, 8);
    }

    const existingProfile = await prisma.profile.findUnique({
        where: { slug },
    });

    if (!existingProfile) {
        return slug;
    }

    // 如果 slug 已存在，添加隨機字符串
    const randomStr = Math.random().toString(36).substring(2, 6);
    return `${slug}-${randomStr}`;
}
