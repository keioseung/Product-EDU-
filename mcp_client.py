#!/usr/bin/env python3
"""
Supabase MCP 클라이언트
MCP (Model Context Protocol) 서버와 통신하여 Supabase 데이터베이스 정보를 가져옵니다.
"""

import asyncio
import json
import subprocess
import sys
from typing import Dict, List, Any

class SupabaseMCPClient:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.server_command = [
            "npx", "-y", "@supabase/mcp-server-supabase@latest",
            "--access-token", access_token
        ]
    
    async def start_server(self):
        """MCP 서버 시작"""
        try:
            self.process = await asyncio.create_subprocess_exec(
                *self.server_command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            return True
        except Exception as e:
            print(f"서버 시작 실패: {e}")
            return False
    
    async def send_request(self, method: str, params: Dict = None) -> Dict:
        """MCP 서버에 요청 전송"""
        if not hasattr(self, 'process'):
            await self.start_server()
        
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {}
        }
        
        try:
            request_data = json.dumps(request) + "\n"
            self.process.stdin.write(request_data.encode())
            await self.process.stdin.drain()
            
            response_line = await self.process.stdout.readline()
            response = json.loads(response_line.decode())
            return response
        except Exception as e:
            print(f"요청 전송 실패: {e}")
            return {}
    
    async def list_tools(self) -> List[Dict]:
        """사용 가능한 도구 목록 조회"""
        response = await self.send_request("tools/list")
        return response.get("result", {}).get("tools", [])
    
    async def get_schema(self) -> Dict:
        """데이터베이스 스키마 조회"""
        tools = await self.list_tools()
        
        # 스키마 관련 도구 찾기
        schema_tools = [tool for tool in tools if "schema" in tool.get("name", "").lower()]
        
        if schema_tools:
            tool_name = schema_tools[0]["name"]
            response = await self.send_request("tools/call", {
                "name": tool_name,
                "arguments": {}
            })
            return response.get("result", {})
        else:
            print("스키마 조회 도구를 찾을 수 없습니다.")
            return {}
    
    async def list_tables(self) -> List[str]:
        """테이블 목록 조회"""
        tools = await self.list_tools()
        
        # 테이블 관련 도구 찾기
        table_tools = [tool for tool in tools if any(keyword in tool.get("name", "").lower() 
                                                    for keyword in ["table", "list", "show"])]
        
        if table_tools:
            tool_name = table_tools[0]["name"]
            response = await self.send_request("tools/call", {
                "name": tool_name,
                "arguments": {}
            })
            return response.get("result", {})
        else:
            print("테이블 목록 조회 도구를 찾을 수 없습니다.")
            return []
    
    async def describe_table(self, table_name: str) -> Dict:
        """특정 테이블 구조 조회"""
        tools = await self.list_tools()
        
        # 테이블 설명 도구 찾기
        describe_tools = [tool for tool in tools if any(keyword in tool.get("name", "").lower() 
                                                       for keyword in ["describe", "detail", "info"])]
        
        if describe_tools:
            tool_name = describe_tools[0]["name"]
            response = await self.send_request("tools/call", {
                "name": tool_name,
                "arguments": {"table": table_name}
            })
            return response.get("result", {})
        else:
            print("테이블 설명 도구를 찾을 수 없습니다.")
            return {}
    
    async def get_full_database_info(self) -> Dict:
        """전체 데이터베이스 정보 조회"""
        result = {
            "tools": [],
            "schema": {},
            "tables": [],
            "table_details": {}
        }
        
        try:
            # 1. 사용 가능한 도구 목록
            print("🔧 사용 가능한 도구 조회 중...")
            result["tools"] = await self.list_tools()
            
            # 2. 스키마 정보
            print("📋 스키마 정보 조회 중...")
            result["schema"] = await self.get_schema()
            
            # 3. 테이블 목록
            print("📚 테이블 목록 조회 중...")
            result["tables"] = await self.list_tables()
            
            # 4. 각 테이블 상세 정보
            if isinstance(result["tables"], list):
                print("🔍 테이블 상세 정보 조회 중...")
                for table in result["tables"]:
                    if isinstance(table, str):
                        table_info = await self.describe_table(table)
                        result["table_details"][table] = table_info
                        await asyncio.sleep(0.1)  # 요청 간 지연
            
            return result
            
        except Exception as e:
            print(f"데이터베이스 정보 조회 실패: {e}")
            return result
    
    async def close(self):
        """연결 종료"""
        if hasattr(self, 'process'):
            self.process.terminate()
            await self.process.wait()

async def main():
    """메인 함수"""
    # MCP 설정에서 액세스 토큰 읽기
    access_token = "sbp_df4a7784339daaae2d9339ef4d5323ffcd7cc48d"
    
    client = SupabaseMCPClient(access_token)
    
    try:
        print("🚀 Supabase MCP 클라이언트 시작...")
        
        # 전체 데이터베이스 정보 조회
        db_info = await client.get_full_database_info()
        
        # 결과 출력
        print("\n" + "="*60)
        print("📊 SUPABASE 데이터베이스 구조")
        print("="*60)
        
        # 도구 목록
        if db_info["tools"]:
            print(f"\n🔧 사용 가능한 도구 ({len(db_info['tools'])}개):")
            for tool in db_info["tools"]:
                print(f"  - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
        
        # 스키마 정보
        if db_info["schema"]:
            print(f"\n📋 스키마 정보:")
            print(json.dumps(db_info["schema"], indent=2, ensure_ascii=False))
        
        # 테이블 목록
        if db_info["tables"]:
            print(f"\n📚 테이블 목록 ({len(db_info['tables'])}개):")
            for table in db_info["tables"]:
                print(f"  - {table}")
        
        # 테이블 상세 정보
        if db_info["table_details"]:
            print(f"\n🔍 테이블 상세 정보:")
            for table_name, details in db_info["table_details"].items():
                print(f"\n  📋 {table_name}:")
                if details:
                    print(json.dumps(details, indent=4, ensure_ascii=False))
                else:
                    print("    (정보 없음)")
        
        # JSON 파일로 저장
        output_file = "supabase_schema.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(db_info, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 결과가 '{output_file}' 파일로 저장되었습니다.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        
    finally:
        await client.close()

if __name__ == "__main__":
    # Windows에서 ProactorEventLoop 사용
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(main()) 