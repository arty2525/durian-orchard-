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
