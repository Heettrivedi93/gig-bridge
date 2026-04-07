# Twilio Option 2

## Goal

Keep Trello for internal team workflow alerts and add Twilio as a user-facing notification channel.

## Channel split

- In-app: normal product activity inside the platform
- Email: detailed user communication and records
- Trello: internal team and operations alerts
- Twilio SMS: urgent user-facing notifications

## Recommended Twilio events

- `order_placed`
- `order_delivered`
- `order_completed`
- `order_cancelled`
- `payment_released`
- `registration`

## Implementation notes

- Twilio uses the recipient user's `phone` field from profile settings.
- Trello stays enabled for internal staff workflows.
- Twilio is controlled from admin settings with its own credentials and event toggles.
- Twilio failures must never break the main business action.

## Delivery rule

Send Twilio SMS only when:

1. Twilio is enabled globally
2. The event is enabled for Twilio
3. The user has a phone number
4. Twilio credentials are configured

## Why this approach

This keeps the existing Trello workflow for the team leader or internal operations while adding a real user notification channel that better fits urgent order and payment updates.

To enable Twilio in this app, do these steps.

1. Create a Twilio account
Go to Twilio and get:

Account SID
Auth Token
a Twilio phone number
If you use a trial account, make sure the recipient phone numbers are verified in Twilio.

2. Open admin settings in your app
Go to:

Super Admin > Settings
open the Twilio tab
open the Notifications tab too
3. Fill Twilio settings
In the Twilio section enter:

Account SID
Auth Token
From Number
Example:

Account SID: ACxxxxxxxxxxxxxxxxxxxxx
Auth Token: your Twilio auth token
From Number: +1XXXXXXXXXX
Then turn on:

Enable Twilio SMS integration
4. Enable Twilio notifications
In the Notifications section turn on:

Enable Twilio SMS Notifications
Then choose the events you want, for example:

order_placed
order_delivered
payment_released
5. Make sure users have phone numbers
Twilio sends to the user’s phone field from profile settings.
So buyer/seller should have a valid phone number saved in:

Settings > Profile
6. Test it
Best test:

put a valid phone number on a seller profile
enable Twilio for order_placed
create and pay for an order
seller should receive SMS
7. Trial account note
If your Twilio account is trial:

Twilio may only send to verified numbers
message may include trial branding
some countries/numbers may need extra setup
8. If SMS is not sending
Check:

Twilio enabled in admin settings
Twilio notifications enabled in notification settings
selected event is enabled
recipient has phone number
From Number is in Twilio format with +
trial number is verified
app logs for Twilio warning entries
This app logs Twilio failures without breaking the order flow.

Recommended first setup
Enable only:

order_placed
order_delivered
payment_released
That keeps SMS useful and not too noisy.

If you want, I can also give you:

a Twilio sandbox/testing checklist
exact sample values format
or help you add .env fallback support for Twilio credentials too