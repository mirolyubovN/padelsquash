# CitySquash Comparison Todo - 2026-05-01

## Goal

Make the public website closer to `citysquash.ru` in visual simplicity and content coverage while keeping our booking/admin system and Kazakhstan/Kostanay context.

User requested this as analysis only for now:

- compare against `https://citysquash.ru/`;
- identify missing public sections such as event booking, first session, corporate offers;
- add real photos and a way to manage/upload photos later;
- create a todo list with tasks.

## Sources Reviewed

- `https://citysquash.ru/`
- `https://citysquash.ru/intro`
- `https://citysquash.ru/events`
- `https://citysquash.ru/giftcards`
- `https://citysquash.ru/kids`
- `https://citysquash.ru/corporate`
- `https://citysquash.ru/contacts`

## Current Site Baseline

Relevant local files:

- `app/page.tsx`
- `app/page-variation-a.tsx`
- `src/lib/content/site-content.ts`
- `src/lib/content/site-data.ts`
- `src/lib/public/homepage.ts`
- `app/contact/page.tsx`
- `app/coaches/page.tsx`
- `app/book/page.tsx`
- `app/api/admin/upload/route.ts`
- `src/components/admin/instructor-photo-input.tsx`
- `prisma/schema.prisma`

Current public homepage:

- visually energetic and custom: angled hero, bright palette, animated reveal behavior, sport cards, stats, tariff table, gallery, FAQ, contact CTA;
- still uses placeholder `picsum.photos` images for hero/cards/gallery;
- has sports info pages, coaches page, prices page, contact page, and online booking;
- does not yet have dedicated pages/sections for:
  - first session / intro offer,
  - recurring group events,
  - event ticket booking,
  - corporate offers,
  - gift certificates,
  - kids school,
  - manageable club gallery/photos.

Current admin/media capability:

- only instructor photos have upload support.
- `app/api/admin/upload/route.ts` uploads into `public/uploads/instructors`.
- no general media table, gallery manager, homepage photo manager, event photo manager, or page-content admin.

## CitySquash Structure Summary

CitySquash public site is simpler and more offer-led:

- top nav is direct and commercial:
  - booking,
  - first session,
  - group trainings/events,
  - gift certificates,
  - kids school,
  - corporate,
  - contacts.
- homepage starts with a large real club photo/hero and a simple claim:
  - club name,
  - number of courts,
  - location.
- homepage includes:
  - location/hours block,
  - court rental prices,
  - time-of-day price grid,
  - equipment/services included,
  - cancellation/shoe rules,
  - club advantages,
  - location near metro,
  - interior photos,
  - offer cards linking to first session / group trainings / certificates,
  - FAQ,
  - lead/purchase form,
  - footer with contacts and repeated menu.
- first-session page:
  - clear intro package,
  - price,
  - what is included,
  - CTA to sign up,
  - beginner group suggestions,
  - trainer/club benefits,
  - FAQ and form.
- events page:
  - recurring weekly schedule,
  - level filters,
  - event cards with day, duration, level, price, trainer, time, description,
  - buy ticket CTA,
  - detail sections for event formats and trainers.
- corporate page:
  - simple landing page for companies,
  - benefit trio,
  - real photos,
  - starting price,
  - formats from intro to mini tournament,
  - direct contact/consultation CTA.
- gift cards page:
  - packaged certificate products,
  - prices and inclusions,
  - electronic/paper version visuals,
  - custom request CTA.
- kids page:
  - dedicated kids-school positioning,
  - benefits,
  - groups, events/camps, parent visibility.
- contacts page:
  - direct phone/email,
  - route links,
  - parking instructions.

## Visual Direction To Borrow

Do borrow:

- simple white/black/base-neutral layout;
- large real club photography as the main visual asset;
- fewer gradients and fewer decorative shapes;
- direct typography and short labels;
- clear rectangular content blocks;
- repeated CTA buttons close to each offer;
- practical content: what is included, price, rules, how to get there, what to bring.

Do not copy exactly:

- CitySquash branding, copy, images, prices, or Moscow-specific location language;
- Tilda-like hidden complexity or duplicated blocks;
- exact layout if it conflicts with our booking flow.

Suggested design direction:

- keep our existing fonts unless we decide a full visual reset is worth it;
- reduce palette to neutral background + black/dark text + one sharp accent;
- use real photos instead of placeholder/fake imagery;
- make homepage block rhythm simpler:
  - hero,
  - booking/intro/event offer cards,
  - prices,
  - first session,
  - group events,
  - corporate,
  - gallery,
  - FAQ/contact.

## Product Gaps

### 1. Real Photos and Media Management

Gap:

- We use placeholder photos in the homepage.
- We only support instructor photo upload.
- No admin UI to manage homepage/gallery/offer images.

Tasks:

- [ ] Define `MediaAsset` model or equivalent storage strategy.
- [ ] Generalize `/api/admin/upload` beyond instructors:
  - target folder/category: `homepage`, `gallery`, `events`, `offers`, `instructors`;
  - allowed types and max size remain strict;
  - optional image dimensions/alt text metadata.
