# Google Play Billing Configuration

## In-App Products to Create in Play Console

### Subscriptions

1. **premium_monthly**
   - Product ID: `premium_monthly`
   - Name: Premium Monthly
   - Price: $9.99 USD
   - Billing Period: Monthly
   - Features:
     - Unlimited daily posts
     - HD video uploads (1080p)
     - Ad-free experience
     - Personal analytics
     - Custom themes
     - Priority in Explore
     - Verified badge

2. **premium_yearly**
   - Product ID: `premium_yearly`
   - Name: Premium Yearly
   - Price: $99.99 USD
   - Billing Period: Yearly
   - Features: Same as monthly + 2 months free

### One-Time Products (Managed Products)

1. **coins_100**
   - Product ID: `coins_100`
   - Name: 100 Coins
   - Price: $0.99 USD
   - Type: Consumable

2. **coins_500**
   - Product ID: `coins_500`
   - Name: 500 Coins (+50 Bonus)
   - Price: $4.99 USD
   - Type: Consumable

3. **coins_1000**
   - Product ID: `coins_1000`
   - Name: 1000 Coins (+150 Bonus)
   - Price: $9.99 USD
   - Type: Consumable

4. **coins_5000**
   - Product ID: `coins_5000`
   - Name: 5000 Coins (+1000 Bonus)
   - Price: $49.99 USD
   - Type: Consumable

## Setup Instructions

### 1. Create Products in Play Console
1. Go to Google Play Console > Your App > Monetization > Products
2. Create In-app products for coins (managed products)
3. Create Subscriptions for premium plans
4. Use the exact Product IDs listed above

### 2. Link Google Cloud Project
1. Go to Play Console > Setup > API access
2. Link to a Google Cloud project
3. Enable Google Play Developer API
4. Create a service account with appropriate permissions

### 3. Configure the App
The Android app uses Google Play Billing Library 6.1.0.
Product IDs must match exactly between Play Console and the app.

### 4. Testing
1. Add test accounts in Play Console > License testing
2. Test purchases won't charge real money
3. Use test card numbers provided by Google

## Web vs Android Purchases

- **Web**: Uses Stripe (fully implemented)
- **Android**: Uses Google Play Billing (requires Play Console setup)

Both systems sync to the same backend database via webhooks/verification.

## Subscription Status Verification

Android app should verify subscription status with:
1. Google Play Billing Library's `queryPurchasesAsync()`
2. Backend verification via Google Play Developer API

## Webhook Setup (Server-Side)

Configure Real-time Developer Notifications (RTDN) in Play Console:
1. Go to Monetization setup > Real-time developer notifications
2. Set topic name for Cloud Pub/Sub
3. Configure backend endpoint to receive notifications
4. Handle events: SUBSCRIPTION_PURCHASED, SUBSCRIPTION_RENEWED, SUBSCRIPTION_CANCELED, etc.
