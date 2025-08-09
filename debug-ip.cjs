#!/usr/bin/env node

/**
 * 调试IP获取逻辑
 */

const { networkInterfaces } = require('os');

function debugIPLookup() {
  console.log('🔍 网络接口调试信息:');
  console.log('================================');
  
  const nets = networkInterfaces();
  
  // 显示所有网络接口
  for (const name of Object.keys(nets)) {
    console.log(`\n接口: ${name}`);
    for (const net of nets[name]) {
      if (net.family === 'IPv4') {
        console.log(`  - ${net.address} (内部: ${net.internal}, MAC: ${net.mac})`);
      }
    }
  }
  
  console.log('\n🎯 IP获取测试:');
  console.log('================================');
  
  // 测试优先级查找
  const priorityOrder = ['以太网', 'Ethernet', 'en0', 'WiFi', 'Wi-Fi', 'wlan0'];
  
  console.log('1. 优先级接口查找:');
  for (const priority of priorityOrder) {
    if (nets[priority]) {
      console.log(`   ✓ 找到接口: ${priority}`);
      for (const net of nets[priority]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`   → 可用IP: ${net.address}`);
        }
      }
    } else {
      console.log(`   ✗ 未找到接口: ${priority}`);
    }
  }
  
  // 测试私有网络地址查找
  console.log('\n2. 私有网络地址查找:');
  const privateIPs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.') || 
            net.address.startsWith('10.') || 
            net.address.startsWith('172.')) {
          privateIPs.push({ interface: name, ip: net.address });
          console.log(`   ✓ ${name}: ${net.address}`);
        }
      }
    }
  }
  
  // 测试所有外部地址
  console.log('\n3. 所有外部IPv4地址:');
  const allExternalIPs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        allExternalIPs.push({ interface: name, ip: net.address });
        console.log(`   ✓ ${name}: ${net.address}`);
      }
    }
  }
  
  console.log('\n🌐 最终选择逻辑模拟:');
  console.log('================================');
  
  // 模拟实际的选择逻辑
  let selectedIP = '127.0.0.1';
  let reason = '默认回退';
  
  // 优先级查找
  for (const priority of priorityOrder) {
    if (nets[priority]) {
      for (const net of nets[priority]) {
        if (net.family === 'IPv4' && !net.internal) {
          selectedIP = net.address;
          reason = `优先接口 ${priority}`;
          break;
        }
      }
      if (selectedIP !== '127.0.0.1') break;
    }
  }
  
  // 如果优先级没找到，查找私有网络
  if (selectedIP === '127.0.0.1' && privateIPs.length > 0) {
    selectedIP = privateIPs[0].ip;
    reason = `私有网络 ${privateIPs[0].interface}`;
  }
  
  // 如果还没找到，使用第一个外部地址
  if (selectedIP === '127.0.0.1' && allExternalIPs.length > 0) {
    selectedIP = allExternalIPs[0].ip;
    reason = `外部地址 ${allExternalIPs[0].interface}`;
  }
  
  console.log(`选择的IP: ${selectedIP}`);
  console.log(`选择原因: ${reason}`);
  
  return { selectedIP, reason, privateIPs, allExternalIPs };
}

// 运行调试
const result = debugIPLookup();

console.log('\n📊 总结:');
console.log('================================');
console.log(`推荐IP: ${result.selectedIP}`);
console.log(`私有IP数量: ${result.privateIPs.length}`);
console.log(`外部IP数量: ${result.allExternalIPs.length}`);

// 生成URL测试
const testPort = 8899;
const testPath = 'reports/179/review_git_179_2025-08-09T08-13-48-868Z.txt';
console.log(`\n🔗 测试URL: http://${result.selectedIP}:${testPort}/${testPath}`);
