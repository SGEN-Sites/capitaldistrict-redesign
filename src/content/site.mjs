// site.mjs: the facts the redesign renders. Nothing here is typed from memory: every value names where it came
// from on the live site (captured 2026-11-13, audit/raw/). Keep hours and prices in THIS file only.

export const ORIGIN = 'https://capitaldistrictcannabis.com';
export const MENU = ORIGIN + '/stores'; // the live headless menu (store pages, categories, specials, cart, checkout)

export const brand = {
  name: 'Capital District Cannabis & Wellness',
  short: 'Capital District Cannabis',
  legal: 'Capital District Cannabis & Wellness Inc.', // footer disclaimer
  est: '2022', // the round badge logo ("EST. 2022")
  kicker: 'Building Community Through Cannabis', // home hero
  h1: 'Unifying Upstate', // home H1
  social: [ // footer social links
    { name: 'Facebook', href: 'https://www.facebook.com/people/CDCW/61572237097814/', icon: 'facebook' },
    { name: 'Instagram', href: 'https://www.instagram.com/cdcwalbany/', icon: 'instagram' },
    { name: 'X', href: 'https://x.com/CDCWNYS', icon: 'x' },
  ],
  payment: 'Cash, Debit, and Dutchie Pay', // store FAQs: "We are now accepting Cash, Debit, and Dutchie Pay."
  separateCarts: 'Each location has its own separate shopping cart. If you switch locations, your current cart items will not transfer over.', // store switch modal
  agegate: 'Are you 21 years of age or a qualified patient?', // age gate
  licences: 'Capital District Cannabis & Wellness Inc. OCM-CAURD-23-000028 (Albany), OCM-CAURD-23-000025 (Clifton Park), OCM-RETL-24-000138 (Schenectady).',
  warning: 'For use only by adults 21 years of age and older. Keep out of reach of children and pets. In case of accidental ingestion or overconsumption, contact the Poison Center hotline at 1-800-222-1222 or call 9-1-1. Please consume responsibly. Cannabis can impair concentration and coordination. Do not operate a vehicle or machinery under the influence of cannabis.',
  hopeline: 'For help and hope 24/7, call 1-877-8-HOPENY(467369) or text HOPENY (467369). Toll free and confidential.',
  hopelineUrl: 'https://oasas.ny.gov/hopeline',
  copyright: '© 2026 Capital District Cannabis. All Rights Reserved.',
};

// Hours on every store page: "Monday – Saturday: 9 AM – 9 PM", "Sunday: 10 AM – 6 PM". Pre-orders close 30 minutes before
// closing (store selector: "Open • Order until 8:30 pm" / "Pre-Orders Closed • Order at 9:00AM").
const HOURS = { 0: [10, 18], 1: [9, 21], 2: [9, 21], 3: [9, 21], 4: [9, 21], 5: [9, 21], 6: [9, 21] };
const HOURS_TEXT = [['Monday – Saturday', '9 AM – 9 PM'], ['Sunday', '10 AM – 6 PM']];

