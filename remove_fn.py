from pathlib import Path
import re
path=Path('components/DealsTable.tsx')
text = path.read_text(encoding='utf-8')
pattern = 'function formatEndsAt.*?}\n'
text = re.sub(pattern, '', text, count=1, flags=re.S)
path.write_text(text, encoding='utf-8')
