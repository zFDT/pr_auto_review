#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PR评审报告文件服务器 - 支持中文编码
解决浏览器查看中文文本文件乱码问题
"""

import os
import sys
import http.server
import socketserver
import mimetypes
import argparse
from urllib.parse import unquote
from pathlib import Path

class UTF8HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """支持UTF-8编码的HTTP请求处理器"""
    
    def end_headers(self):
        # 为文本文件设置UTF-8编码
        if hasattr(self, '_content_type_set'):
            super().end_headers()
            return
            
        content_type = self.headers.get('Content-Type', '')
        if not content_type:
            # 获取文件路径
            path = self.translate_path(self.path)
            if os.path.isfile(path):
                # 猜测MIME类型
                mime_type, _ = mimetypes.guess_type(path)
                if mime_type:
                    if mime_type.startswith('text/') or mime_type == 'application/json':
                        self.send_header('Content-Type', f'{mime_type}; charset=utf-8')
                        self._content_type_set = True
                    elif path.endswith('.txt') or path.endswith('.log') or path.endswith('.md'):
                        self.send_header('Content-Type', 'text/plain; charset=utf-8')
                        self._content_type_set = True
                    elif path.endswith('.json'):
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self._content_type_set = True
        
        super().end_headers()
    
    def guess_type(self, path):
        """重写MIME类型猜测，确保文本文件使用UTF-8"""
        mime_type, encoding = mimetypes.guess_type(path)
        
        # 为文本文件添加UTF-8编码
        if mime_type and mime_type.startswith('text/'):
            return f'{mime_type}; charset=utf-8'
        elif path.endswith('.txt') or path.endswith('.log') or path.endswith('.md'):
            return 'text/plain; charset=utf-8'
        elif path.endswith('.json'):
            return 'application/json; charset=utf-8'
            
        return mime_type
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        message = format % args
        sys.stderr.write(f"[{self.log_date_time_string()}] {self.address_string()} - {message}\n")

class ReusableTCPServer(socketserver.TCPServer):
    """可重用的TCP服务器"""
    allow_reuse_address = True

def main():
    parser = argparse.ArgumentParser(description='PR评审报告文件服务器')
    parser.add_argument('--port', '-p', type=int, default=8899, help='服务器端口 (默认: 8899)')
    parser.add_argument('--host', default='0.0.0.0', help='绑定地址 (默认: 0.0.0.0)')
    parser.add_argument('--directory', '-d', default='.', help='服务目录 (默认: 当前目录)')
    
    args = parser.parse_args()
    
    # 设置服务目录
    os.chdir(args.directory)
    
    # 注册额外的MIME类型
    mimetypes.add_type('text/plain', '.txt')
    mimetypes.add_type('text/plain', '.log')
    mimetypes.add_type('text/markdown', '.md')
    mimetypes.add_type('application/json', '.json')
    
    try:
        with ReusableTCPServer((args.host, args.port), UTF8HTTPRequestHandler) as httpd:
            server_url = f"http://{args.host}:{args.port}"
            print(f"🚀 PR评审报告文件服务器启动成功")
            print(f"📂 服务目录: {os.getcwd()}")
            print(f"🌐 访问地址: {server_url}")
            print(f"📝 支持UTF-8编码的文本文件查看")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print()
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n⏹️  服务器已停止")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {args.port} 已被占用")
            print(f"💡 请尝试使用其他端口: python3 {sys.argv[0]} --port {args.port + 1}")
        else:
            print(f"❌ 启动服务器失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 服务器错误: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