export const stores = [
  {
    id: 'albany', letter: 'A', city: 'Albany', name: 'Albany, NY', street: '997 Central Ave', zip: '12205', region: 'NY',
    phone: '(518) 487-4591', tel: '5184874591', menu: 'cd-albany-ny', licence: 'OCM-CAURD-23-000028',
    directions: 'https://maps.app.goo.gl/fV2wGVLAgFBoo3JB9', page: '/location/albany/',
    near: 'right off Route 5 and just minutes from I-87 and I-90', // /location/albany/
    photo: 'store-albany', photoAlt: 'Inside the Albany dispensary: the graffiti mural behind the counter',
    hours: HOURS, hoursText: HOURS_TEXT,
  },
  {
    id: 'clifton-park', letter: 'C', city: 'Clifton Park', name: 'Clifton Park, NY', street: '1508 US-9', zip: '12065', region: 'NY',
    phone: '(518) 901-0010', tel: '5189010010', menu: 'cd-clifton-park-ny', licence: 'OCM-CAURD-23-000025',
    directions: 'https://maps.app.goo.gl/qzwVeWkQn3QM7ydDA', page: '/location/clifton-park/',
    near: 'serving Clifton Park and Halfmoon', // /location/clifton-park/
    photo: 'm-2025-10-img-6709', photoAlt: 'Inside the Clifton Park dispensary: tin ceiling, a timber table and glass display cases',
    hours: HOURS, hoursText: HOURS_TEXT,
  },
  {
    id: 'schenectady', letter: 'S', city: 'Schenectady', name: 'Schenectady, NY', street: '1650 Crane St', zip: '12303', region: 'NY',
    phone: '(518) 901-7107', tel: '5189017107', menu: 'cd-schenectady-ny', licence: 'OCM-RETL-24-000138',
    directions: 'https://maps.app.goo.gl/rSmnfoULTDvjaxyk8', page: '/location/schenectady/',
    near: 'near main highways in the heart of Schenectady', // /location/schenectady/
    photo: 'm-2025-08-image-1', photoAlt: 'Customers at the counter under the Capital District Cannabis badge',
    hours: HOURS, hoursText: HOURS_TEXT,
  },
];
export const storeById = (id) => stores.find((s) => s.id === id) || stores[0];
export const DEFAULT_STORE = 'albany';

// The live menu's own category paths (nav + footer). /stores/products/<cat> answers 404 on the live site without a
// store, so every link here is store-scoped: /stores/<store>/products/<cat> (200, products + cart, checked in a browser
// 2026-11-13, audit/menu-verification.json). /products/beverages shows the unfiltered "All" list, so Beverages goes to
// the menu's own Drinks shelf (/products/edibles/drinks). Topicals is a live category the old nav never linked.
export const categories = [
  { id: 'flower', name: 'Flower', path: 'products/flower', img: 'cat-flower', blurb: 'Whole flower, ready to grind.' },
  { id: 'pre-rolls', name: 'Pre-Rolls', path: 'products/pre-rolls', img: 'cat-prerolls', blurb: 'Rolled and ready.' },
  { id: 'edibles', name: 'Edibles', path: 'products/edibles', img: 'cat-edibles', blurb: 'Gummies, chews and more.' },
  { id: 'vapes', name: 'Vapes', path: 'products/vaporizers', img: 'cat-vapes', blurb: 'Carts and all-in-ones.' },
  { id: 'concentrates', name: 'Concentrates', path: 'products/concentrates', img: 'cat-concentrates', blurb: 'Rosin, resin and more.' },
  { id: 'tinctures', name: 'Tinctures', path: 'products/tinctures', img: 'cat-tinctures', blurb: 'Measured by the drop.' },
  { id: 'beverages', name: 'Beverages', path: 'products/edibles/drinks', img: 'cat-beverages', blurb: 'Cannabis you can sip.' },
  { id: 'topicals', name: 'Topicals', path: 'products/topicals', img: 'cat-topicals', blurb: 'Balms and lotions.' },
  { id: 'accessories', name: 'Accessories', path: 'products/accessories', img: 'cat-accessories', blurb: 'Grinders, glass and gear.' },
  { id: 'cbd', name: 'CBD', path: 'products/cbd', img: 'cat-cbd', blurb: 'Wellness-first picks.' },
];
// a menu target for a store: 'all' | 'specials' | a category id | 'brands/<slug>'
export function menuUrl(storeId, target = 'all') {
  const s = storeById(storeId);
  if (!target || target === 'all') return `${MENU}/${s.menu}`;
  if (target === 'specials') return `${MENU}/${s.menu}/specials`;
  if (target.startsWith('brands/')) return `${MENU}/${s.menu}/${target}`;
  const c = categories.find((x) => x.id === target);
  return `${MENU}/${s.menu}/${c ? c.path : 'products/' + target}`;
}

