# Admin Authentication Rev.2

Feature Name: Admin Authentication

Proposal Date: 2023-12-20

Author: Hugh Francis

## Description

**Note:** See below for Rev.1 to understand the full decision matrix that led to this revision.

Rev.2 describes an approach to authentication that uses what we're preliminarily calling the
"Mothership API". This is a central API that dome.fm instances register their presence with,
and periodically backup their state to.

Another advantage of the dome.fm Mothership API is that it will house SMTP credentials, so 
that dome.fm instances do not need to BYO their own SMTP (albeit in the future this will be 
configurable in the case the adminstrator would prefer that soverignty).

## Why Next.js for Mothership API?

In a new codebase `github.com/dome.fm/mothership`, we'll setup a Next.js app. 

Why Next.js for an API? Well, for a few tactical reasons:
- This app will likely live at `developers.dome.fm`, and we may want to render HTML there (think
API documentation).
- Dome.fm will be a Next.js app, so this team will already have that proficiency.
- The Mothership API needs to be highly available, so serverless Vercel deployment is a great
option. Next.js & Vercel play super nice.

## How Dome.fm instances will register themselves

1. In a [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware), 
we'll ask the Dome.fm instance if it's registered itself (we'll likely check the PostgresQL 
database for a `MothershipAPIKey`, ie `const hasMothershipAPIKey = !!(await prisma.mothershipAPIKey.findMany())[0]`)

2. If `false`, we'll `POST https://developers.dome.fm/instance-api/[...domeInstanceVersion]/instances` with a body
like:

```
{
  owner: "hughfrancis89@gmail.com"
}
```

3. The Mothership API will return a response like:

```
{
  instanceId: "some-uuid-generated-by-mothership",
  mothershipAPIKey: "some-secret-key-generated-by-mothership"
}
```

4. The Dome.fm instance will save the returned `MothershipAPIKey` in PostgresQL and continue into 
request stack.

## How Dome.fm instances will trigger Auth Emails

**Note:** Rather than providing an open SMTP server for the instance to authenticate and
connect to, we'll offer an API that triggers a pre-formatted authentication email (rather 
than an open SMTP server which could be more widely abused).

1. The Dome.fm instance can now trigger an authentication email by calling `POST https://developers.dome.fm/instance-api/[...domeInstanceVersion]/admin-magic-links` with the following body parameters:

```
{
  token: "some-uuid-generated-by-instance",
  email: "hughfrancis89@gmail.com"
}
```

...and the following headers:
```
X-DOME-INSTANCE-ID: "some-uuid-generated-by-mothership"
X-DOME-MOTHERSHIP-API-KEY: "some-secret-key-generated-by-mothership"
X-DOME-HOSTNAME: "artistname.vercel.app"
X-DOME-REQUEST-ID: "some-uuid-generated-by-instance"
```

2. Before triggering the email, the Mothership API will check the rate limiter, to ensure that this
Dome.fm instance is sending `less than or equal to 5 emails per minute` (more below).

3. Before triggering the email, the Mothership API will perform an authenticity handshake (more below).

4. Before triggering the email, the Mothership API will test that the recipient email is a known
owner or administrator of the Dome.fm instance.

5. If all security checks pass, the email will be sent, with a body like:

```
<a href="https://developers.dome.fm/admin/authenticate?token=[token]&instance=[X-DOME-HOSTNAME]">Login to Dome.fm</a>
```

**Note:** Wait, why does this email body return to `developers.dome.fm` and not `X-DOME-HOSTNAME`?

Well, because we need to know about the existence of our decentralized admin users in the Mothership API
as a security precaution, we also need to know that they didn't enter their email addresses incorrectly.

So, we "proxy" the magic link completion step through the Mothership API (which simply "confirms" the email
address in the Mothership database) and then redirects to `X-DOME-HOSTNAME` for the Instance to actually
issue a valid session.

Ie, this allows a single magic link to be "double confirmable" in both the Mothership AND the Instance,
and in the future, allows us to issue a `*.dome.fm` cookie for a universal web player and unified login
experience!

## How security will work

Technically, anyone on the internet can register for a Mothership API key (and thus send emails). So,
here's a few security approaches we'll take to ensure malicious users can't gain access to an instance
admin panel.

### Handshaking

Every request to the Mothership API will include a handshake:

1. `artistname.vercel.app` will make some request to `developers.dome.fm/instance-api/...`
2. That request must include `X-DOME-HOSTNAME: "artistname.vercel.app"` and `X-DOME-REQUEST-ID: "some-uuid-generated-by-instance"` (which will be stored in PostgresQL for ~60 minutes)
3. `developers.dome.fm` will return a request to `artistname.vercel.app/api/authenticity-handshake?requestId=some-uuid-generated-by-instance`
4. If the requestId is found in the Instance PostgresQL database, it will return a bodyless `204` response
5. Upon receiving that `204`, the request will be allowed to proceed further into the stack. (If not the
request stack will be halted)

### API Keys

1. The request will include headers `X-DOME-INSTANCE-ID` and `X-DOME-MOTHERSHIP-API-KEY`,
which will be checked for a match in the Mothership PostgresQL instance.

### Rate Limiting

1. The request will be rate limited against the referrer IP address.

### Testing Recipients

On registration, we'll record the instance owner email address in the Mothership API. (This
is necessary for security alerts in the future).

In order to ensure we only send magic link emails to the appropriate instance admins (and not
a malicious user), we'll check that the `email` field given is actually a known admin by the
Mothership API.

**Note:** This adds some annoying complexity: when managing admins / owners, we'll need
to synchronize those changes to the Mothership API. Still, this is a good practice for the
overall security of the system.

---

# Admin Authentication Rev.1

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
- Requires that the administrator already has a Gmail account (with 2FA enabled)
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