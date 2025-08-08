#!/usr/bin/env node

import { Gitlab } from "@gitbeaker/rest";

// 创建 GitLab 客户端测试
const api = new Gitlab({
  host: "https://git.dreame.tech",
  token: "test-token"
});

// 检查 MergeRequests 的可用方法
console.log("GitLab API 对象结构:");
console.log("api.MergeRequests:", typeof api.MergeRequests);

if (api.MergeRequests) {
  console.log("MergeRequests 属性:");
  console.log(Object.getOwnPropertyNames(api.MergeRequests));
  
  console.log("MergeRequests 方法:");
  const prototype = Object.getPrototypeOf(api.MergeRequests);
  console.log(Object.getOwnPropertyNames(prototype));
}

// 检查可用的资源
console.log("\nGitLab API 资源:");
console.log(Object.keys(api));
