import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCRIPT_PATH = resolve(ROOT, 'infra/scripts/verify-production-city-lifecycle.sh');
const SCRIPT = readFileSync(SCRIPT_PATH, 'utf8');

describe('production city lifecycle read-only QA script', () => {
  test('is valid Bash and reads the pinned backend from the production lock', () => {
    execFileSync('bash', ['-n', SCRIPT_PATH], { stdio: 'pipe' });
    assert.match(SCRIPT, /source "\$LOCK_FILE"/);
    assert.match(SCRIPT, /PRODUCTION_BACKEND_IMAGE/);
    assert.match(SCRIPT, /backend image differs from production lock/);
    assert.match(SCRIPT, /BACKEND_HEALTH/);
  });

  test('executes the compiled production parser cases', () => {
    assert.match(SCRIPT, /dist\/modules\/max-import\/max-parser\.service\.js/);
    assert.match(SCRIPT, /QA_OFFLINE_MOSCOW_OK=true/);
    assert.match(SCRIPT, /QA_VENUE_FIRST_SPB_OK=true/);
    assert.match(SCRIPT, /assert\.equal\(expo\.venue, 'Экспофорум'\)/);
    assert.match(SCRIPT, /\['ST1', 'ст1'\]/);
    assert.match(SCRIPT, /\['OCHNO', 'Очно'\]/);
    assert.match(SCRIPT, /\['VENUE_ONLY', 'Экспофорум'\]/);
    assert.match(SCRIPT, /console\.log\(`QA_INVALID_\$\{label\}_BLOCKED=true`\)/);
    assert.match(SCRIPT, /QA_HYBRID_WITHOUT_LOCATION_BLOCKED=true/);
  });

  test('checks classifier, city CRUD and publication guard without allowing writes', () => {
    assert.match(SCRIPT, /QA_CITY_CLASSIFIER_OK=true/);
    assert.match(SCRIPT, /CITY_QA_FORBIDDEN_DATABASE_ACCESS/);
    assert.match(SCRIPT, /QA_CITY_CREATE_GUARD_OK=true/);
    assert.match(SCRIPT, /CITY_RENAME_QA_FORBIDDEN_DUPLICATE_LOOKUP/);
    assert.match(SCRIPT, /CITY_RENAME_QA_FORBIDDEN_UPDATE/);
    assert.match(SCRIPT, /renameCitiesService\.update\('qa-existing-city', \{ name: badName \}\)/);
    assert.match(SCRIPT, /QA_CITY_RENAME_GUARD_OK=true/);
    assert.match(SCRIPT, /QA_CITY_CRUD_GUARD_OK=true/);
    assert.match(SCRIPT, /QA_FORBIDDEN_EVENT_UPDATE/);
    assert.match(SCRIPT, /QA_CANONICAL_PUBLICATION_GUARD_OK=true/);
    assert.match(SCRIPT, /QA_LEGACY_PUBLICATION_GUARD_OK=true/);

    assert.doesNotMatch(SCRIPT, /prisma\.event\.update\s*\(/);
    assert.doesNotMatch(SCRIPT, /prisma\.city\.(?:create|update|delete)\s*\(/);
    assert.doesNotMatch(SCRIPT, /reconcileFromEvents\s*\(/);
  });

  test('proves watched data and production files stay unchanged', () => {
    assert.match(SCRIPT, /EVENT_COUNT_BEFORE/);
    assert.match(SCRIPT, /EVENT_COUNT_AFTER/);
    assert.match(SCRIPT, /CITY_COUNT_BEFORE/);
    assert.match(SCRIPT, /CITY_COUNT_AFTER/);
    assert.match(SCRIPT, /assert\.deepEqual\(after, before\)/);
    assert.match(SCRIPT, /QA_DATABASE_UNCHANGED=true/);
    assert.match(SCRIPT, /ROOT_HEAD_BEFORE/);
    assert.match(SCRIPT, /ROOT_HEAD_AFTER/);
    assert.match(SCRIPT, /NGINX_SHA_BEFORE/);
    assert.match(SCRIPT, /NGINX_SHA_AFTER/);
    assert.match(SCRIPT, /GIT_STATUS_BEFORE/);
    assert.match(SCRIPT, /GIT_STATUS_AFTER/);
    assert.match(SCRIPT, /PRODUCTION_CITY_LIFECYCLE_QA_OK=true/);
  });

  test('keeps the current legacy counter explicit but configurable', () => {
    assert.match(SCRIPT, /EXPECTED_LEGACY_UNRESOLVED="\$\{EXPECTED_LEGACY_UNRESOLVED:-3\}"/);
    assert.match(SCRIPT, /LEGACY_UNRESOLVED_PUBLISHED_LOCATIONS/);
    assert.match(SCRIPT, /assert\.equal\(legacy\.length, expectedLegacy\)/);
  });
});
