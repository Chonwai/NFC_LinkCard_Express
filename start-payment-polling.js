const { PaymentPollingService } = require('./dist/payment/services/PaymentPollingService');

async function startPolling() {
  console.log('🚀 啟動支付輪詢服務...');
  
  const pollingService = new PaymentPollingService();
  
  // 每 30 秒檢查一次
  pollingService.startPolling(30000);
  
  console.log('✅ 支付輪詢服務已啟動');
  console.log('📋 服務將每 30 秒檢查一次待處理的支付');
  console.log('💡 如需停止，請按 Ctrl+C');
  
  // 優雅退出處理
  process.on('SIGINT', async () => {
    console.log('\n🛑 收到退出信號，正在停止輪詢...');
    await pollingService.cleanup();
    console.log('✅ 輪詢服務已停止');
    process.exit(0);
  });
}

startPolling().catch(error => {
  console.error('❌ 啟動輪詢服務失敗:', error);
  process.exit(1);
}); 