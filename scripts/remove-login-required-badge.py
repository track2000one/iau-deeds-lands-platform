from pathlib import Path

path = Path('src/app/pages/LoginPage.tsx')
text = path.read_text(encoding='utf-8')

anchor = '''        .neo-field-label {\n          padding-inline: 12px;\n          color: #6f7b87;\n          font-size: 10.5px;\n          font-weight: 800;\n        }\n'''
insert = anchor + '''\n        /* Login credentials are inherently required; keep the form clean without the global \"مطلوب\" badge. */\n        .neo-login-page .neo-field-label[data-app-required-label=\"true\"] {\n          display: block;\n        }\n\n        .neo-login-page .neo-field-label[data-app-required-label=\"true\"]::after {\n          content: none !important;\n          display: none !important;\n        }\n'''

if 'Login credentials are inherently required' in text:
    print('Login required badge override already present')
    raise SystemExit(0)

if anchor not in text:
    raise SystemExit('Could not find neo-field-label style anchor')

path.write_text(text.replace(anchor, insert, 1), encoding='utf-8')
print('Removed required badge presentation from login labels')
