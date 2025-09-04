document.addEventListener("DOMContentLoaded", () => {
  const nickname = document.getElementById("nickname");
  const proof = document.getElementById("proof");
  const label = document.getElementById("label");
  const addBtn = document.getElementById("add");
  const listEl = document.getElementById("list");
  const clearBtn = document.getElementById("clear");
  const counter = document.getElementById("counter");
  const filterInput = document.getElementById("filter");
  const pageSizeSelect = document.getElementById("pageSize");
  const pagerEl = document.getElementById("pager");
  const MAX = 20;

  let items = [];
  let currentPage = 1;

  function norm(u){ return String(u||"").trim().replace(/^@+/,"").toLowerCase() }

  label.addEventListener("input", () => { counter.textContent = `${label.value.length}/${MAX}` });

  async function loadData(){
    const data = await new Promise(resolve => chrome.storage.local.get({watchData: []}, res => resolve(res.watchData || [])));
    items = data;
    render();
  }

  function saveData(){
    chrome.storage.local.set({watchData: items});
  }

  function showMessage(msg){
    const el = document.createElement("div");
    el.className = "small";
    el.textContent = msg;
    listEl.prepend(el);
    setTimeout(()=> { if(el.parentNode) el.remove(); }, 2200);
  }

  function addItem(n, p, l){
    const nickN = norm(n);
    if(!nickN){ alert("nickname required"); return; }
    if(items.find(x => norm(x.nickname) === nickN)){
      showMessage("A record by nickname already exists");
      return;
    }
    const entry = { nickname: n, proofLink: p||"", labelText: l||"", type:"local" };
    items.push(entry);
    saveData();
    showMessage("Added locally");
    nickname.value = "";
    proof.value = "";
    label.value = "";
    counter.textContent = `0/${MAX}`;
    render();
  }

  function removeItem(idx){
    const it = items[idx];
    if(!it) return;
    if(it.type === "default"){
      it.blacklisted = true;
    } else {
      items.splice(idx, 1);
    }
    saveData();
    render();
  }

  function getFiltered(){
    const q = filterInput.value.trim().toLowerCase();
    if(!q) return items;
    return items.filter(it => it.nickname.toLowerCase().includes(q));
  }

  function render(){
    const pageSize = Number(pageSizeSelect.value || 50);
    const filtered = getFiltered();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if(currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    listEl.innerHTML = "";
    if(pageItems.length === 0){
      listEl.innerHTML = '<div class="empty">No entries</div>';
    } else {
      pageItems.forEach((it, i) => {
        const div = document.createElement("div");
        div.className = "entry";
        const meta = document.createElement("div");
        meta.className = "meta";

        const nick = document.createElement("div");
        nick.className = "nick";
        nick.textContent = it.nickname;

        const proofEl = document.createElement("div");
        proofEl.className = "proof";
        if(it.proofLink){
          const a = document.createElement("a");
          a.href = it.proofLink;
          a.target = "_blank";
          a.textContent = it.proofLink;
          proofEl.appendChild(a);
        } else {
          proofEl.textContent = "(no proof)";
          proofEl.style.color = "#888";
        }

        const labelEl = document.createElement("div");
        labelEl.className = "label";
        labelEl.textContent = it.labelText || "";

        if(it.type === "default") labelEl.textContent += it.blacklisted ? " [removed]" : " [default]";

        meta.appendChild(nick);
        meta.appendChild(proofEl);
        meta.appendChild(labelEl);

        const controls = document.createElement("div");
        controls.className = "controls";

        if(it.type === "local"){
          const edit = document.createElement("button");
          edit.className = "btn-ghost";
          edit.textContent = "Edit";
          edit.addEventListener("click", () => {
            nickname.value = it.nickname;
            proof.value = it.proofLink || "";
            label.value = it.labelText || "";
            counter.textContent = `${label.value.length}/${MAX}`;
            items.splice(items.indexOf(it), 1);
            saveData();
            render();
          });
          controls.appendChild(edit);
        }

        const del = document.createElement("button");
        del.className = "btn-ghost";
        if(it.type === "default" && it.blacklisted){
          del.textContent = "Restore";
          del.addEventListener("click", () => {
            it.blacklisted = false;
            saveData();
            render();
          });
        }else{
          del.textContent = "Delete";
          del.addEventListener("click", () => {
            if(it.type === "default") it.blacklisted = true;
            else items.splice(items.indexOf(it), 1);
            saveData();
            render();
          });
        }
        controls.appendChild(del);

        div.appendChild(meta);
        div.appendChild(controls);

        listEl.appendChild(div);
      });
    }

    pagerEl.innerHTML = "";
    const info = document.createElement("div");
    info.className = "small";
    info.textContent = `Page ${currentPage} / ${totalPages} — ${total} total`;
    pagerEl.appendChild(info);

    const prev = document.createElement("button");
    prev.className = "btn-ghost";
    prev.textContent = "Prev";
    prev.disabled = currentPage <= 1;
    prev.addEventListener("click", () => { currentPage = Math.max(1, currentPage-1); render(); });

    const next = document.createElement("button");
    next.className = "btn-ghost";
    next.textContent = "Next";
    next.disabled = currentPage >= totalPages;
    next.addEventListener("click", () => { currentPage = Math.min(totalPages, currentPage+1); render(); });

    pagerEl.appendChild(prev);
    pagerEl.appendChild(next);
  }

  addBtn.addEventListener("click", () => {
    addItem(nickname.value.trim().replace(/^@+/,""), proof.value.trim(), label.value.trim());
  });

  clearBtn.addEventListener("click", () => {
    if(confirm("Clear all local entries?")){
      items = items.filter(it => it.type === "default");
      saveData();
      render();
    }
  });

  filterInput.addEventListener("input", () => { currentPage=1; render(); });
  pageSizeSelect.addEventListener("change", () => { currentPage=1; render(); });

  loadData();
});

