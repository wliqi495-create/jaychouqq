import os
import json

# 模板
template = {
    "key": "",
    "name": "",
    "type": 4,
    "api": "",
    "style": {
        "type": "rect",
        "ratio": 1.33
    },
    "changeable": 1
}

result = []

# 遍历当前目录
for filename in os.listdir('.'):
    if os.path.isfile(filename) and filename.endswith('.py'):
        name = filename[:-3]  # 去掉 .py 后缀
        item = template.copy()
        item['key'] = name
        item['name'] = name
        item['api'] = f"http://zhangqun1818.serv00.net/?sp={name}"
        result.append(item)

# 保存到 JSON 文件
with open('output.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=4)

print(f"生成完成，共 {len(result)} 条数据")