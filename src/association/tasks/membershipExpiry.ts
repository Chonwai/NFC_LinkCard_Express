import { MemberService } from '../services/MemberService';
import { Container } from 'typedi';
import { logger } from '../../utils/logger';

/**
 * 檢查會員資格過期任務
 * 此任務用於自動檢查並處理過期的會員資格
 */
export async function checkMembershipExpiries() {
    try {
        const memberService = Container.get(MemberService);
        logger.info('開始執行會員資格過期檢查任務');

        const result = await memberService.checkExpiredMemberships();

        logger.info(`會員資格過期檢查完成: 處理了 ${result.processed} 個會員`);

        // 統計成功和失敗數量
        const successCount = result.results.filter((r) => r.success).length;
        const failCount = result.results.filter((r) => !r.success).length;

        if (failCount > 0) {
            logger.warn(`會員資格過期處理: ${successCount} 個成功, ${failCount} 個失敗`);
            // 記錄失敗的具體會員
            const failures = result.results.filter((r) => !r.success);
            failures.forEach((failure) => {
                logger.error(`會員 ${failure.id} 處理失敗: ${failure.error}`);
            });
        } else if (successCount > 0) {
            logger.info(`成功處理 ${successCount} 個過期會員資格`);
        } else {
            logger.info('沒有發現需要處理的過期會員資格');
        }

        return result;
    } catch (error) {
        logger.error('執行會員資格過期檢查任務時發生錯誤:', error);
        throw error;
    }
}
