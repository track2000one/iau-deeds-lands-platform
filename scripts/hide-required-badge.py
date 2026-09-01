from pathlib import Path

path = Path('src/styles/globals.css')
text = path.read_text(encoding='utf-8')
marker = '/* ===== Hide required text badge; yellow field remains the visual cue ===== */'
block = '''\n\n/* ===== Hide required text badge; yellow field remains the visual cue ===== */\nlabel[data-app-required-label="true"]::after {\n  content: none !important;\n  display: none !important;\n}\n'''
if marker not in text:
    text = text.rstrip() + block + '\n'
path.write_text(text, encoding='utf-8')
print('Required text badge hidden globally')
