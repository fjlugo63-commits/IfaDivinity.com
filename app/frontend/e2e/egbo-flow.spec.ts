import { test, expect } from "@playwright/test";

/**
 * Egbo Service E2E Test
 *
 * This test validates the complete Egbo service flow:
 * 1. Seeds a verified Egbo seller
 * 2. Creates an Egbo listing
 * 3. Buyer selects a slot and completes Stripe test payment (4242...)
 * 4. Simulates webhook delivery
 * 5. Asserts orders.status='paid' and bookings.status='scheduled'
 *
 * Prerequisites:
 * - Supabase project running (local or staging)
 * - STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET configured
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY available as env vars
 *
 * Run: npx playwright test e2e/egbo-flow.spec.ts
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Helper: Make authenticated Supabase request using service key
async function supabaseAdmin(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// Helper: Create a test user via Supabase Auth Admin API
async function createTestUser(email: string, password: string, role: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Test ${role}`, role },
    }),
  });
  return res.json();
}

// Helper: Sign in and get access token
async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.access_token;
}

// Helper: Simulate Stripe webhook event
async function simulateStripeWebhook(orderId: string, serviceType: string, bookingId: string) {
  // In a real CI environment, use Stripe CLI: stripe trigger checkout.session.completed
  // For this test, we call the webhook endpoint directly with a mock event
  // Note: This requires STRIPE_WEBHOOK_SECRET to be set for signature validation
  // In staging, use: stripe listen --forward-to <url>/functions/v1/app_egbo_webhook

  const Stripe = await import("stripe").then((m) => m.default);
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  // Create a real payment intent for testing
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 15000, // $150.00
    currency: "usd",
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: {
      order_id: orderId,
      service_type: serviceType,
      booking_id: bookingId,
    },
  });

  // Construct webhook event payload
  const event = {
    id: `evt_test_${Date.now()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        payment_intent: paymentIntent.id,
        metadata: {
          order_id: orderId,
          service_type: serviceType,
          booking_id: bookingId,
        },
      },
    },
  };

  // Sign the payload
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const crypto = await import("crypto");
  const signature = crypto
    .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const stripeSignature = `t=${timestamp},v1=${signature}`;

  // Call webhook endpoint
  const webhookRes = await fetch(`${SUPABASE_URL}/functions/v1/app_egbo_webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": stripeSignature,
    },
    body: payload,
  });

  return webhookRes.json();
}

test.describe("Egbo Service Flow", () => {
  const sellerEmail = `seller-${Date.now()}@test.ifamarket.com`;
  const buyerEmail = `buyer-${Date.now()}@test.ifamarket.com`;
  const password = "TestPassword123!";
  let sellerId: string;
  let buyerId: string;
  let productId: string;
  let orderId: string;
  let bookingId: string;

  test.beforeAll(async () => {
    test.skip(!SUPABASE_URL || !SUPABASE_SERVICE_KEY, "Supabase not configured");
    test.skip(!STRIPE_SECRET_KEY, "Stripe not configured");
  });

  test("1. Seed verified Egbo seller", async () => {
    // Create seller user
    const sellerData = await createTestUser(sellerEmail, password, "seller");
    expect(sellerData.id).toBeTruthy();
    sellerId = sellerData.id;

    // Set seller profile with verified_egbo = true
    await supabaseAdmin("app_340b9f1944_profiles?id=eq." + sellerId, {
      method: "PATCH",
      body: JSON.stringify({
        role: "seller",
        verified_egbo: true,
        full_name: "Baba Ifatunde",
        bio: "Verified Egbo practitioner with 20 years experience",
      }),
    });

    // Verify the profile was updated
    const profiles = await supabaseAdmin(
      `app_340b9f1944_profiles?id=eq.${sellerId}&select=*`
    );
    expect(profiles[0].verified_egbo).toBe(true);
    expect(profiles[0].role).toBe("seller");
  });

  test("2. Create Egbo listing", async () => {
    // Create an Egbo service product
    const products = await supabaseAdmin("app_340b9f1944_products", {
      method: "POST",
      body: JSON.stringify({
        seller_id: sellerId,
        title: "E2E Test Egbo Healing Session",
        slug: `e2e-egbo-session-${Date.now()}`,
        description: "Complete Egbo healing ritual with herbal preparation",
        price: 150.0,
        service_type: "egbo",
        duration_minutes: 90,
        is_active: true,
        is_digital: true,
        stock_quantity: null,
      }),
    });

    expect(products[0].id).toBeTruthy();
    productId = products[0].id;
    expect(products[0].service_type).toBe("egbo");
    expect(products[0].duration_minutes).toBe(90);
  });

  test("3. Buyer selects slot and initiates checkout", async () => {
    // Create buyer user
    const buyerData = await createTestUser(buyerEmail, password, "buyer");
    expect(buyerData.id).toBeTruthy();
    buyerId = buyerData.id;

    // Update buyer profile
    await supabaseAdmin("app_340b9f1944_profiles?id=eq." + buyerId, {
      method: "PATCH",
      body: JSON.stringify({ role: "buyer", full_name: "Test Buyer" }),
    });

    // Sign in as buyer to get token
    const token = await signIn(buyerEmail, password);
    expect(token).toBeTruthy();

    // Call checkout endpoint
    const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const checkoutRes = await fetch(
      `${SUPABASE_URL}/functions/v1/app_egbo_checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [
            {
              product_id: productId,
              seller_id: sellerId,
              title: "E2E Test Egbo Healing Session",
              price: 150.0,
              quantity: 1,
              service_type: "egbo",
            },
          ],
          booking_selection: {
            practitioner_id: sellerId,
            product_id: productId,
            scheduled_at: scheduledAt,
            duration_minutes: 90,
            price: 150.0,
          },
        }),
      }
    );

    const checkoutData = await checkoutRes.json();
    expect(checkoutRes.status).toBe(200);
    expect(checkoutData.sessionId).toBeTruthy();
    expect(checkoutData.orderId).toBeTruthy();

    orderId = checkoutData.orderId;
    bookingId = checkoutData.bookingId || "";

    // Verify order was created with status='pending'
    const orders = await supabaseAdmin(
      `app_340b9f1944_orders?id=eq.${orderId}&select=*`
    );
    expect(orders[0].status).toBe("pending");

    // Verify booking was created with status='pending_reservation'
    if (bookingId) {
      const bookings = await supabaseAdmin(
        `app_340b9f1944_bookings?id=eq.${bookingId}&select=*`
      );
      expect(bookings[0].status).toBe("pending_reservation");
      expect(bookings[0].product_id).toBe(productId);
    }
  });

  test("4. Simulate Stripe webhook (payment completed)", async () => {
    test.skip(!STRIPE_WEBHOOK_SECRET, "Webhook secret not configured");

    const webhookResult = await simulateStripeWebhook(
      orderId,
      "egbo",
      bookingId
    );
    expect(webhookResult.received).toBe(true);
  });

  test("5. Assert order paid and booking scheduled", async () => {
    // Give webhook a moment to process
    await new Promise((r) => setTimeout(r, 2000));

    // Check order status = 'paid'
    const orders = await supabaseAdmin(
      `app_340b9f1944_orders?id=eq.${orderId}&select=*`
    );
    expect(orders[0].status).toBe("paid");
    expect(orders[0].stripe_payment_intent_id).toBeTruthy();

    // Check booking status = 'scheduled'
    if (bookingId) {
      const bookings = await supabaseAdmin(
        `app_340b9f1944_bookings?id=eq.${bookingId}&select=*`
      );
      expect(bookings[0].status).toBe("scheduled");
      expect(bookings[0].meeting_url).toContain("meet.jit.si");
    } else {
      // If no booking_id from checkout, one should have been created by webhook
      const bookings = await supabaseAdmin(
        `app_340b9f1944_bookings?client_id=eq.${buyerId}&service_type=eq.egbo&select=*`
      );
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].status).toBe("scheduled");
    }
  });

  test("6. UI: Buyer can see booking in dashboard", async ({ page }) => {
    // Navigate to app and sign in
    await page.goto(`${APP_URL}/auth`);

    // Fill in login form
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Sign In")');

    // Wait for redirect
    await page.waitForURL("**/", { timeout: 10000 }).catch(() => {});

    // Navigate to orders page
    await page.goto(`${APP_URL}/orders`);
    await page.waitForTimeout(2000);

    // Should see the order
    const orderText = await page.textContent("body");
    expect(orderText).toContain("paid");
  });

  test.afterAll(async () => {
    // Cleanup: delete test data
    if (productId) {
      await supabaseAdmin(`app_340b9f1944_products?id=eq.${productId}`, {
        method: "DELETE",
      });
    }
    if (orderId) {
      await supabaseAdmin(`app_340b9f1944_order_items?order_id=eq.${orderId}`, {
        method: "DELETE",
      });
      await supabaseAdmin(`app_340b9f1944_orders?id=eq.${orderId}`, {
        method: "DELETE",
      });
    }
    if (bookingId) {
      await supabaseAdmin(`app_340b9f1944_bookings?id=eq.${bookingId}`, {
        method: "DELETE",
      });
    }
    // Note: Test users are not deleted to avoid auth admin API complexity
    // In CI, use a fresh Supabase instance per run
  });
});