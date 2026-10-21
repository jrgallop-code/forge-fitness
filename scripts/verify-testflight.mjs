import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
const root = 'https://api.appstoreconnect.apple.com/v1';
const key = createPrivateKey(readFileSync(process.env.AUTH_KEY_PATH));
function token() {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = encode({ alg:'ES256', kid:process.env.APP_STORE_CONNECT_KEY_ID, typ:'JWT' }) + '.' + encode({ iss:process.env.APP_STORE_CONNECT_ISSUER_ID, iat:now, exp:now + 600, aud:'appstoreconnect-v1' });
  return unsigned + '.' + sign('sha256', Buffer.from(unsigned), { key, dsaEncoding:'ieee-p1363' }).toString('base64url');
}
async function get(endpoint) {
  const response = await fetch(root + endpoint, { headers:{ Authorization:`Bearer ${token()}` } });
  if (!response.ok) throw new Error(`App Store Connect verification HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}
const apps = await get('/apps?filter[bundleId]=com.leveluphypertrophy.app');
if (apps.data.length !== 1) throw new Error('Could not identify Level Up uniquely');
const buildNumber = process.env.TESTFLIGHT_BUILD_NUMBER;
for (let attempt = 0; attempt < 80; attempt++) {
  const builds = await get(`/builds?filter[app]=${apps.data[0].id}&filter[version]=${encodeURIComponent(buildNumber)}&limit=10`);
  const build = builds.data.find(item => item.attributes.version === buildNumber);
  if (build) {
    const details = await get(`/builds/${build.id}/buildBetaDetail`);
    const state = details.data?.attributes?.internalBuildState;
    console.log(JSON.stringify({ buildNumber, buildId:build.id, processingState:build.attributes.processingState, expired:build.attributes.expired, internalBuildState:state }));
    if (build.attributes.processingState === 'VALID' && !build.attributes.expired && state === 'IN_BETA_TESTING') {
      console.log(`CONFIRMED: Level Up build ${buildNumber} has completed Apple processing and is available for internal TestFlight testing.`);
      process.exit(0);
    }
    if (['FAILED', 'INVALID'].includes(build.attributes.processingState) || build.attributes.expired || ['PROCESSING_EXCEPTION', 'EXPIRED'].includes(state)) throw new Error('Apple rejected or expired the uploaded build');
  } else console.log(`Build ${buildNumber} not yet returned by App Store Connect (attempt ${attempt + 1}/80).`);
  await new Promise(resolve => setTimeout(resolve, 15000));
}
throw new Error(`Build ${buildNumber}: TestFlight availability was not confirmed within 20 minutes. See the recorded Apple states.`);
