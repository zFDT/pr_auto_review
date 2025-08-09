#!/usr/bin/env node

/**
 * 测试生成飞书卡片
 */

const fs = require('fs').promises;
const path = require('path');

// 模拟的数据
const mockData = {
  projectName: "ZM App",
  mrIid: 999,
  mrDetails: {
    title: "feat: 测试飞书卡片布局修复",
    author: {
      name: "test-user"
    },
    source_branch: "feature/test",
    target_branch: "master",
    web_url: "https://git.dreame.tech/fdm_printer/zm_app/-/merge_requests/999"
  },
  analysis: {
    totalFiles: 3,
    addedLines: 25,
    deletedLines: 8,
    potentialIssues: ["测试问题1", "测试问题2"]
  },
  aiAnalysis: {
    quality_score: 7,
    summary: "代码质量良好，建议优化错误处理和添加单元测试。",
    potential_issues: ["缺少错误处理", "测试覆盖率不足", "硬编码配置"],
    improvement_suggestions: ["添加try-catch块", "编写单元测试", "使用配置文件"]
  },
  reportFilePath: "/path/to/pr-review-automation/reports/999/review_git_999_2025-08-09T10-00-00-000Z.txt"
};

// 常量
const CONSTANTS = {
  HTTP_SERVER_PORT: 8899
};

class TestCardGenerator {
  /**
   * 获取本机IP地址
   */
  getLocalIP() {
    try {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      // 优先级：以太网 > Wi-Fi > 其他
      const priorityOrder = ['以太网', 'Ethernet', 'en0', 'WiFi', 'Wi-Fi', 'wlan0'];
      
      // 首先按优先级查找
      for (const priority of priorityOrder) {
        if (nets[priority]) {
          for (const net of nets[priority]) {
            if (net.family === 'IPv4' && !net.internal) {
              return net.address;
            }
          }
        }
      }
      
      // 如果优先级接口没有找到，遍历所有接口
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // 跳过内部地址和IPv6
          if (net.family === 'IPv4' && !net.internal) {
            // 优先选择私有网络地址
            if (net.address.startsWith('192.168.') || 
                net.address.startsWith('10.') || 
                net.address.startsWith('172.')) {
              return net.address;
            }
          }
        }
      }
      
      // 如果没有找到私有地址，返回第一个非内部IPv4地址
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
      
