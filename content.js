const GITHUB_URL = "https://raw.githubusercontent.com/nonhash/twitter-scam-eyes-data/refs/heads/main/defaults.json";
const DEFAULT_LABEL_TEXT = "Paid Opinion!";
let watchMap = new Map();

function normUsername(s){ return String(s||"").trim().replace(/^@+/,"").toLowerCase(); }

function injectCSSOnce(){
  if(document.getElementById("scam-style")) return;
  const style = document.createElement("style");
  style.id = "scam-style";
  style.textContent = `
    .scam-label-link{color:red!important;font-weight:bold;margin-left:8px;text-decoration:none!important}
    .scam-label-span{color:red!important;font-weight:bold;margin-left:8px}
    .scam-username-span{color:red!important;font-weight:bold!important;cursor:help}
  `;
  document.head.appendChild(style);
}

function addScamLabel(container, userData){
  if(!container) return;
  if(container.querySelector(".scam-label-link") || container.querySelector(".scam-label-span")) return;
  const labelText = (userData && userData.labelText) || DEFAULT_LABEL_TEXT;
  const href = (userData && userData.proofLink) || "";

  if(href){
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "scam-label-link";
    a.textContent = labelText;
    container.appendChild(a);
  } else {
    const span = document.createElement("span");
    span.className = "scam-label-span";
    span.textContent = labelText;
    container.appendChild(span);
  }
}

function highlightUsernames(root, watchMap){
  const spans = root.querySelectorAll("span");
  for(const sp of spans){
    const text = sp.textContent?.trim();
    if(!text || !text.startsWith("@")) continue;
    const uname = normUsername(text);
    const userData = watchMap.get(uname);
    if(!userData || userData.blacklisted) continue;
    sp.classList.add("scam-username-span");
    const profileBlock = sp.closest('[data-testid="UserName"]');
    if(profileBlock) addScamLabel(profileBlock, userData);
    const hoverBlock = sp.closest('div[data-testid="HoverCard"]');
    if(hoverBlock) addScamLabel(hoverBlock, userData);
  }
}

async function fetchDefaults(){
  try{
    const r = await fetch(GITHUB_URL, {cache:"no-store"});
    if(!r.ok) throw new Error("fetch failed");
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch(e){ console.error(e); return []; }
}

async function updateDefaults(){
  try {
    const defaults = await fetchDefaults();
    const result = await new Promise(resolve => chrome.storage.local.get({watchData: []}, resolve));
    const localData = result.watchData || [];

    const combined = [];

    defaults.forEach(u => {
      if(u && u.nickname){
        const exist = localData.find(x => normUsername(x.nickname) === normUsername(u.nickname));
        combined.push(exist || {...u, type:"default"});
      }
    });

    localData.forEach(u => {
      if(u && u.type==="local") combined.push(u);
    });
    
    chrome.storage.local.set({watchData: combined});

    watchMap.clear();
    combined.forEach(u => watchMap.set(normUsername(u.nickname), u));

    highlightUsernames(document.body, watchMap);
  } catch(e){ console.error("updateDefaults failed:", e); }
}

function init(){
  injectCSSOnce();
  updateDefaults();
  setInterval(updateDefaults, 5*60*1000);

  const obs = new MutationObserver((mutations) => {
    for(const m of mutations){
      for(const n of m.addedNodes){
        if(n.nodeType===1) highlightUsernames(n, watchMap);
      }
    }
  });
  obs.observe(document.body, { childList:true, subtree:true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if(area==="local" && changes.watchData){
      watchMap.clear();
      changes.watchData.newValue.forEach(u => watchMap.set(normUsername(u.nickname), u));
      highlightUsernames(document.body, watchMap);
    }
  });
}

init();
