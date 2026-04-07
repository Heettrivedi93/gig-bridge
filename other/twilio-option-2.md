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
