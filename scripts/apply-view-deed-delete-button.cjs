const fs = require('fs');

const path = 'src/app/pages/ViewDeedPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const before = `              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-sm md:text-base"
              >`;

const after = `              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="border border-red-400/90 bg-gradient-to-b from-red-50 via-red-50 to-red-100 text-sm font-bold text-red-600 shadow-[0_5px_0_rgba(185,28,28,0.24),0_9px_18px_rgba(220,38,38,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-150 hover:-translate-y-0.5 hover:border-red-500 hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:shadow-[0_7px_0_rgba(185,28,28,0.26),0_12px_22px_rgba(220,38,38,0.18),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[3px] active:shadow-[0_2px_0_rgba(185,28,28,0.24),0_4px_8px_rgba(220,38,38,0.12)] md:text-base"
              >`;

if (!content.includes(before)) {
  throw new Error('View deed delete button pattern was not found');
}

content = content.replace(before, after);
fs.writeFileSync(path, content, 'utf8');
console.log('View deed delete button is now clearly visible with Soft 3D styling.');
