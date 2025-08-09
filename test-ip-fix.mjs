#!/usr/bin/env node

/**
 * 测试IP获取和飞书卡片生成
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置调试模式
global.DEBUG_IP = true;

// 导入PR评审器类
async function testIPAndFeishu() {
  try {
    console.log('🧪 开始测试IP获取和飞书卡片生成...\n');
    
    // 加载配置并创建测试用的PR评审器实例
    const { PRReviewer, loadConfig } = await import('./pr-reviewer.js');
    const config = await loadConfig();
    const reviewer = new PRReviewer(config);
    
    // 测试IP获取
    console.log('1️⃣ 测试IP获取:');
    const ip = reviewer.getLocalIP();
    console.log(`   获取到的IP: ${ip}\n`);
    
    // 模拟数据
    const mockData = {
      projectName: "ZM App",
      mrIid: 180,
      mrDetails: {
        title: "feat: 测试IP获取和UTF-8编码修复",
        author: { name: "test-user" },
        source_branch: "feature/fix-ip-utf8",
        target_branch: "master",
        web_url: "https://git.dreame.tech/fdm_printer/zm_app/-/merge_requests/180"
      },
      analysis: {
        totalFiles: 2,
        addedLines: 15,
        deletedLines: 5,
        potentialIssues: ["需要验证IP获取逻辑", "检查UTF-8编码支持"]
      },
      aiAnalysis: {
        quality_score: 8,
        summary: "IP获取逻辑优化，文件服务器支持UTF-8编码，提升用户体验。",
        potential_issues: ["需要测试不同网络环境", "确保跨平台兼容性"],
        improvement_suggestions: ["添加IP获取失败的兜底方案", "增加编码检测功能"]
      },
      reportFilePath: `/path/to/pr-review-automation/reports/180/review_git_180_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    };
    
    // 生成飞书卡片
    console.log('2️⃣ 生成飞书卡片:');
    const cardData = reviewer.generateFeishuCardData(
      mockData.projectName,
      mockData.mrIid,
      mockData.mrDetails,
      mockData.analysis,
      mockData.aiAnalysis,
      mockData.reportFilePath
    );
    
    // 保存测试卡片
    const testDir = path.join(__dirname, 'reports', '180');
    await fs.mkdir(testDir, { recursive: true });
    
    const cardFile = path.join(testDir, 'feishu_card_180.json');
    await fs.writeFile(cardFile, JSON.stringify(cardData, null, 2), 'utf8');
    
    console.log(`   ✅ 飞书卡片已保存: ${cardFile}\n`);
    
    // 检查URL
    console.log('3️⃣ 检查生成的URL:');
    const actionElements = cardData.card.elements.filter(el => el.tag === 'action');
    
    actionElements.forEach((actionEl, index) => {
      console.log(`   第${index + 1}行按钮:`);
      actionEl.actions.forEach(btn => {
        const isLocalURL = btn.url.includes('127.0.0.1') || btn.url.includes('localhost');
        const status = isLocalURL ? '❌ (使用本地地址)' : '✅ (使用网络地址)';
        console.log(`     - ${btn.text.content}: ${btn.url} ${status}`);
      });
    });
    
    // 创建测试报告文件
    const reportContent = `# PR #180 评审报告

## 📋 基本信息
- **标题**: ${mockData.mrDetails.title}
- **提交者**: ${mockData.mrDetails.author.name}
- **分支**: ${mockData.mrDetails.source_branch} → ${mockData.mrDetails.target_branch}
- **时间**: ${new Date().toLocaleString('zh-CN')}

## 🎯 修复内容

### 1. IP地址获取优化
- 修复了飞书卡片中URL使用127.0.0.1的问题
- 优化网络接口检测逻辑
- 增加调试信息便于排查

### 2. UTF-8编码支持
- 创建了支持UTF-8编码的文件服务器
- 解决浏览器查看中文文本文件乱码问题
- 正确设置Content-Type头

## 🧪 测试结果

当前获取的IP地址: ${ip}

${ip === '127.0.0.1' ? '⚠️ 警告: 仍在使用本地地址，请检查网络配置' : '✅ 成功获取网络地址'}

## 💡 建议

1. 确保文件服务器使用新的UTF-8服务器脚本
2. 在不同网络环境下测试IP获取
3. 验证浏览器中文文件显示效果

---
*本报告由自动化工具生成，测试时间: ${new Date().toISOString()}*
`;
    
    await fs.writeFile(mockData.reportFilePath, reportContent, 'utf8');
    console.log(`\n4️⃣ 测试报告已生成: ${mockData.reportFilePath}`);
    
    // 生成文件URL用于测试
    const reportURL = reviewer.generateFileURL(mockData.reportFilePath);
    const folderURL = reviewer.generateFileURL(path.dirname(mockData.reportFilePath) + '/');
    
    console.log('\n🔗 测试URL:');
    console.log(`   报告文件: ${reportURL}`);
    console.log(`   文件夹: ${folderURL}`);
    
    console.log('\n✅ 测试完成！');
    console.log('\n📝 下一步:');
    console.log('   1. 启动文件服务器: ./file-server.sh start');
    console.log(`   2. 测试中文显示: curl -I "${reportURL}"`);
    console.log(`   3. 浏览器访问: ${reportURL}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testIPAndFeishu();