- [ ] Add admin media library page:
  - upload image,
  - preview,
  - copy URL,
  - edit alt/caption,
  - delete or deactivate.
- [ ] Add homepage gallery manager:
  - sort order,
  - caption,
  - visibility toggle.
- [ ] Replace all homepage `picsum.photos` usage with managed images and seeded fallbacks.
- [ ] Add seed/demo real-looking local placeholders only if no uploaded media exists.

Acceptance criteria:

- Super admin can upload a club photo and assign it to hero/gallery without editing code.
- Homepage renders stable real images with alt text and no remote placeholder dependency.

### 2. Visual Simplification

Gap:

- Current homepage is more stylized than CitySquash: bright palette, angled hero, decorative effects, animation, multiple visual treatments.

Tasks:

- [ ] Create a simpler homepage visual spec before implementation:
  - neutral background,
  - black/dark text,
  - one accent color,
  - photo-led blocks,
  - rectangular content panels,
  - less motion.
- [ ] Reduce or remove:
  - diagonal hero slash,
  - aggressive gradient/bright palette,
  - over-styled sport cards,
  - non-essential animations.
- [ ] Build a simpler homepage variant route first, for example `/preview/citysquash-style`.
- [ ] Compare mobile and desktop screenshots before replacing `/`.
- [ ] Keep booking CTA prominent and repeated.

Acceptance criteria:

- First viewport clearly shows club, sports, location, and primary booking CTA.
- Page feels closer to a clean sports club site than a marketing experiment.

### 3. Navigation and Public IA

Gap:

- Current nav has sports info and coaches, but misses offer-led pages that CitySquash exposes directly.

Tasks:

- [ ] Propose updated public nav:
  - `Бронирование`
  - `Первое занятие`
  - `Мероприятия`
  - `Сертификаты`
  - `Компаниям`
  - `Тренеры`
  - `Контакты`
- [ ] Decide whether `Про падел/сквош/теннис` move into footer or remain in nav.
- [ ] Add footer menu mirroring the offer-led IA.
- [ ] Add clear phone/WhatsApp/Telegram entry in header.

Acceptance criteria:

- A new visitor can immediately find first-session, events, corporate, and booking options.

### 4. First Session / Intro Offer

Gap:

- We have training booking, but no first-session product page/package.

Tasks:

- [ ] Add `/intro` or `/first-session`.
- [ ] Define intro package content:
  - who it is for,
  - what is included,
  - duration,
  - one or two people allowed,
  - price,
  - what to bring,
  - cancellation note,
  - CTA.
- [ ] Decide data model:
  - simple content-only lead page first, or
  - real bookable service type in `Service`.
- [ ] If bookable:
  - add intro service code per sport/location,
  - pricing component or fixed package price,
  - booking flow preselects service/trainer or opens contact form.
- [ ] Add homepage intro block and nav link.
- [ ] Add admin content controls later:
  - price,
  - included items,
  - hero photo,
  - CTA destination.

Acceptance criteria:

- New customers have a direct path for "I have never played before".

### 5. Events / Group Training Booking

Gap:

- Current system supports court/training bookings, but not recurring group events with tickets/capacity/levels.

Tasks:

- [ ] Add product definition for group events:
  - recurring weekly templates,
  - one-off event instances,
  - sport,
  - level,
  - trainer optional,
  - court allocation,
  - capacity,
  - duration,
  - price,
  - description,
  - status.
- [ ] Add DB models:
  - `EventTemplate`
  - `EventInstance`
  - `EventRegistration`
  - optional `EventResource`
  - optional `EventLevel` enum/string.
- [ ] Add public `/events` page:
  - level filters,
  - day grouping,
  - event cards,
  - "Купить билет" / "Записаться".
- [ ] Add event detail modal/page:
  - program,
  - for whom,
  - trainer,
  - number of spots,
  - cancellation policy.
- [ ] Add event checkout path:
  - use wallet or existing account payment model,
  - prevent over-capacity,
  - reserve seats atomically.
- [ ] Add admin event management:
  - create recurring event,
  - generate/edit instances,
  - assign trainer/courts,
  - set capacity/price,
  - view participants,
  - cancel/refund event.
- [ ] Add notifications for event registration/cancellation.

Acceptance criteria:

- A customer can register for a group training/event.
- Admin can manage event schedule and participants without code changes.
- Event capacity cannot be oversold.

### 6. Corporate Page and Lead Workflow

Gap:

- No corporate offer page or lead capture workflow.

Tasks:

- [ ] Add `/corporate`.
- [ ] Content sections:
  - hero with corporate/team-building positioning,
  - why racket sports work for teams,
  - formats: intro session, regular package, mini tournament, private event,
  - price from / request quote,
  - included options,
  - photos,
  - consultation form.
- [ ] Add lead form backend:
  - name,
  - company,
  - phone,
  - email,
  - participants count,
  - preferred date/time,
  - message.
