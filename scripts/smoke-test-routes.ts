async function checkUrl(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { redirect: "manual" });
  const text = await res.text();
  return { status: res.status, text };
}

async function runSmokeTests() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Starting Public Route Smoke Tests against ${baseUrl}...\n`);

  const tests = [
    {
      name: "Landing Page: /",
      path: "/",
      expectedStatus: 200,
      mustContain: ["Bagikan kabar bahagia mu", "AyaWarta", "skip-link"],
    },
    {
      name: "Invitation: rika-fauzi",
      path: "/rika-fauzi",
      expectedStatus: 200,
      mustContain: ["Moch Fauzi Febriana", "Rika Widiarti", "res.cloudinary.com"],
    },
    {
      name: "Invitation: shidqi-mita",
      path: "/shidqi-mita",
      expectedStatus: 200,
      mustContain: ["Shidqi Nurpermadi", "Mita Ali Tifta"],
    },
    {
      name: "Invitation: dudi-aini",
      path: "/dudi-aini",
      expectedStatus: 200,
      mustContain: ["Dudi", "Aini Sri Lutami"],
    },
    {
      name: "Invitation: default-preview",
      path: "/default-preview",
      expectedStatus: 200,
      mustContain: ["Bima Mahendra", "Anisa Putri"],
    },
    {
      name: "Unknown Invitation Slug 404",
      path: "/unknown-couple-never-exists-999",
      expectedStatus: 404,
      mustContain: [],
    },
    {
      name: "Invite Link: rika-fauzi",
      path: "/rika-fauzi/invite",
      expectedStatus: 200,
      mustContain: ["Buat Link Undangan", "Moch Fauzi Febriana", "Rika Widiarti"],
    },
    {
      name: "Invite Link: unknown slug 404",
      path: "/unknown-couple-never-exists-999/invite",
      expectedStatus: 404,
      mustContain: [],
    },
    {
      name: "Template: /wedding/classic-rose/red",
      path: "/wedding/classic-rose/red",
      expectedStatus: 200,
      mustContain: ["Bima Mahendra", "Anisa Putri"],
    },
    {
      name: "Template: /wedding/classic-rose/invalid-variant 404",
      path: "/wedding/classic-rose/neon-purple",
      expectedStatus: 404,
      mustContain: [],
    },
  ];

  let allPassed = true;

  for (const t of tests) {
    const fullUrl = `${baseUrl}${t.path}`;
    try {
      const { status, text } = await checkUrl(fullUrl);
      const statusOk = status === t.expectedStatus;
      const contentOk = t.mustContain.every((sub) => text.includes(sub));

      if (statusOk && contentOk) {
        console.log(`[PASS] ${t.name} -> HTTP ${status} (expected ${t.expectedStatus})`);
      } else {
        allPassed = false;
        console.error(`[FAIL] ${t.name} -> HTTP ${status} (expected ${t.expectedStatus})`);
        if (!contentOk) {
          const missing = t.mustContain.filter((sub) => !text.includes(sub));
          console.error(`       Missing expected strings: ${missing.join(", ")}`);
        }
      }
    } catch (err) {
      allPassed = false;
      console.error(`[FAIL] ${t.name} -> Network / fetch error:`, err);
    }
  }

  if (!allPassed) {
    process.exit(1);
  }

  console.log("\n=== All Public Route Smoke Tests PASSED ===");
}

runSmokeTests().catch((err) => {
  console.error("Fatal error during smoke test:", err);
  process.exit(1);
});
