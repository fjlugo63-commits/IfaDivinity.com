/**
 * consultEngine
 *
 * Orchestrates a full client consult session using the current Awo Portal tab
 * plus Stripe, Supabase, and GitHub/Vercel context from Edge browser tabs.
 */

export interface EdgeTab {
  isCurrent: boolean;
  pageTitle: string;
  pageUrl: string;
  tabId: string | number;
}

export interface ClientIntake {
  clientName: string;
  email?: string;
  phone?: string;
  consultType?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface OduCast {
  oduName: string;
  legs?: string[];
  interpretation?: string;
  prescriptions?: string[];
  [key: string]: unknown;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  [key: string]: unknown;
}

interface PhaseResult {
  status: string;
  data?: unknown;
  gaps: string[];
}

interface ConsultSummary {
  activeTab: {
    title: string | null;
    url: string | null;
    tabId: string | number | null;
  };
  phases: {
    intake: PhaseResult;
    divination: PhaseResult;
    payment: PhaseResult;
    storage: PhaseResult;
    deployment: PhaseResult;
  };
  environment: {
    stripeTabOpen: boolean;
    supabaseTabOpen: boolean;
    githubTabOpen: boolean;
    vercelTabOpen: boolean;
  };
  consultReady: boolean;
  gaps: string[];
}

export function consultEngine(
  edgeAllOpenTabs: EdgeTab[],
  clientIntake: ClientIntake | null,
  oduCast: OduCast | null,
  paymentIntent: PaymentIntent | null
): ConsultSummary {
  // 1. Identify key tabs
  const active = edgeAllOpenTabs.find((t) => t.isCurrent === true);
  const stripeTab = edgeAllOpenTabs.find(
    (t) =>
      t.pageUrl.includes("dashboard.stripe.com") &&
      t.pageUrl.includes("/test/")
  );
  const supabaseTab = edgeAllOpenTabs.find(
    (t) =>
      t.pageUrl.includes("supabase.com/dashboard") &&
      t.pageTitle.includes("Ifa Divinity Marketplace")
  );
  const githubTab = edgeAllOpenTabs.find((t) =>
    t.pageUrl.includes("github.com/fjlugo63-commits/ifadivinity")
  );
  const vercelTab = edgeAllOpenTabs.find((t) =>
    t.pageUrl.includes("vercel.com/ifa-divinity-team")
  );

  // 2. Build consult phases
  const intakePhase: PhaseResult = {
    status: clientIntake ? "complete" : "missing",
    data: clientIntake || null,
    gaps: clientIntake ? [] : ["Client intake form not captured"],
  };

  const divinationPhase: PhaseResult = {
    status: oduCast ? "complete" : "missing",
    data: oduCast || null,
    gaps: oduCast ? [] : ["No Odu / casting data linked to consult"],
  };

  const paymentPhase: PhaseResult = {
    status: paymentIntent
      ? "ready"
      : stripeTab
        ? "stripe-tab-open"
        : "missing",
    data: paymentIntent || null,
    gaps: paymentIntent
      ? []
      : [
          "No consult payment intent created; Stripe test dashboard is " +
            (stripeTab ? "available" : "not open"),
        ],
  };

  const storagePhase: PhaseResult = {
    status: supabaseTab ? "supabase-tab-open" : "missing",
    gaps: supabaseTab
      ? []
      : [
          "No Supabase Products/Consults table context available in current tabs",
        ],
  };

  const deploymentPhase: PhaseResult = {
    status: githubTab && vercelTab ? "pipeline-visible" : "partial",
    gaps: [
      !githubTab && "GitHub repo not visible in current tabs",
      !vercelTab && "Vercel project not visible in current tabs",
    ].filter(Boolean) as string[],
  };

  // 3. Build consult summary + gaps
  const gaps = [
    ...intakePhase.gaps,
    ...divinationPhase.gaps,
    ...paymentPhase.gaps,
    ...storagePhase.gaps,
    ...deploymentPhase.gaps,
  ];

  const summary: ConsultSummary = {
    activeTab: {
      title: active?.pageTitle || null,
      url: active?.pageUrl || null,
      tabId: active?.tabId || null,
    },
    phases: {
      intake: intakePhase,
      divination: divinationPhase,
      payment: paymentPhase,
      storage: storagePhase,
      deployment: deploymentPhase,
    },
    environment: {
      stripeTabOpen: !!stripeTab,
      supabaseTabOpen: !!supabaseTab,
      githubTabOpen: !!githubTab,
      vercelTabOpen: !!vercelTab,
    },
    consultReady:
      intakePhase.status === "complete" &&
      divinationPhase.status === "complete" &&
      paymentPhase.status !== "missing",
    gaps,
  };

  return summary;
}