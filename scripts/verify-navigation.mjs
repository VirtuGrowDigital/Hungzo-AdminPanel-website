/**
 * Navigation / permission sanity check.  npm run verify:nav
 *
 *  1. Every permission referenced in Config/navigation.js exists in the
 *     permission catalogue (a typo would silently hide a menu item forever).
 *  2. Every non-hidden item declares a route.
 *  3. If the backend is checked out next to this repo, prints the resulting
 *     sidebar for each role and fails on drift between the two catalogues.
 *
 * Exit code 1 on any problem, so it can gate CI.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

register(pathToFileURL(new URL("./ext-resolver.mjs", import.meta.url).pathname));

const { NAVIGATION, buildNavigation, ROUTE_PERMISSIONS } = await import(
  "../src/Config/navigation.js"
);
const { ALL_PERMISSIONS, hasPermission } = await import(
  "../src/Config/permissions.js"
);

const problems = [];

/* 1 + 2 — internal consistency */
const walk = (items, sectionTitle) => {
  for (const item of items) {
    if (item.children?.length) {
      walk(item.children, sectionTitle);
      continue;
    }
    if (!item.to && !item.children) {
      problems.push(`${sectionTitle}: "${item.label}" has no route`);
    }
    const required = [].concat(item.permission || []);
    for (const permission of required) {
      if (!ALL_PERMISSIONS.includes(permission)) {
        problems.push(
          `${sectionTitle} > ${item.label}: unknown permission "${permission}"`,
        );
      }
    }
  }
};
NAVIGATION.forEach((section) => walk(section.items, section.title));

/* 3 — compare against the backend catalogue when available */
const backendPath = "../../hungzo-app-backend/config/permissions.js";
const backendFile = new URL(backendPath, import.meta.url).pathname;

if (existsSync(backendFile)) {
  const backend = await import(backendPath);

  const onlyBackend = backend.ALL_PERMISSIONS.filter((p) => !ALL_PERMISSIONS.includes(p));
  const onlyPanel = ALL_PERMISSIONS.filter((p) => !backend.ALL_PERMISSIONS.includes(p));
  if (onlyBackend.length) problems.push(`Missing in panel catalogue: ${onlyBackend.join(", ")}`);
  if (onlyPanel.length) problems.push(`Not known to backend: ${onlyPanel.join(", ")}`);

  console.log("Sidebar per role\n================");
  for (const [role, permissions] of Object.entries(backend.ROLE_PERMISSIONS)) {
    const sections = buildNavigation(permissions, hasPermission);
    console.log(`\n${role}  [${sections.map((s) => s.title).join(", ")}]`);
    for (const section of sections) {
      for (const item of section.items) {
        console.log(
          item.children?.length
            ? `   ${item.label}: ${item.children.map((c) => c.label).join(" | ")}`
            : `   ${item.label}`,
        );
      }
    }
    if (!sections.length) problems.push(`${role} would see an empty sidebar`);
  }

  const unreachable = Object.entries(ROUTE_PERMISSIONS).filter(
    ([, required]) =>
      required.length &&
      !Object.values(backend.ROLE_PERMISSIONS).some((p) => hasPermission(p, required)),
  );
  for (const [route] of unreachable) {
    problems.push(`No role can open ${route}`);
  }
} else {
  console.log(
    "Backend not found next to this repo — skipping the cross-check.\n" +
      "Clone hungzo-app-backend as a sibling folder to verify both catalogues match.",
  );
}

console.log(
  `\n${problems.length ? "PROBLEMS" : "OK"} — ${Object.keys(ROUTE_PERMISSIONS).length} routes, ${ALL_PERMISSIONS.length} permissions`,
);
if (problems.length) {
  problems.forEach((problem) => console.error(`  ✗ ${problem}`));
  process.exit(1);
}
