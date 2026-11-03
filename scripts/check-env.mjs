import { runtimeConfiguration } from '../server/config.mjs'
const runtime = runtimeConfiguration()
console.log('Storage: ' + runtime.storage)
console.log('OpenAI: ' + (runtime.aiConfigured ? 'configured' : 'missing key (AI unavailable)'))
for (const issue of runtime.issues) console.error(issue)
if (!runtime.issues.length) console.log('Required configuration is valid. Secret values were not printed.')
process.exitCode = runtime.issues.length ? 1 : 0
