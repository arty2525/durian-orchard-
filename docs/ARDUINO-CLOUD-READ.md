# Arduino Cloud read-only integration

The orchard irrigation page has separate Legacy Arduino Cloud and New ESP32 tabs.
The legacy tab reads via the authenticated `arduino-read` Edge Function. No Arduino write APIs are called.

Set these in Supabase Project → Edge Functions → Secrets:
- ARDUINO_CLIENT_ID: from Arduino Cloud API Keys
- ARDUINO_CLIENT_SECRET: matching API secret
- ARDUINO_THING_ID: the Thing UUID, not device ID or dashboard ID

Never place the Client Secret or device key in GitHub, frontend config, or browser storage.
API Keys: https://cloud.arduino.cc/home/api-keys
Project secrets: https://supabase.com/dashboard/project/wusuaisvzsmyamkptnnq/functions/secrets

GET /functions/v1/arduino-read requires an authenticated orchard admin/editor.
Token validated with Supabase Auth; membership resolved by orchard_identity under caller JWT.
Only temperature, humidity, relay1–relay8, relayAll are returned.
API responses are cached for 20 seconds per warm worker, UI polls every 60 seconds while visible.
No database rows or irrigation records are created from these readings.
Both property update time and successful fetch time are shown separately.
Cloud stored relay values are not proof of physical relay state. A property may stay unchanged while online.
Missing API secrets returns configured:false. Live Arduino calls cannot be validated until credentials are configured.

The new tab remains a local schedule draft and local-IP diagnostics launcher; ESP32 telemetry is not connected yet.


## Web configuration
Admins can now configure Arduino Cloud from the irrigation page. The form tests OAuth and a read of Thing properties, then saves one encrypted JSON value in Supabase Vault via an admin-checked RPC. The reader uses this value before environment-variable fallback. Secret values are never returned to the browser, embedded in built assets, or stored in localStorage. Other staff can read telemetry but cannot configure credentials. The bridge never issues irrigation commands.


## Irrigation history
The minute cron job calls the read bridge using a random 256-bit collector token held in Vault. The bridge validates this via a service-only boolean RPC and stores one sample per Thing per minute. No control endpoints are used. Staff can read history under RLS; only server writes are allowed. Reports use 30 Thailand calendar days, estimate ON minutes only between observations no more than 150 seconds apart, split intervals at midnight, and mark missing coverage. Transition counts are observed changes, not guaranteed physical switching. Previous Cloud state timestamps do not reconstruct missing history. Existing historical Cloud samples are not backfilled.


## Web irrigation control
The arduino-control function requires a verified staff session and current admin/editor role. It allows relay1-7, all zones, and stop-all only. Pump follows the existing firmware callbacks; stop-all closes zones then explicitly turns relay8 off and resets relayAll. Device status is read from the attached device device_status before publishing; offline/unknown is rejected, with no intentional deferred command. Cloud connectivity is not proof of Wi-Fi RSSI/IP, relay actuation, valve position or water flow. API acceptance is not a board acknowledgement.

Commands have UUID idempotency, per-Thing two-minute concurrent-command exclusion, and staff-readable/server-write-only audit records. OFF-all continues trying remaining channels if one publication fails. A timeout or partial publish never triggers an automatic replay. Cloud or other apps may change states outside this lock. A command does not configure automatic shutoff. Existing ESP32 firmware must be online and contain the confirmed mapping and callbacks. Validation used mocked publications and unauthenticated live endpoint requests; no real pump/valve commands were issued during implementation.