      // 最后的回退选项
      return '127.0.0.1';
    } catch (error) {
      console.warn('获取本机IP失败', error);
      return '127.0.0.1';
    }
  }

  /**
   * 生成文件访问URL
   */
  generateFileURL(filePath) {
    try {
      const ip = this.getLocalIP();
      const reportsDir = path.join(__dirname, 'reports');
      let relativePath = path.relative(reportsDir, filePath);
      
      // 处理文件夹路径，确保以 / 结尾
      if (filePath.endsWith('/') || filePath.endsWith('\\')) {
        if (!relativePath.endsWith('/')) {
          relativePath += '/';
        }
      }
      
      // 标准化路径分隔符为正斜杠
      relativePath = relativePath.replace(/\\/g, '/');
      
      return `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${relativePath}`;
    } catch (error) {
      console.warn('生成URL失败', error);
      return filePath;
    }
  }

  /**
   * 生成飞书卡片数据
   */
  generateFeishuCardData(projectName, mrIid, mrDetails, analysis, aiAnalysis = null, reportFilePath = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 计算统计信息
    const fileCount = analysis.totalFiles;
    const additionCount = analysis.addedLines;
    const deletionCount = analysis.deletedLines;
    const netChange = additionCount - deletionCount;
    
    // 状态评估
    const getFileCountStatus = (count) => count > 15 ? '🔴 较多' : count > 10 ? '🟡 中等' : '🟢 合理';
    const getNetChangeStatus = (net) => Math.abs(net) > 1000 ? '🔴 重大变更' : Math.abs(net) > 500 ? '🟡 较大变更' : '🟢 正常范围';
    
    // AI评分和建议
    let qualityScore = null;
    let qualityColor = '⚪';
    let aiSummary = '';
    let mainIssues = [];
    let mainSuggestions = [];
    
    if (aiAnalysis) {
      let actualAnalysisData = aiAnalysis;
      
      if (aiAnalysis.analysis && typeof aiAnalysis.analysis === 'object') {
        actualAnalysisData = aiAnalysis.analysis;
      }
      
      qualityScore = actualAnalysisData.quality_score;
      if (qualityScore !== null) {
        qualityColor = qualityScore >= 8 ? '🟢' : qualityScore >= 6 ? '🟡' : '🔴';
      }
      aiSummary = actualAnalysisData.summary || '';
      
      if (actualAnalysisData.potential_issues && actualAnalysisData.potential_issues.length > 0) {
        mainIssues = actualAnalysisData.potential_issues.slice(0, 3);
      }
      if (actualAnalysisData.improvement_suggestions && actualAnalysisData.improvement_suggestions.length > 0) {
        mainSuggestions = actualAnalysisData.improvement_suggestions.slice(0, 3);
      }
    }
    
    // 构建飞书交互式卡片
    const cardData = {
      msg_type: "interactive",
      card: {
        config: {
          wide_screen_mode: true,
          enable_forward: true
        },
        header: {
          template: qualityScore >= 8 ? "green" : qualityScore >= 6 ? "yellow" : qualityScore >= 1 ? "red" : "blue",
          title: {
            content: `📋 ${projectName} - PR #${mrIid} 评审完成`,
            tag: "plain_text"
          }
        },
        elements: [
          {
            tag: "div",
            text: {
              content: `**🎯 ${mrDetails.title}**\n👤 **提交者**: ${mrDetails.author.name}\n🌿 **分支**: \`${mrDetails.source_branch}\` → \`${mrDetails.target_branch}\`\n⏰ **时间**: ${timestamp}`,
              tag: "lark_md"
            }
          },
          {
            tag: "hr"
          },
          {
            tag: "div",
            fields: [
              {
                is_short: true,
                text: {
                  content: `**📁 文件数量**\n${fileCount} ${getFileCountStatus(fileCount)}`,
                  tag: "lark_md"
                }
              },
              {
                is_short: true,
                text: {
                  content: `**📊 代码变更**\n+${additionCount}/-${deletionCount} ${getNetChangeStatus(netChange)}`,
                  tag: "lark_md"
                }
              }
            ]
          }
        ]
      }
    };
    
    // 添加AI评分部分
    if (qualityScore !== null) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI评分**: ${qualityColor} ${qualityScore}/10`,
          tag: "lark_md"
        }
      });
    }
    
    // 添加AI总结
    if (aiSummary) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**📋 评估总结**\n${aiSummary}`,
          tag: "lark_md"
        }
      });
    }
    
    // 添加问题和建议
    if (mainIssues.length > 0 || analysis.potentialIssues.length > 0) {
      let issuesText = '**⚠️ 主要问题**\n';
      
      if (analysis.potentialIssues.length > 0) {
        analysis.potentialIssues.slice(0, 2).forEach(issue => {
          issuesText += `• ${issue}\n`;
        });
      }
      
      if (mainIssues.length > 0) {
        mainIssues.forEach(issue => {
          issuesText += `• ${issue}\n`;
        });
      }
      
      cardData.card.elements.push({
        tag: "hr"
      });
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: issuesText.trim(),
          tag: "lark_md"
        }
      });
    }
    
    // 添加改进建议
    if (mainSuggestions.length > 0) {
      let suggestionsText = '**💡 改进建议**\n';
      mainSuggestions.forEach(suggestion => {
        suggestionsText += `• ${suggestion}\n`;
      });
      
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: suggestionsText.trim(),
          tag: "lark_md"
        }
      });
    }
    
    // 添加操作按钮
    cardData.card.elements.push({
      tag: "hr"
    });
    
    // 生成报告和JSON文件的下载链接
    const ip = this.getLocalIP();
    let reportDownloadUrl, reportFolderUrl;
    
    if (reportFilePath) {
      reportDownloadUrl = this.generateFileURL(reportFilePath);
      const mrDir = path.dirname(reportFilePath);
      reportFolderUrl = this.generateFileURL(mrDir + '/');
    } else {
      const reportFileName = `review_git_${mrIid}.txt`;
      reportDownloadUrl = `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${mrIid}/${reportFileName}`;
      reportFolderUrl = `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${mrIid}/`;
    }
    
    // 第一行按钮：查看MR、PR查看、Jenkins构建
    cardData.card.elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: {
            content: "查看 MR",
            tag: "plain_text"
          },
          type: "primary",
          url: mrDetails.web_url
        },
        {
          tag: "button",
          text: {
            content: "🌐 PR 查看",
            tag: "plain_text"
          },
          type: "default",
          url: mrDetails.web_url
        },
        {
          tag: "button",
          text: {
            content: "Jenkins 构建",
            tag: "plain_text"
          },
          type: "default",
          url: `http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${process.env.BUILD_NUMBER || 'latest'}/console`
        }
      ]
    });
    
    // 第二行按钮：下载报告、流程产物
    cardData.card.elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: {
            content: "📄 下载报告",
            tag: "plain_text"
          },
          type: "default",
          url: reportDownloadUrl
        },
        {
          tag: "button",
          text: {
            content: "📂 流程产物",
            tag: "plain_text"
          },
          type: "default",
          url: reportFolderUrl
        }
      ]
    });
    
    return cardData;
  }
}

async function test() {
  const generator = new TestCardGenerator();
  
  console.log('🌐 当前IP地址:', generator.getLocalIP());
  console.log();
  
  // 生成飞书卡片数据
  const cardData = generator.generateFeishuCardData(
    mockData.projectName,
    mockData.mrIid,
    mockData.mrDetails,
    mockData.analysis,
    mockData.aiAnalysis,
    mockData.reportFilePath
  );
  
  // 保存到测试文件
  const testFile = path.join(__dirname, 'test_feishu_card.json');
  await fs.writeFile(testFile, JSON.stringify(cardData, null, 2), 'utf8');
  
  console.log('✅ 测试飞书卡片已生成:', testFile);
  console.log();
  console.log('📋 卡片结构预览:');
  console.log('标题:', cardData.card.header.title.content);
  console.log('元素数量:', cardData.card.elements.length);
  
  // 显示按钮布局
  const actionElements = cardData.card.elements.filter(el => el.tag === 'action');
  console.log('按钮行数:', actionElements.length);
  
  actionElements.forEach((actionEl, index) => {
    console.log(`第${index + 1}行按钮:`, actionEl.actions.map(btn => btn.text.content).join(' | '));
    actionEl.actions.forEach((btn, btnIndex) => {
      console.log(`  - ${btn.text.content}: ${btn.url}`);
    });
  });
}

test().catch(console.error);
