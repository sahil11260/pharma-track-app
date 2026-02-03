import os

def fix_api_base(directory):
    target_string = 'const API_BASE = "https://pharma-track-app.onrender.com";'
    # Also handle single quotes or slightly different versions
    replacements = [
        ('const API_BASE = "https://pharma-track-app.onrender.com";', 'const API_BASE = "";'),
        ('const API_BASE = \'https://pharma-track-app.onrender.com\';', 'const API_BASE = "";'),
        ('let API_BASE = "https://pharma-track-app.onrender.com";', 'let API_BASE = "";'),
        ('let API_BASE = \'https://pharma-track-app.onrender.com\';', 'let API_BASE = "";'),
        ('https://pharma-track-app.onrender.com/api', '/api')
    ]

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for old, new in replacements:
                        new_content = new_content.replace(old, new)
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {path}")
                except Exception as e:
                    print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    static_dir = r"c:\Users\Administrator\Downloads\Final_KavyaPharmaa\pharma-backend\src\main\resources\static"
    fix_api_base(static_dir)
