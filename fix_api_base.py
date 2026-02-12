import os
import re

standard_robust_pb = 'const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");'

patterns = [
    r'const API_BASE\s*=\s*\(typeof window\.API_BASE\s*!==\s*"undefined"\)\s*\?\s*window\.API_BASE\s*:\s*"";',
    r'const API_BASE\s*=\s*\(typeof window\.API_BASE\s*!==\s*"undefined"\)\s*\?\s*window\.API_BASE\s*:\s*\(window\.location\.port\s*===\s*"5500"\s*\?\s*"http://localhost:8080"\s*:\s*""\);',
    r'const API_BASE\s*=\s*\(typeof window\s*!==\s*"undefined"\s*&&\s*typeof window\.API_BASE\s*!==\s*"undefined"\)\s*\?\s*window\.API_BASE\s*:\s*\(window\.location\.port\s*===\s*"5500"\s*\?\s*"http://localhost:8080"\s*:\s*""\);'
]

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern in patterns:
        content = re.sub(pattern, standard_robust_pb, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        # Check for hardcoded /api/ if no API_BASE is found
        if 'const API =' in content and 'API_BASE' not in content:
            # Inject API_BASE at the top of the closure or file
            # Specific for visit-report.js
            if 'visit-report.js' in filepath:
                content = content.replace('const API =', f'    {standard_robust_pb}\n    const API =')
                # Also update the API object keys if they are relative
                content = content.replace("DCRS: '/api/dcrs'", "DCRS: `${API_BASE}/api/dcrs`")
                content = content.replace("MR_STOCK: '/api/mr-stock'", "MR_STOCK: `${API_BASE}/api/mr-stock`")
                content = content.replace("await apiJson(`/api/doctors`)", "await apiJson(`${API_BASE}/api/doctors`)")
                content = content.replace("await apiJson('/api/products')", "await apiJson(`${API_BASE}/api/products`)")
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Injected and Updated {filepath}")

root_dir = r'c:\Users\Administrator\Downloads\Final_KavyaPharmaa\src\main\resources\static'
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.js'):
            update_file(os.path.join(root, file))
