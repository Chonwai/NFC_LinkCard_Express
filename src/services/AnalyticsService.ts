// import prisma from '../lib/prisma';
// import { HttpException } from '../utils/HttpException';

// export class AnalyticsService {
//     async recordClick(
//         linkId: string,
//         data: {
//             visitor_ip: string;
//             user_agent?: string;
//             referer?: string;
//             country?: string;
//             city?: string;
//             meta?: Record<string, any>;
//         },
//     ) {
//         const link = await prisma.link.findUnique({
//             where: { id: linkId },
//         });

//         if (!link) {
//             throw new HttpException(404, '連結不存在');
//         }

//         await prisma.$transaction([
//             prisma.analytics.create({
//                 data: {
//                     link_id: linkId,
//                     ...data,
//                 },
//             }),
//             prisma.link.update({
//                 where: { id: linkId },
//                 data: {
//                     click_count: {
//                         increment: 1,
//                     },
//                 },
//             }),
//         ]);
//     }

//     async getLinkAnalytics(linkId: string, userId: string) {
//         const link = await prisma.link.findFirst({
//             where: { id: linkId, user_id: userId },
//         });

//         if (!link) {
//             throw new HttpException(404, '連結不存在或無權訪問');
//         }

//         return await prisma.analytics.findMany({
//             where: { link_id: linkId },
//             orderBy: { timestamp: 'desc' },
//         });
//     }
// }
