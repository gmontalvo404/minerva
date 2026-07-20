// Minerva Tab Group
// - Reuses a single Minerva tab (closes duplicates, focuses the live one).
// - Keeps that tab inside a tab group titled "minerva", colored blue,
//   positioned as the first group in its window.

const TARGET_PREFIX = "http://localhost:8123";
const GROUP_TITLE = "minerva";
const GROUP_COLOR = "blue"; // Chrome group colors: grey, blue, red, yellow, green, pink, purple, cyan, orange

let busy = false;

function isMinervaUrl(url) {
  return typeof url === "string" && url.startsWith(TARGET_PREFIX);
}

async function ensureMinervaTab(tab) {
  if (busy || !tab || !isMinervaUrl(tab.url)) {
    return;
  }
  busy = true;
  try {
    // Close any other Minerva tabs (duplicates), keep the one that just loaded.
    const all = await chrome.tabs.query({});
    const duplicates = all.filter((t) => t.id !== tab.id && isMinervaUrl(t.url));
    for (const dup of duplicates) {
      try {
        await chrome.tabs.remove(dup.id);
      } catch (_) {}
    }

    await putInMinervaGroup(tab);

    try {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    } catch (_) {}
  } catch (_) {
    // ignore
  } finally {
    busy = false;
  }
}

async function putInMinervaGroup(tab) {
  // Find an existing "minerva" group in the tab's window.
  const groups = await chrome.tabGroups.query({ title: GROUP_TITLE });
  const sameWindow = groups.find((g) => g.windowId === tab.windowId);

  let groupId;
  if (sameWindow && tab.groupId === sameWindow.id) {
    groupId = sameWindow.id;
  } else if (sameWindow) {
    groupId = await chrome.tabs.group({ tabIds: tab.id, groupId: sameWindow.id });
  } else {
    groupId = await chrome.tabs.group({ tabIds: tab.id });
  }

  await chrome.tabGroups.update(groupId, { title: GROUP_TITLE, color: GROUP_COLOR });

  // Move the group to the front (leftmost, after any pinned tabs).
  try {
    await chrome.tabGroups.move(groupId, { index: 0 });
  } catch (_) {}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.status === "complete" || changeInfo.url) && isMinervaUrl(tab.url)) {
    ensureMinervaTab(tab);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (isMinervaUrl(tab.url)) {
    ensureMinervaTab(tab);
  }
});
