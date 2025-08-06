#!/usr/bin/env node
import { Gitlab } from "@gitbeaker/rest";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('错误: 无法读取配置文件 config.json');
    console.error(error.message);
    process.exit(1);
  }
}

async function testGitlab() {
  const config = await loadConfig();
  const api = new Gitlab({
    host: config.gitlab.host,
    token: config.gitlab.token
  });

  try {
    console.log('测试GitLab连接...');
    console.log(`Host: ${config.gitlab.host}`);
    
    // 获取项目列表
    console.log('\n获取项目列表...');
    const projects = await api.Projects.all({ membership: true });
    
    console.log(`找到 ${projects.length} 个项目:`);
    projects.slice(0, 10).forEach(project => {
      console.log(`- ID: ${project.id}, 名称: ${project.name}, 路径: ${project.path_with_namespace}`);
    });
    
    // 如果配置中有项目，尝试获取其详情
    if (config.projects["ZM App"]) {
      const projectId = config.projects["ZM App"].id;
      console.log(`\n尝试获取项目ID ${projectId} 的详情...`);
      try {
        const project = await api.Projects.show(projectId);
        console.log(`项目详情: ${project.name} (${project.path_with_namespace})`);
        
        // 获取开放的MR
        console.log('\n获取开放的Merge Requests...');
        const mrs = await api.MergeRequests.all({ projectId: projectId, state: 'opened' });
        console.log(`找到 ${mrs.length} 个开放的MR:`);
        mrs.slice(0, 5).forEach(mr => {
          console.log(`- MR #${mr.iid}: ${mr.title}`);
        });
        
      } catch (error) {
        console.error(`获取项目 ${projectId} 失败:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('GitLab API 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

testGitlab();