// Short phrases the client uses about itself (hero, store pages, FAQ), for the tape marquee.
export const phrases = ['Unifying Upstate', 'Building Community Through Cannabis', 'Where Ya Shopping?', 'Albany', 'Clifton Park', 'Schenectady', 'New York–owned and operated', 'A Different Experience', 'Est. 2022'];

// Primary navigation. Live nav: Shop All, Specials, the categories, Locations (3 stores), Blog, Events, Visit Us; footer
// Company: About, Blog, Contact, Loyalty, Locations, Visit Us. New page types (marked new) follow the adopted IA.
export const nav = {
  shop: {
    label: 'Shop', href: '/shop/',
    groups: [
      { title: 'Shop the menu', links: categories.map((c) => ({ label: c.name, menu: c.id })) },
      { title: 'Ways to shop', links: [
        { label: 'Shop all', menu: 'all' }, { label: 'Specials', menu: 'specials' }, { label: 'Deals by store', href: '/deals/' },
        { label: 'Order ahead and pickup', href: '/pickup/' }, { label: 'Brands we carry', href: '/brands/' },
      ] },
    ],
    card: { img: 'cat-flower', title: 'Fresh on the shelf', text: 'Browse the live menu for your store.', menu: 'flower' },
  },
  stores: {
    label: 'Locations', href: '/location/',
    groups: [
      { title: 'Our dispensaries', links: [{ label: 'All locations', href: '/location/' }, ...stores.map((s) => ({ label: s.name, href: s.page }))] },
      { title: 'Find us', links: [{ label: 'Store locator', href: '/store-locator/' }, { label: 'Areas we serve', href: '/visit-us/' }, { label: 'Order ahead and pickup', href: '/pickup/' }] },
    ],
    card: { img: 'store-mural', title: 'Where ya shopping?', text: 'Three stores across the Capital Region.', href: '/location/' },
  },
  learn: {
    label: 'Learn', href: '/learn/',
    groups: [
      { title: 'Learn', links: [{ label: 'Cannabis 101', href: '/learn/' }, { label: 'Blog', href: '/blog/' }, { label: 'FAQs', href: '/faq/' }, { label: 'Reviews', href: '/reviews/' }] },
      { title: 'Community', links: [{ label: 'Events', href: '/events/' }, { label: 'Loyalty program', href: '/loyalty-program/' }, { label: 'About us', href: '/about/' }, { label: 'Careers', href: '/careers/' }] },
    ],
    card: { img: 'wall-mural', title: 'A different experience', text: 'Guides, events and the culture behind the counter.', href: '/learn/' },
  },
  flat: [
    { label: 'Deals', href: '/deals/' },
    { label: 'Events', href: '/events/' },
    { label: 'Rewards', href: '/loyalty-program/' },
  ],
};

export const footerCols = [
  { title: 'Products', links: [{ label: 'Shop all', menu: 'all' }, { label: 'Specials', menu: 'specials' }, ...categories.map((c) => ({ label: c.name, menu: c.id }))] },
  { title: 'Stores', links: [{ label: 'All locations', href: '/location/' }, ...stores.map((s) => ({ label: s.name, href: s.page })), { label: 'Store locator', href: '/store-locator/' }, { label: 'Areas we serve', href: '/visit-us/' }, { label: 'Order ahead and pickup', href: '/pickup/' }] },
  { title: 'Company', links: [{ label: 'About', href: '/about/' }, { label: 'Blog', href: '/blog/' }, { label: 'Events', href: '/events/' }, { label: 'Loyalty', href: '/loyalty-program/' }, { label: 'Careers', href: '/careers/' }, { label: 'Contact', href: '/contact/' }] },
  { title: 'Help', links: [{ label: 'Cannabis 101', href: '/learn/' }, { label: 'FAQs', href: '/faq/' }, { label: 'Reviews', href: '/reviews/' }, { label: 'Deals', href: '/deals/' }, { label: 'Terms & Conditions', href: '/terms-conditions/' }, { label: 'Site map', href: '/sitemap/' }] },
];