- [ ] Store leads in DB or send to admin notification channel.
- [ ] Add admin leads page:
  - list,
  - status,
  - notes,
  - contact action.

Acceptance criteria:

- Corporate visitors can submit a request.
- Admin can see and follow up without relying only on email.

### 7. Gift Certificates

Gap:

- CitySquash has packaged certificates; we do not.

Tasks:

- [ ] Decide if certificates are in MVP for this phase.
- [ ] Add `/giftcards` page if yes.
- [ ] Define certificate products:
  - intro session,
  - court package,
  - custom amount.
- [ ] Add purchase/request form.
- [ ] Decide fulfillment:
  - manual admin follow-up first,
  - later generated certificate PDF/code.
- [ ] Add admin certificate orders list.

Acceptance criteria:

- Visitors can request or buy a certificate product.

### 8. Kids School

Gap:

- CitySquash has kids school as a dedicated acquisition page. We do not.

Tasks:

- [ ] Decide if kids school applies to our club.
- [ ] If yes, add `/kids`.
- [ ] Content:
  - age range,
  - benefits,
  - group formats,
  - schedule,
  - coach team,
  - trial session CTA,
  - parent FAQ.
- [ ] Model kids groups as events if event system is built.

Acceptance criteria:

- Parents can understand the offer and submit a trial request.

### 9. Pricing Presentation

Gap:

- Current pricing is compact and functional, but CitySquash makes package economics and time bands more explicit.

Tasks:

- [ ] Keep current pricing engine, but redesign public pricing block:
  - simpler rental table,
  - clear "white/light hours" equivalent if relevant,
  - intro/training package cards,
  - equipment included row,
  - cancellation rules.
- [ ] Keep `/prices` for detailed pricing; homepage should only show essentials.
- [ ] Avoid duplicating complex admin pricing controls in public content.

Acceptance criteria:

- Users understand prices without reading the full booking flow.

### 10. Contact and Directions Page

Gap:

- Current contact page exists, but CitySquash has richer practical directions and parking guidance.

Tasks:

- [ ] Expand `/contact` with:
  - parking,
  - entrance instructions,
  - map links,
  - taxi link,
  - what time to arrive,
  - working hours by location.
- [ ] Add content fields to `siteConfig` or a future admin-managed location settings page.

Acceptance criteria:

- First-time visitors can find the club without calling.

### 11. Content Admin / CMS-Lite

Gap:

- Most public content is code-defined in `site-content.ts`.
- CitySquash-style offer pages will be painful to maintain if all copy/images/prices require code edits.

Tasks:

- [ ] Decide CMS-lite scope:
  - content remains code for now, or
  - introduce DB-backed editable page blocks.
- [ ] Minimum admin-editable fields:
  - homepage hero photo/copy,
  - gallery photos,
  - intro offer text/price,
  - corporate text/lead email,
  - events content via event admin.
- [ ] Add super-admin-only content area in admin.

Acceptance criteria:

- Non-developer can update photos and core offer text.

## Recommended Implementation Phases

### Phase 1 - Design and Content Restructure, No New Booking Model

- [ ] Create `/preview/citysquash-style` homepage variant.
- [ ] Replace placeholder photos with a temporary managed/fallback photo set.
- [ ] Add content-only pages:
  - `/intro`
  - `/corporate`
  - `/giftcards` optional
  - `/kids` optional
- [ ] Add simple lead forms for intro/corporate/giftcards.
- [ ] Add header/footer nav changes.
- [ ] Add general media upload and gallery management.

Reason:

- Fastest visible improvement.
- Does not risk booking system while still matching the requested public-site direction.

### Phase 2 - Events MVP

- [ ] Add event DB models and migrations.
- [ ] Add public `/events`.
- [ ] Add admin event management.
- [ ] Add customer event registration.
- [ ] Add capacity-safe transaction logic.
- [ ] Add notifications.

Reason:

- Event booking is a new product model and should not be patched into court booking.

### Phase 3 - Package Products

- [ ] Intro package as real bookable service/product.
- [ ] Gift certificate products.
- [ ] Corporate quote workflow upgrades.
- [ ] Optional online payment integration beyond wallet/manual.

Reason:

- These affect pricing, wallet/payment, fulfillment, and admin operations.

## Review Questions Before Building

- Is the club now positioned in Kostanay/Tobyl or Almaty? Current content has mixed references.
- Which sports stay on the public homepage: tennis, padel, squash, or only padel/squash?
- Do we need kids school and gift certificates immediately, or only intro/events/corporate/photos first?
- Should events be paid from wallet like bookings, paid manually, or just lead registration at first?
- Should media uploads be stored in local `public/uploads` for now, or should we plan object storage?
- Who can edit public photos/content: admin or only super admin?

## Suggested First Build Task

Start with Phase 1:

1. Add managed media/gallery foundation.
2. Build `/preview/citysquash-style` as a simpler photo-led homepage.
3. Add `/intro` and `/corporate` content-only pages with lead forms.
4. Update nav/footer to include the new offer-led structure.

Then review visually before replacing the current homepage.
