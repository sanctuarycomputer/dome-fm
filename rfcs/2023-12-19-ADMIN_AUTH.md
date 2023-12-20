# Admin Authentication

Feature Name: Admin Authentication

Proposal Date: 2023-12-19

Author: Hugh Francis

## Description

When the administrator first deploys their Dome.fm instance, they'll need to set it up. The
first and most important item they'll need to setup is their adminstrator account, and in
order to broker that login flow, we'll need to implement some sort of login approach.

However, the problem is that the administrator is likely somewhat non-technical. A lot of 
musicians are used to tinkering with things like drum machines, DAWs and more, but ultimately
writing code, working with API keys, etc are likely to feel intimidating to *some*.

The complication here is that authentication requires an SMTP email sender, so that we can use
either a) magic links, or b) password recovery (albeit I'm leaning towards magic links across the
board).

So, the goal here is to:
1) Ensure the administrator can setup an authentication provider...
2) ...While being as low friction as possible

High level, I see three viable approaches:
1. Ask the administrator to setup a (free) Auth0 account
2. Offer a free SMTP provider via the Mothership API
3. Ask the administrator to use Gmail's SMTP
4. Stripe oAuth 2.0
5. BYO SMTP Provider

### Free Auth0 Account

In this scenario, the administrator is expected to setup an Auth0 account before
they can use their dome.fm instance.

#### How it works

0. Adminstrator navigates to `https://artistname.vercel.app/initial-setup` wizard
1. Administrator is instructed to setup an [Auth0](https://auth0.com/) account
2. Administrator is stepped through the process of creating an Auth0 "application"
and integrating it with their new Dome.FM instance (likely via a Loom video we 
integrate into the initial setup wizard)
3. The user administrator is prompted to signup from the initial setup wizard and
we assume this first signup is the "owner" account

#### Pros
- Auth0 is well established and unlikely to be deprecated
- No emails need to be dispatched from Dome.fm

#### Cons
- Auth0's pricing structure may change in the future
- Configuring an Auth0 is still kinda "devvy" and intimidating
- Ulimately feels a little less sovereign 

### Offer a free SMTP provider via the Mothership API

In this scenario, the dome.fm instance calls out to the `www.dome.fm/api/mothership`
API whenever it needs to dispatch an authentication email.

#### How it works

0. Adminstrator navigates to `https://artistname.vercel.app/initial-setup` wizard
1. The dome.fm instance registers itself with `https://www.dome.fm/api/mothership`
(Mothership API)
2. In return, the dome.fm instance is returned a "Mothership API Key" (this all happens
automagically at inital page load without the administrator's input)
3. The administrator inputs their email address for the "owner" account
4. We use [NextAuth's email provider](https://next-auth.js.org/providers/email) in 
conjunction with the Mothership API to a dispatch magic link via the Mothership API
5. The administrator confirms the email from their inbox and is redirected to their
dashboard, already logged in

**Note:** The dome.fm mothership API will be necessary regardless, as the mothership server
will be required to ensure that all of our nodes are registered under a central registry,
to power things like central artist discovery & a future iOS / Android app.

#### Pros
- We need to register nodes with the Mothership API regardless
- Free & zero-friction

#### Cons
- Less sovereign (albeit still more sovereign than Auth0)
- Reliant on the mothership API to stay up indefinetely (single point of failure)

### Use Gmail's SMTP

In this scenario, we ask the administrator to setup a ["google app password"](https://www.febooti.com/products/automation-workshop/tutorials/enable-google-app-passwords-for-smtp.html)

0. Adminstrator navigates to `https://artistname.vercel.app/initial-setup` wizard
1. Administrator is instructed to setup a "google app password" via their Gmail account
2. Administrator enters the "google app password" into the Initial Setup wizard
3. The administrator inputs their email address for the "owner" account
4. We use [NextAuth's email provider](https://next-auth.js.org/providers/email) in 
conjunction with Gmail SMTP to send a magic link
5. The administrator confirms the email from their inbox and is redirected to their
dashboard, already logged in

#### Pros
- (Probably?) more sovereign, in that Gmail SMTP is hugely adopted and native for all gmail users
- Free

#### Cons
- Lots of friction (this part of google's backend is confusing and always changing)
- Requires that the administrator already has a Gmail account
- Sometimes gmail's SMTP can have problems reliably sending emails

### Via Stripe oAuth 2.0

In this scenario, the administrator is redirected to Stripe to login via oAuth 2.0
and is then redirected back to the Initial Setup wizard 

0. Adminstrator navigates to `https://artistname.vercel.app/initial-setup` wizard
1. Adminstrator clicks a button like `Connect with Stripe` and is navigated to a 
URL like `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_FkyHCg7X8mlvCUdMDao4mMxagUfhIwXb&scope=read_write`
2. They login to their (existing) Stripe account, and they're redirected back to a 
redirect URI like `https://artistname.vercel.app/connect/default/oauth/test?scope=read_write&code={AUTHORIZATION_CODE}`
3. The dome.fm instance exchanges the AUTHORIZATION_CODE for a Stripe oAuth token
4. The administrator confirms the email from their inbox and is redirected to their
dashboard, already logged in (as the owner of the Stripe account)

#### Pros
- We collect Stripe API keys during the Initial Setup and don't have to prompt
for them later

#### Cons
- Doesn't support multiple administrators (must login with Stripe oAuth 2.0)
- Must have a Stripe account to do initial setup (many won't have one, other scenarios it can be configured
after gaining authenticated access to the dashboard)

### BYO SMTP Provider

In this scenario, we ask the administrator to setup their own SMTP provider.

0. Adminstrator navigates to `https://artistname.vercel.app/initial-setup` wizard
1. They're asked to input their own SMTP credentials (Mailgun, Sendgrid, Postmark, it doesn't  matter)
2. The administrator inputs their email address for the "owner" account
3. We use [NextAuth's email provider](https://next-auth.js.org/providers/email) in 
conjunction with the BYO SMTP provider to send a magic link
4. The administrator confirms the email from their inbox and is redirected to their
dashboard, already logged in

#### Pros
- Roughly the same complexity as setting up Auth0
- Most sovereign
- Generic and unopinionated
- Most SMTP providers have a free plan of ~100 free emails a month (likely enough for auth)

#### Cons
- Administrator has to setup an SMTP provider
- Adminstrator might need to input billing details