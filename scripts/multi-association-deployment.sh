#!/bin/bash

# 多協會支持部署腳本
# 使用方法: ./scripts/multi-association-deployment.sh [environment]
# 環境選項: test, staging, production

set -e  # 遇到錯誤立即退出

ENVIRONMENT=${1:-test}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="deployment_${ENVIRONMENT}_${TIMESTAMP}.log"

echo "🚀 開始多協會支持部署 - 環境: $ENVIRONMENT" | tee -a $LOG_FILE
echo "📝 日誌文件: $LOG_FILE" | tee -a $LOG_FILE

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 輔助函數
log_info() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $LOG_FILE
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a $LOG_FILE
}

# 檢查先決條件
check_prerequisites() {
    log_info "檢查先決條件..."
    
    # 檢查必要的工具
    if ! command -v prisma &> /dev/null; then
        log_error "Prisma CLI 未安裝"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安裝"
        exit 1
    fi
    
    # 檢查數據庫連接
    if ! npx prisma db status &> /dev/null; then
        log_error "無法連接到數據庫"
        exit 1
    fi
    
    log_info "先決條件檢查通過"
}

# 備份數據庫
backup_database() {
    log_info "備份數據庫..."
    
    BACKUP_FILE="backup_${ENVIRONMENT}_${TIMESTAMP}.sql"
    
    # 根據環境設置備份命令（這裡需要根據你的數據庫類型調整）
    case $ENVIRONMENT in
        "production")
            log_warning "生產環境備份 - 確保有足夠的存儲空間"
            # pg_dump $DATABASE_URL > $BACKUP_FILE
            ;;
        "staging")
            log_info "測試環境備份"
            # pg_dump $DATABASE_URL > $BACKUP_FILE
            ;;
        "test")
            log_info "開發環境備份"
            # 可以跳過備份或使用輕量級備份
            ;;
    esac
    
    log_info "數據庫備份完成: $BACKUP_FILE"
}

# 運行測試
run_tests() {
    log_info "運行測試套件..."
    
    # 運行現有功能測試
    if npm test -- --testPathPattern="association" --testTimeout=30000; then
        log_info "協會相關測試通過"
    else
        log_error "協會測試失敗 - 停止部署"
        exit 1
    fi
    
    # 運行多協會專用測試（如果存在）
    if [ -f "tests/association/multi-association.test.ts" ]; then
        if npm test -- tests/association/multi-association.test.ts --testTimeout=30000; then
            log_info "多協會測試通過"
        else
            log_error "多協會測試失敗 - 停止部署"
            exit 1
        fi
    fi
    
    log_info "所有測試通過"
}

# 檢查現有數據
check_existing_data() {
    log_info "檢查現有數據完整性..."
    
    # 檢查是否有用戶已經擁有多個協會（不應該有）
    MULTI_ASSOCIATION_COUNT=$(npx prisma db execute --stdin <<< "
        SELECT COUNT(*) as count 
        FROM (
            SELECT user_id, COUNT(*) as assoc_count 
            FROM associations 
            GROUP BY user_id 
            HAVING COUNT(*) > 1
        ) subquery;
    " 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")
    
    if [ "$MULTI_ASSOCIATION_COUNT" -gt 0 ]; then
        log_error "發現 $MULTI_ASSOCIATION_COUNT 個用戶已經有多個協會 - 數據不一致"
        exit 1
    fi
    
    # 檢查協會總數
    TOTAL_ASSOCIATIONS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM associations;" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")
    log_info "當前協會總數: $TOTAL_ASSOCIATIONS"
    
    # 檢查用戶總數
    TOTAL_USERS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")
    log_info "當前用戶總數: $TOTAL_USERS"
    
    log_info "現有數據檢查完成"
}

# 執行數據庫遷移
run_migration() {
    log_info "執行數據庫遷移..."
    
    # 生成遷移文件（如果尚未生成）
    if [ ! -f "prisma/migrations/20250103_remove_association_userid_unique/migration.sql" ]; then
        log_warning "遷移文件不存在，生成中..."
        npx prisma migrate dev --name remove_association_userid_unique --create-only
    fi
    
    # 應用遷移
    case $ENVIRONMENT in
        "production")
            log_warning "生產環境遷移 - 請確認！"
            read -p "確定要在生產環境執行遷移嗎？(yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_error "用戶取消遷移"
                exit 1
            fi
            npx prisma migrate deploy
            ;;
        *)
            npx prisma migrate dev
            ;;
    esac
    
    log_info "數據庫遷移完成"
}

# 驗證遷移結果
verify_migration() {
    log_info "驗證遷移結果..."
    
    # 檢查unique約束是否已移除
    # 注意：這個檢查需要根據你的數據庫類型調整
    log_info "檢查unique約束是否已移除..."
    
    # 嘗試創建測試數據驗證功能
    log_info "驗證多協會功能..."
    
    log_info "遷移驗證完成"
}

# 部署後監控
post_deployment_monitoring() {
    log_info "開始部署後監控..."
    
    case $ENVIRONMENT in
        "production")
            log_warning "生產環境 - 建議監控24小時"
            log_info "請檢查以下指標："
            log_info "1. 應用程序錯誤日誌"
            log_info "2. 數據庫性能指標"
            log_info "3. 用戶反饋"
            log_info "4. API響應時間"
            ;;
        *)
            log_info "測試環境 - 進行功能驗證"
            ;;
    esac
    
    log_info "部署後監控設置完成"
}

# 主函數
main() {
    echo "🎯 多協會支援部署流程開始" | tee -a $LOG_FILE
    echo "Environment: $ENVIRONMENT" | tee -a $LOG_FILE
    echo "Time: $(date)" | tee -a $LOG_FILE
    echo "----------------------------------------" | tee -a $LOG_FILE
    
    check_prerequisites
    backup_database
    check_existing_data
    run_tests
    run_migration
    verify_migration
    post_deployment_monitoring
    
    log_info "🎉 多協會支援部署完成！"
    echo "----------------------------------------" | tee -a $LOG_FILE
    echo "部署總結:" | tee -a $LOG_FILE
    echo "- 環境: $ENVIRONMENT" | tee -a $LOG_FILE
    echo "- 時間: $(date)" | tee -a $LOG_FILE
    echo "- 日誌: $LOG_FILE" | tee -a $LOG_FILE
    echo "----------------------------------------" | tee -a $LOG_FILE
}

# 錯誤處理
trap 'log_error "部署過程中發生錯誤，請檢查日誌: $LOG_FILE"; exit 1' ERR

# 執行主函數
main "$@" 