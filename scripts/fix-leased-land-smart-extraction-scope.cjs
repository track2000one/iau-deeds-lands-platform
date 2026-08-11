const fs = require('fs');

const targets = [
  {
    path: 'src/app/pages/LeasedLandsOutPage.tsx',
    component: 'LeasedLandOutForm',
    propsType: 'LeasedLandOutFormProps',
  },
  {
    path: 'src/app/pages/LeasedLandsInPage.tsx',
    component: 'LeasedLandInForm',
    propsType: 'LeasedLandInFormProps',
  },
];

for (const target of targets) {
  let source = fs.readFileSync(target.path, 'utf8');

  const invocation = `<${target.component}\n          formMode={formMode}`;
  if (!source.includes(invocation)) {
    throw new Error(`Invocation marker not found: ${target.path}`);
  }
  source = source.replace(
    invocation,
    `<${target.component}\n          applySmartExtraction={applySmartExtraction}\n          formMode={formMode}`
  );

  const propsMarker = `type ${target.propsType} = {\n  formMode: 'add' | 'edit';`;
  if (!source.includes(propsMarker)) {
    throw new Error(`Props marker not found: ${target.path}`);
  }
  source = source.replace(
    propsMarker,
    `type ${target.propsType} = {\n  applySmartExtraction: (fields: Record<string, unknown>) => void;\n  formMode: 'add' | 'edit';`
  );

  const destructureMarker = `const ${target.component}: React.FC<${target.propsType}> = ({\n  formMode,`;
  if (!source.includes(destructureMarker)) {
    throw new Error(`Destructure marker not found: ${target.path}`);
  }
  source = source.replace(
    destructureMarker,
    `const ${target.component}: React.FC<${target.propsType}> = ({\n  applySmartExtraction,\n  formMode,`
  );

  const smartCall = `onApply={applySmartExtraction}`;
  if (!source.includes(smartCall)) {
    throw new Error(`Smart extraction call missing after patch: ${target.path}`);
  }

  fs.writeFileSync(target.path, source);
  console.log(`Fixed smart extraction callback scope in ${target.path}`);
}
