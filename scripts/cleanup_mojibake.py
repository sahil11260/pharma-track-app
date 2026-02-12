import os
import re

# Define the corrupted patterns and their replacements
patterns = [
    (r'ÃƒÆ\'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å"ÃƒÆ\'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ\'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ', ''),
    (r'ÃƒÆ\'Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å"ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å"Ãƒâ€šÃ‚Â¨ÃƒÆ\'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¼', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å"Ãƒâ€šÃ‚Â¨ÃƒÆ\'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ\'Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ\'Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Ãƒâ€šÃ‚Â ', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§Ãƒâ€šÃ‚Â¾', ''),
    (r'ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å"ÃƒÆ\'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ\'Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¼', ''),
    (r'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹', '₹'),
]

static_dir = 'src/main/resources/static'
count = 0

for root, dirs, files in os.walk(static_dir):
    for file in files:
        if file.endswith(('.html', '.js', '.css')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                modified = False
                for pattern, replacement in patterns:
                    if pattern in content:
                        content = content.replace(pattern, replacement)
                        modified = True
                
                if modified:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f'Cleaned: {filepath}')
                    count += 1
            except Exception as e:
                print(f'Error processing {filepath}: {e}')

print(f'\nTotal files cleaned: {count}')
