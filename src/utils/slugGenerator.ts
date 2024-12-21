import prisma from '../lib/prisma';

export async function generateSlug(baseSlug: string): Promise<string> {
    const slug = baseSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existingProfile = await prisma.profile.findUnique({
        where: { slug },
    });

    if (!existingProfile) {
        return slug;
    }

    // 如果 slug 已存在，添加數字後綴
    let counter = 1;
    let newSlug = `${slug}-${counter}`;

    while (await prisma.profile.findUnique({ where: { slug: newSlug } })) {
        counter++;
        newSlug = `${slug}-${counter}`;
    }

    return newSlug;
}
