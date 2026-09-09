import { execFileSync } from 'node:child_process';
import { createPrivateKey, sign } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const apiRoot = 'https://api.appstoreconnect.apple.com/v1';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function token() {
  const keyId = required('APP_STORE_CONNECT_KEY_ID');
  const issuerId = required('APP_STORE_CONNECT_ISSUER_ID');
  const privateKey = createPrivateKey(readFileSync(required('AUTH_KEY_PATH')));
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: issuerId,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  }));
  const unsigned = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function api(endpoint, options = {}) {
  const retryable = new Set([429, 500, 502, 503, 504]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${apiRoot}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (response.ok) return body;
    const details = body?.errors?.map((error) => error.detail || error.title).filter(Boolean).join('; ');
    if (!retryable.has(response.status) || attempt === 4) {
      throw new Error(`App Store Connect ${response.status}: ${details || 'request failed'}`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1500 * (2 ** attempt);
    console.warn(`App Store Connect ${response.status}; retrying ${endpoint} in ${Math.round(delay / 1000)}s.`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error('App Store Connect request exhausted its retries.');
}

function writeOutput(name, value) {
  appendFileSync(required('GITHUB_OUTPUT'), `${name}=${value}\n`);
}

async function createSigningAssets() {
  const signingDirectory = required('SIGNING_DIR');
  mkdirSync(signingDirectory, { recursive: true });

  const privateKeyPath = path.join(signingDirectory, 'distribution.key');
  const csrPath = path.join(signingDirectory, 'distribution.csr');
  const certificatePath = path.join(signingDirectory, 'distribution.cer');
  const profilePath = path.join(signingDirectory, 'LevelUp_AppStore.mobileprovision');
  const timerProfilePath = path.join(signingDirectory, 'LevelUp_Timer_AppStore.mobileprovision');
  const statePath = path.join(signingDirectory, 'state.json');

  execFileSync('openssl', ['genrsa', '-out', privateKeyPath, '2048'], { stdio: 'ignore' });
  execFileSync('openssl', [
    'req', '-new', '-key', privateKeyPath, '-out', csrPath,
    '-subj', '/CN=Level Up CI Distribution/C=CA',
  ], { stdio: 'ignore' });

  const certificate = await api('/certificates', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'certificates',
        attributes: {
          certificateType: 'DISTRIBUTION',
          csrContent: readFileSync(csrPath, 'utf8'),
        },
      },
    }),
  });
  writeFileSync(certificatePath, Buffer.from(certificate.data.attributes.certificateContent, 'base64'));
  writeFileSync(statePath, JSON.stringify({ certificateId: certificate.data.id }));

  const createdProfileIds = [];
  try {
    const bundleIdentifier = required('APP_BUNDLE_IDENTIFIER');
    const bundleIds = await api(`/bundleIds?filter%5Bidentifier%5D=${encodeURIComponent(bundleIdentifier)}&limit=1`);
    const bundleId = bundleIds?.data?.[0]?.id;
    if (!bundleId) throw new Error(`No registered App ID found for ${bundleIdentifier}`);

    const capabilities = await api(`/bundleIds/${bundleId}/bundleIdCapabilities`);
    if (!capabilities?.data?.some(item => item.attributes?.capabilityType === 'APPLE_ID_AUTH')) {
      await api('/bundleIdCapabilities', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'bundleIdCapabilities',
            attributes: {
              capabilityType: 'APPLE_ID_AUTH',
              settings: [{
                key: 'APPLE_ID_AUTH_APP_CONSENT',
                options: [{ key: 'PRIMARY_APP_CONSENT', enabled: true }],
              }],
            },
            relationships: { bundleId: { data: { type: 'bundleIds', id: bundleId } } },
          },
        }),
      });
    }

    const extensionIdentifier = required('APP_EXTENSION_BUNDLE_IDENTIFIER');
    let extensionBundleIds = await api(`/bundleIds?filter%5Bidentifier%5D=${encodeURIComponent(extensionIdentifier)}&limit=1`);
    if (!extensionBundleIds?.data?.[0]) {
      await api('/bundleIds', {
        method: 'POST',
        body: JSON.stringify({ data: { type: 'bundleIds', attributes: { identifier: extensionIdentifier, name: 'Level Up Timer', platform: 'IOS' } } }),
      });
      extensionBundleIds = await api(`/bundleIds?filter%5Bidentifier%5D=${encodeURIComponent(extensionIdentifier)}&limit=1`);
    }
    const extensionBundleId = extensionBundleIds?.data?.[0]?.id;
    if (!extensionBundleId) throw new Error(`No registered App ID found for ${extensionIdentifier}`);

    const runLabel = `${required('GITHUB_RUN_ID')}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
    const profileName = `Level Up App Store ${runLabel}`;
    const profile = await api('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'profiles',
          attributes: { name: profileName, profileType: 'IOS_APP_STORE' },
          relationships: {
            bundleId: { data: { type: 'bundleIds', id: bundleId } },
            certificates: { data: [{ type: 'certificates', id: certificate.data.id }] },
          },
        },
      }),
    });
    createdProfileIds.push(profile.data.id);
    writeFileSync(profilePath, Buffer.from(profile.data.attributes.profileContent, 'base64'));

    const timerProfileName = `Level Up Timer App Store ${runLabel}`;
    const timerProfile = await api('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'profiles',
          attributes: { name: timerProfileName, profileType: 'IOS_APP_STORE' },
          relationships: {
            bundleId: { data: { type: 'bundleIds', id: extensionBundleId } },
            certificates: { data: [{ type: 'certificates', id: certificate.data.id }] },
          },
        },
      }),
    });
    createdProfileIds.push(timerProfile.data.id);
    writeFileSync(timerProfilePath, Buffer.from(timerProfile.data.attributes.profileContent, 'base64'));
    writeFileSync(statePath, JSON.stringify({
      certificateId: certificate.data.id,
      profileIds: createdProfileIds,
    }));

    writeOutput('certificate_path', certificatePath);
    writeOutput('private_key_path', privateKeyPath);
    writeOutput('profile_name', profileName);
    writeOutput('profile_path', profilePath);
    writeOutput('timer_profile_name', timerProfileName);
    writeOutput('timer_profile_path', timerProfilePath);
    writeOutput('state_path', statePath);
  } catch (error) {
    for (const profileId of createdProfileIds) await api(`/profiles/${profileId}`, { method: 'DELETE' }).catch(() => {});
    await api(`/certificates/${certificate.data.id}`, { method: 'DELETE' }).catch(() => {});
    writeFileSync(statePath, '{}');
    throw error;
  }
}

async function cleanupSigningAssets() {
  const statePath = process.env.SIGNING_STATE_PATH;
  if (!statePath || !existsSync(statePath)) return;
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const profileIds = state.profileIds || (state.profileId ? [state.profileId] : []);
  for (const profileId of profileIds) {
    await api(`/profiles/${profileId}`, { method: 'DELETE' }).catch((error) => {
      console.warn(`Could not revoke temporary profile: ${error.message}`);
    });
  }
  if (state.certificateId) {
    await api(`/certificates/${state.certificateId}`, { method: 'DELETE' }).catch((error) => {
      console.warn(`Could not revoke temporary certificate: ${error.message}`);
    });
  }
}

const command = process.argv[2];
if (command === 'create') {
  await createSigningAssets();
} else if (command === 'cleanup') {
  await cleanupSigningAssets();
} else {
  throw new Error('Usage: node scripts/app-store-signing.mjs <create|cleanup>');
}
